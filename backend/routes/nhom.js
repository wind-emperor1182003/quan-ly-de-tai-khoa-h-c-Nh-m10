const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware kiểm tra token và vai trò sinh viên
const authenticateSinhVien = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'sinh_vien') {
      return res.status(403).json({ message: 'Chỉ sinh viên được phép truy cập' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Hàm hỗ trợ lấy ma_khoa của sinh viên
const getMaKhoa = async (ma_so, transaction) => {
  const result = await transaction.request()
    .input('ma_so', sql.VarChar(20), ma_so)
    .query('SELECT ma_khoa FROM SinhVien WHERE ma_so = @ma_so');
  return result.recordset[0]?.ma_khoa;
};

// 1. Tạo nhóm
router.post('/create', authenticateSinhVien, async (req, res) => {
  const { ten_nhom } = req.body;
  const ma_so = req.user.ma_so;

  if (!ten_nhom) {
    console.log('Thiếu tên nhóm:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp tên nhóm' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu tạo nhóm:', { ten_nhom, ma_so });

    // Kiểm tra sinh viên đã có nhóm chưa
    const checkNhom = await transaction.request()
      .input('ma_so', sql.VarChar(20), ma_so)
      .query('SELECT * FROM ThanhVienNhom WHERE ma_so_sinh_vien = @ma_so');
    if (checkNhom.recordset.length > 0) {
      await transaction.rollback();
      console.log('Sinh viên đã có nhóm:', { ma_so });
      return res.status(400).json({ message: 'Bạn đã tham gia một nhóm' });
    }

    // Kiểm tra trùng tên nhóm
    const checkTenNhom = await transaction.request()
      .input('ten_nhom', sql.NVarChar(50), ten_nhom)
      .query('SELECT * FROM NhomSinhVien WHERE ten_nhom = @ten_nhom');
    if (checkTenNhom.recordset.length > 0) {
      await transaction.rollback();
      console.log('Tên nhóm đã tồn tại:', { ten_nhom });
      return res.status(400).json({ message: 'Tên nhóm đã tồn tại, vui lòng chọn tên khác' });
    }

    // Tạo mã nhóm
    const result = await transaction.request().query(`
      SELECT 'NHOM' + RIGHT('000' + CAST((ISNULL(MAX(CAST(RIGHT(ma_nhom, 3) AS INT)), 0) + 1) AS VARCHAR(3)), 3)
      FROM NhomSinhVien
    `);
    const ma_nhom = result.recordset[0][''];
    console.log('Tạo mã nhóm:', { ma_nhom });

    // Tạo nhóm
    const insertNhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ten_nhom', sql.NVarChar(50), ten_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so)
      .input('ngay_tao', sql.Date, new Date())
      .input('trang_thai_nhom', sql.VarChar(20), 'dang_tao')
      .query(`
        INSERT INTO NhomSinhVien (ma_nhom, ten_nhom, ma_so_nhom_truong, ngay_tao, trang_thai_nhom)
        VALUES (@ma_nhom, @ten_nhom, @ma_so_nhom_truong, @ngay_tao, @trang_thai_nhom)
      `);
    if (insertNhom.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm nhóm vào NhomSinhVien');
    }

    // Thêm nhóm trưởng vào ThanhVienNhom
    const insertThanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so)
      .input('ngay_tham_gia', sql.Date, new Date())
      .input('chuc_vu', sql.NVarChar(50), 'Trưởng nhóm')
      .query(`
        INSERT INTO ThanhVienNhom (ma_nhom, ma_so_sinh_vien, ngay_tham_gia, chuc_vu)
        VALUES (@ma_nhom, @ma_so_sinh_vien, @ngay_tham_gia, @chuc_vu)
      `);
    if (insertThanhVien.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm nhóm trưởng vào ThanhVienNhom');
    }

    // Trả về thông tin nhóm
    const nhomResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT n.ma_nhom, n.ten_nhom, n.ma_so_nhom_truong, n.ngay_tao, n.trang_thai_nhom,
               COUNT(t.ma_so_sinh_vien) as so_luong_thanh_vien,
               5 as so_luong_sinh_vien_toi_da
        FROM NhomSinhVien n
        LEFT JOIN ThanhVienNhom t ON n.ma_nhom = t.ma_nhom
        WHERE n.ma_nhom = @ma_nhom
        GROUP BY n.ma_nhom, n.ten_nhom, n.ma_so_nhom_truong, n.ngay_tao, n.trang_thai_nhom
      `);
    const thanhVienResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT t.ma_so_sinh_vien as ma_so, nd.ho_ten, nd.sdt, t.chuc_vu
        FROM ThanhVienNhom t
        JOIN NguoiDung nd ON t.ma_so_sinh_vien = nd.ma_so
        WHERE t.ma_nhom = @ma_nhom
      `);
    const nhom = nhomResult.recordset[0];
    nhom.thanh_vien = thanhVienResult.recordset;

    await transaction.commit();
    console.log('Tạo nhóm thành công:', { ma_nhom });
    res.status(201).json(nhom);
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi tạo nhóm:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ten_nhom, ma_so }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 2. Lấy danh sách sinh viên chưa có nhóm (chỉ cùng khoa)
router.get('/sinhvien/chua-co-nhom', authenticateSinhVien, async (req, res) => {
  const ma_so = req.user.ma_so;
  try {
    const pool = await poolPromise;
    // Lấy ma_khoa của sinh viên đăng nhập
    const khoaResult = await pool.request()
      .input('ma_so', sql.VarChar(20), ma_so)
      .query('SELECT ma_khoa FROM SinhVien WHERE ma_so = @ma_so');
    if (khoaResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin khoa của sinh viên' });
    }
    const ma_khoa = khoaResult.recordset[0].ma_khoa;

    // Lấy danh sách sinh viên chưa có nhóm và cùng khoa
    const result = await pool.request()
      .input('ma_khoa', sql.VarChar(20), ma_khoa)
      .query(`
       SELECT s.ma_so, nd.ho_ten, nd.email, nd.sdt, s.ma_khoa
        FROM SinhVien s
        JOIN NguoiDung nd ON s.ma_so = nd.ma_so
        WHERE s.ma_khoa = @ma_khoa
          AND s.ma_so NOT IN (SELECT ma_so_sinh_vien FROM ThanhVienNhom)
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách sinh viên:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 3. Gửi lời mời vào nhóm (chỉ cùng khoa)
router.post('/moi', authenticateSinhVien, async (req, res) => {
  const { ma_nhom, ma_so_sinh_vien } = req.body;
  const ma_so_nhom_truong = req.user.ma_so;

  if (!ma_nhom || !ma_so_sinh_vien) {
    console.log('Thiếu dữ liệu:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã nhóm và mã sinh viên' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu gửi lời mời:', { ma_nhom, ma_so_sinh_vien, ma_so_nhom_truong });

    // Kiểm tra nhóm trưởng
    const nhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong');
    if (nhom.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Bạn không phải nhóm trưởng của nhóm này' });
    }

    // Kiểm tra sinh viên đã có nhóm chưa
    const checkNhom = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query('SELECT * FROM ThanhVienNhom WHERE ma_so_sinh_vien = @ma_so_sinh_vien');
    if (checkNhom.recordset.length > 0) {
      await transaction.rollback();
      console.log('Sinh viên đã có nhóm:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Sinh viên đã có nhóm' });
    }

    // Kiểm tra cùng khoa
    const ma_khoa_nhom_truong = await getMaKhoa(ma_so_nhom_truong, transaction);
    const ma_khoa_sinh_vien = await getMaKhoa(ma_so_sinh_vien, transaction);
    if (ma_khoa_nhom_truong !== ma_khoa_sinh_vien) {
      await transaction.rollback();
      console.log('Sinh viên không cùng khoa:', { ma_so_sinh_vien, ma_khoa_nhom_truong, ma_khoa_sinh_vien });
      return res.status(400).json({ message: 'Sinh viên không thuộc cùng khoa' });
    }

    // Kiểm tra nhóm đầy
    const thanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query('SELECT COUNT(*) as count FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
    const so_luong_hien_tai = thanhVien.recordset[0].count;
    const so_luong_toi_da = 5;
    if (so_luong_hien_tai >= so_luong_toi_da) {
      await transaction.rollback();
      console.log('Nhóm đã đầy:', { ma_nhom, so_luong_hien_tai });
      return res.status(400).json({ message: 'Nhóm đã đầy' });
    }

    // Kiểm tra lời mời đã tồn tại
    const existingInvite = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM LoiMoiNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien AND trang_thai_loi_moi = 'cho_xac_nhan'
      `);
    if (existingInvite.recordset.length > 0) {
      await transaction.rollback();
      console.log('Lời mời đã tồn tại:', { ma_nhom, ma_so_sinh_vien });
      return res.status(400).json({ message: 'Lời mời đã được gửi trước đó' });
    }

    // Gửi lời mời
    const loiMoiResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('ngay_gui', sql.Date, new Date())
      .input('trang_thai_loi_moi', sql.VarChar(20), 'cho_xac_nhan')
      .query(`
        INSERT INTO LoiMoiNhom (ma_nhom, ma_so_sinh_vien, ngay_gui, trang_thai_loi_moi)
        OUTPUT INSERTED.ma_loi_moi
        VALUES (@ma_nhom, @ma_so_sinh_vien, @ngay_gui, @trang_thai_loi_moi)
      `);
    if (loiMoiResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm lời mời vào LoiMoiNhom');
    }
    const ma_loi_moi = loiMoiResult.recordset[0].ma_loi_moi;

    // Gửi thông báo
    const noi_dung = `Bạn nhận được lời mời vào nhóm ${ma_nhom} từ nhóm trưởng ${ma_so_nhom_truong} (ma_loi_moi: ${ma_loi_moi})`.substring(0, 200);
    const thongBao = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('noi_dung', sql.NVarChar(200), noi_dung)
      .input('ngay_gui', sql.DateTime, new Date())
      .input('trang_thai', sql.VarChar(20), 'chua_xem')
      .query(`
        INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
        OUTPUT INSERTED.ma_thong_bao
        VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
      `);
    if (thongBao.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm thông báo vào ThongBao');
    }

    await transaction.commit();
    console.log('Gửi lời mời thành công:', { ma_nhom, ma_so_sinh_vien, ma_loi_moi });
    res.json({ message: 'Gửi lời mời thành công', ma_loi_moi });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi gửi lời mời:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_sinh_vien, ma_so_nhom_truong }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 4. Gửi lời xin vào nhóm (chỉ cùng khoa)
router.post('/xin-vao-nhom', authenticateSinhVien, async (req, res) => {
  const { ma_nhom } = req.body;
  const ma_so_sinh_vien = req.user.ma_so;

  if (!ma_nhom) {
    console.log('Thiếu mã nhóm:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã nhóm' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu xử lý xin vào nhóm:', { ma_nhom, ma_so_sinh_vien });

    // Kiểm tra sinh viên đã có nhóm
    const checkNhom = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query('SELECT * FROM ThanhVienNhom WHERE ma_so_sinh_vien = @ma_so_sinh_vien');
    if (checkNhom.recordset.length > 0) {
      await transaction.rollback();
      console.log('Sinh viên đã có nhóm:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Bạn đã tham gia một nhóm' });
    }

    // Kiểm tra nhóm tồn tại và trạng thái
    const nhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND trang_thai_nhom = \'dang_tao\'');
    if (nhom.recordset.length === 0) {
      await transaction.rollback();
      console.log('Nhóm không tồn tại hoặc đã đóng:', { ma_nhom });
      return res.status(400).json({ message: 'Nhóm không tồn tại hoặc đã đóng' });
    }

    // Kiểm tra cùng khoa
    const ma_khoa_sinh_vien = await getMaKhoa(ma_so_sinh_vien, transaction);
    const ma_khoa_nhom_truong = await getMaKhoa(nhom.recordset[0].ma_so_nhom_truong, transaction);
    if (ma_khoa_sinh_vien !== ma_khoa_nhom_truong) {
      await transaction.rollback();
      console.log('Nhóm không cùng khoa:', { ma_nhom, ma_khoa_sinh_vien, ma_khoa_nhom_truong });
      return res.status(400).json({ message: 'Nhóm không thuộc cùng khoa với bạn' });
    }

    // Kiểm tra nhóm đầy
    const thanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query('SELECT COUNT(*) as count FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
    const so_luong_hien_tai = thanhVien.recordset[0].count;
    const so_luong_toi_da = 5;
    if (so_luong_hien_tai >= so_luong_toi_da) {
      await transaction.rollback();
      console.log('Nhóm đã đầy:', { ma_nhom, so_luong_hien_tai });
      return res.status(400).json({ message: 'Nhóm đã đầy' });
    }

    // Kiểm tra lời xin đã tồn tại
    const existingXin = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM LoiXinNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien AND trang_thai = 'cho_duyet'
      `);
    if (existingXin.recordset.length > 0) {
      await transaction.rollback();
      console.log('Lời xin đã tồn tại:', { ma_nhom, ma_so_sinh_vien });
      return res.status(400).json({ message: 'Yêu cầu xin vào nhóm đã được gửi trước đó' });
    }

    // Gửi lời xin
    console.log('Dữ liệu trước INSERT LoiXinNhom:', { ma_nhom, ma_so_sinh_vien, trang_thai: 'cho_duyet', ngay_xin: new Date() });
    const loiXinResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('trang_thai', sql.VarChar(20), 'cho_duyet')
      .input('ngay_xin', sql.DateTime, new Date())
      .query(`
        INSERT INTO LoiXinNhom (ma_nhom, ma_so_sinh_vien, trang_thai, ngay_xin)
        OUTPUT INSERTED.ma_loi_xin
        VALUES (@ma_nhom, @ma_so_sinh_vien, @trang_thai, @ngay_xin)
      `);
    console.log('Kết quả INSERT LoiXinNhom:', loiXinResult);

    if (loiXinResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm bản ghi vào LoiXinNhom');
    }

    const ma_loi_xin = loiXinResult.recordset[0]?.ma_loi_xin;
    if (!ma_loi_xin) {
      await transaction.rollback();
      throw new Error('Không lấy được ma_loi_xin từ LoiXinNhom');
    }

    // Gửi thông báo cho nhóm trưởng
    const nhomTruong = nhom.recordset[0].ma_so_nhom_truong;
    const noi_dung = `Sinh viên ${ma_so_sinh_vien} gửi yêu cầu xin vào nhóm ${ma_nhom} (ma_loi_xin: ${ma_loi_xin})`.substring(0, 200);
    console.log('Dữ liệu trước INSERT ThongBao:', { ma_so_sinh_vien: nhomTruong, noi_dung, ngay_gui: new Date(), trang_thai: 'chua_xem' });
    const thongBaoResult = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), nhomTruong)
      .input('noi_dung', sql.NVarChar(200), noi_dung)
      .input('ngay_gui', sql.DateTime, new Date())
      .input('trang_thai', sql.VarChar(20), 'chua_xem')
      .query(`
        INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
        OUTPUT INSERTED.ma_thong_bao
        VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
      `);
    console.log('Kết quả INSERT ThongBao:', thongBaoResult);

    if (thongBaoResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm bản ghi vào ThongBao');
    }

    await transaction.commit();
    console.log('Gửi lời xin thành công:', { ma_nhom, ma_so_sinh_vien, ma_loi_xin });
    res.json({ message: 'Gửi yêu cầu xin vào nhóm thành công', ma_loi_xin });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi gửi yêu cầu xin vào nhóm:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_sinh_vien }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 5. Duyệt lời xin vào nhóm (kiểm tra cùng khoa)
router.post('/duyet-loi-xin', authenticateSinhVien, async (req, res) => {
  const { ma_loi_xin } = req.body;
  const ma_so_nhom_truong = req.user.ma_so;

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu duyệt lời xin:', { ma_loi_xin, ma_so_nhom_truong });

    // Kiểm tra lời xin
    const loiXin = await transaction.request()
      .input('ma_loi_xin', sql.Int, ma_loi_xin)
      .query('SELECT * FROM LoiXinNhom WHERE ma_loi_xin = @ma_loi_xin AND trang_thai = \'cho_duyet\'');
    if (loiXin.recordset.length === 0) {
      await transaction.rollback();
      console.log('Lời xin không tồn tại hoặc đã xử lý:', { ma_loi_xin });
      return res.status(400).json({ message: 'Lời xin không tồn tại hoặc đã được xử lý' });
    }

    const { ma_nhom, ma_so_sinh_vien } = loiXin.recordset[0];

    // Kiểm tra người dùng là nhóm trưởng
    const nhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong');
    if (nhom.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Bạn không phải nhóm trưởng của nhóm này' });
    }

    // Kiểm tra cùng khoa
    const ma_khoa_nhom_truong = await getMaKhoa(ma_so_nhom_truong, transaction);
    const ma_khoa_sinh_vien = await getMaKhoa(ma_so_sinh_vien, transaction);
    if (ma_khoa_nhom_truong !== ma_khoa_sinh_vien) {
      await transaction.rollback();
      console.log('Sinh viên không cùng khoa:', { ma_so_sinh_vien, ma_khoa_nhom_truong, ma_khoa_sinh_vien });
      return res.status(400).json({ message: 'Sinh viên không thuộc cùng khoa' });
    }

    // Kiểm tra nhóm đầy
    const thanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query('SELECT COUNT(*) as count FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
    const so_luong_hien_tai = thanhVien.recordset[0].count;
    const so_luong_toi_da = 5;
    if (so_luong_hien_tai >= so_luong_toi_da) {
      await transaction.rollback();
      console.log('Nhóm đã đầy:', { ma_nhom, so_luong_hien_tai });
      return res.status(400).json({ message: 'Nhóm đã đầy' });
    }

    // Thêm thành viên vào nhóm
    const insertThanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('ngay_tham_gia', sql.Date, new Date())
      .input('chuc_vu', sql.NVarChar(50), 'Thành viên')
      .query(`
        INSERT INTO ThanhVienNhom (ma_nhom, ma_so_sinh_vien, ngay_tham_gia, chuc_vu)
        VALUES (@ma_nhom, @ma_so_sinh_vien, @ngay_tham_gia, @chuc_vu)
      `);
    if (insertThanhVien.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm thành viên vào ThanhVienNhom');
    }

    // Cập nhật trạng thái lời xin
    const updateLoiXin = await transaction.request()
      .input('ma_loi_xin', sql.Int, ma_loi_xin)
      .query('UPDATE LoiXinNhom SET trang_thai = \'duyet\' WHERE ma_loi_xin = @ma_loi_xin');
    if (updateLoiXin.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái LoiXinNhom');
    }

    // Cập nhật trạng thái nhóm
    const soLuongResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query('SELECT COUNT(*) as so_luong_thanh_vien FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
    const so_luong_thanh_vien = soLuongResult.recordset[0].so_luong_thanh_vien;
    const trang_thai_nhom = so_luong_thanh_vien >= so_luong_toi_da ? 'hop_le' : 'dang_tao';

    const updateNhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('trang_thai_nhom', sql.VarChar(20), trang_thai_nhom)
      .query('UPDATE NhomSinhVien SET trang_thai_nhom = @trang_thai_nhom WHERE ma_nhom = @ma_nhom');
    if (updateNhom.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái NhomSinhVien');
    }

    // Gửi thông báo
    const thongBao = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('noi_dung', sql.NVarChar(200), `Yêu cầu xin vào nhóm ${ma_nhom} của bạn đã được duyệt`.substring(0, 200))
      .input('ngay_gui', sql.DateTime, new Date())
      .input('trang_thai', sql.VarChar(20), 'chua_xem')
      .query(`
        INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
        OUTPUT INSERTED.ma_thong_bao
        VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
      `);
    if (thongBao.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm thông báo vào ThongBao');
    }

    await transaction.commit();
    console.log('Duyệt lời xin thành công:', { ma_loi_xin });
    res.status(200).json({ message: 'Duyệt lời xin thành công' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi duyệt lời xin:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_loi_xin, ma_so_nhom_truong }
    });
    res.status(500).json({ message: 'Lỗi server khi duyệt lời xin', details: err.message });
  }
});

// 6. Lấy danh sách lời xin vào nhóm
router.get('/loi-xin', authenticateSinhVien, async (req, res) => {
  const ma_nhom = req.query.ma_nhom;
  const ma_so_nhom_truong = req.user.ma_so;

  try {
    const pool = await poolPromise;

    // Kiểm tra người dùng là nhóm trưởng
    const nhom = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong');
    if (nhom.recordset.length === 0) {
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Bạn không phải nhóm trưởng của nhóm này' });
    }

    // Lấy danh sách lời xin
    const result = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT lx.ma_loi_xin, lx.ma_so_sinh_vien, nd.ho_ten, nd.email, nd.sdt, lx.trang_thai, lx.ngay_xin
        FROM LoiXinNhom lx
        JOIN NguoiDung nd ON lx.ma_so_sinh_vien = nd.ma_so
        WHERE lx.ma_nhom = @ma_nhom AND lx.trang_thai = 'cho_duyet'
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách lời xin:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_nhom_truong }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 7. Từ chối lời xin vào nhóm
router.post('/tu-choi-loi-xin', authenticateSinhVien, async (req, res) => {
  const { ma_loi_xin } = req.body;
  const ma_so_nhom_truong = req.user.ma_so;

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu từ chối lời xin:', { ma_loi_xin, ma_so_nhom_truong });

    // Kiểm tra lời xin
    const loiXin = await transaction.request()
      .input('ma_loi_xin', sql.Int, ma_loi_xin)
      .query('SELECT * FROM LoiXinNhom WHERE ma_loi_xin = @ma_loi_xin AND trang_thai = \'cho_duyet\'');
    if (loiXin.recordset.length === 0) {
      await transaction.rollback();
      console.log('Lời xin không tồn tại hoặc đã xử lý:', { ma_loi_xin });
      return res.status(400).json({ message: 'Lời xin không tồn tại hoặc đã được xử lý' });
    }

    const { ma_nhom, ma_so_sinh_vien } = loiXin.recordset[0];

    // Kiểm tra người dùng là nhóm trưởng
    const nhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong');
    if (nhom.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Bạn không phải nhóm trưởng của nhóm này' });
    }

    // Cập nhật trạng thái lời xin
    const updateLoiXin = await transaction.request()
      .input('ma_loi_xin', sql.Int, ma_loi_xin)
      .query('UPDATE LoiXinNhom SET trang_thai = \'tu_choi\' WHERE ma_loi_xin = @ma_loi_xin');
    if (updateLoiXin.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái LoiXinNhom');
    }

    // Gửi thông báo
    const thongBao = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('noi_dung', sql.NVarChar(200), `Yêu cầu xin vào nhóm ${ma_nhom} của bạn đã bị từ chối`.substring(0, 200))
      .input('ngay_gui', sql.DateTime, new Date())
      .input('trang_thai', sql.VarChar(20), 'chua_xem')
      .query(`
        INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
        OUTPUT INSERTED.ma_thong_bao
        VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
      `);
    if (thongBao.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm thông báo vào ThongBao');
    }

    await transaction.commit();
    console.log('Từ chối lời xin thành công:', { ma_loi_xin });
    res.json({ message: 'Từ chối lời xin thành công' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi từ chối lời xin:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_loi_xin, ma_so_nhom_truong }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 8. Xác nhận/từ chối lời mời (kiểm tra cùng khoa)
router.post('/loi-moi/xac-nhan', authenticateSinhVien, async (req, res) => {
  const { ma_loi_moi, trang_thai_loi_moi } = req.body;
  const ma_so = req.user.ma_so;

  if (!ma_loi_moi || !['dong_y', 'tu_choi'].includes(trang_thai_loi_moi)) {
    console.log('Dữ liệu không hợp lệ:', { body: req.body });
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu xử lý lời mời:', { ma_loi_moi, trang_thai_loi_moi, ma_so });

    // Kiểm tra lời mời
    const loiMoi = await transaction.request()
      .input('ma_loi_moi', sql.Int, ma_loi_moi)
      .query('SELECT * FROM LoiMoiNhom WHERE ma_loi_moi = @ma_loi_moi AND trang_thai_loi_moi = \'cho_xac_nhan\'');
    if (loiMoi.recordset.length === 0) {
      await transaction.rollback();
      console.log('Lời mời không tồn tại hoặc đã xử lý:', { ma_loi_moi });
      return res.status(400).json({ message: 'Lời mời không tồn tại hoặc đã được xử lý' });
    }

    const { ma_nhom, ma_so_sinh_vien } = loiMoi.recordset[0];

    // Kiểm tra quyền xử lý lời mời
    const nhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so)
      .query('SELECT * FROM NhomSinhVien WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong');
    const isNhomTruong = nhom.recordset.length > 0;

    if (!isNhomTruong && ma_so !== ma_so_sinh_vien) {
      await transaction.rollback();
      console.log('Không có quyền xử lý:', { ma_so, ma_so_sinh_vien });
      return res.status(403).json({ message: 'Bạn không có quyền xử lý lời mời này' });
    }

    // Kiểm tra cùng khoa
    const ma_khoa_sinh_vien = await getMaKhoa(ma_so_sinh_vien, transaction);
    const ma_khoa_nhom_truong = await getMaKhoa(nhom.recordset[0]?.ma_so_nhom_truong || ma_so, transaction);
    if (ma_khoa_sinh_vien !== ma_khoa_nhom_truong) {
      await transaction.rollback();
      console.log('Sinh viên không cùng khoa:', { ma_so_sinh_vien, ma_khoa_sinh_vien, ma_khoa_nhom_truong });
      return res.status(400).json({ message: 'Sinh viên không thuộc cùng khoa với nhóm' });
    }

    // Cập nhật trạng thái lời mời
    const updateLoiMoi = await transaction.request()
      .input('ma_loi_moi', sql.Int, ma_loi_moi)
      .input('trang_thai_loi_moi', sql.VarChar(20), trang_thai_loi_moi)
      .query('UPDATE LoiMoiNhom SET trang_thai_loi_moi = @trang_thai_loi_moi WHERE ma_loi_moi = @ma_loi_moi');
    if (updateLoiMoi.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái LoiMoiNhom');
    }

    if (trang_thai_loi_moi === 'dong_y') {
      // Kiểm tra sinh viên đã có nhóm chưa
      const checkNhom = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
        .query('SELECT * FROM ThanhVienNhom WHERE ma_so_sinh_vien = @ma_so_sinh_vien');
      if (checkNhom.recordset.length > 0) {
        await transaction.rollback();
        console.log('Sinh viên đã có nhóm:', { ma_so_sinh_vien });
        return res.status(400).json({ message: 'Sinh viên đã tham gia một nhóm khác' });
      }

      // Kiểm tra nhóm đầy
      const thanhVien = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .query('SELECT COUNT(*) as count FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
      const so_luong_hien_tai = thanhVien.recordset[0].count;
      const so_luong_toi_da = 5;
      if (so_luong_hien_tai >= so_luong_toi_da) {
        await transaction.rollback();
        console.log('Nhóm đã đầy:', { ma_nhom, so_luong_hien_tai });
        return res.status(400).json({ message: 'Nhóm đã đầy' });
      }

      // Thêm thành viên vào nhóm
      const insertThanhVien = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
        .input('ngay_tham_gia', sql.Date, new Date())
        .input('chuc_vu', sql.NVarChar(50), 'Thành viên')
        .query(`
          INSERT INTO ThanhVienNhom (ma_nhom, ma_so_sinh_vien, ngay_tham_gia, chuc_vu)
          VALUES (@ma_nhom, @ma_so_sinh_vien, @ngay_tham_gia, @chuc_vu)
        `);
      if (insertThanhVien.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thành viên vào ThanhVienNhom');
      }

      // Cập nhật trạng thái nhóm
      const soLuongResult = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .query('SELECT COUNT(*) as so_luong_thanh_vien FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom');
      const so_luong_thanh_vien = soLuongResult.recordset[0].so_luong_thanh_vien;
      const trang_thai_nhom = so_luong_thanh_vien >= so_luong_toi_da ? 'hop_le' : 'dang_tao';

      const updateNhom = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .input('trang_thai_nhom', sql.VarChar(20), trang_thai_nhom)
        .query('UPDATE NhomSinhVien SET trang_thai_nhom = @trang_thai_nhom WHERE ma_nhom = @ma_nhom');
      if (updateNhom.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể cập nhật trạng thái NhomSinhVien');
      }

      // Gửi thông báo
      const thongBao = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Bạn đã được chấp nhận vào nhóm ${ma_nhom}`.substring(0, 200))
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar(20), 'chua_xem')
        .query(`
          INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
          OUTPUT INSERTED.ma_thong_bao
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
        `);
      if (thongBao.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thông báo vào ThongBao');
      }
    } else if (trang_thai_loi_moi === 'tu_choi') {
      // Gửi thông báo
      const thongBao = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Yêu cầu tham gia nhóm ${ma_nhom} đã bị từ chối`.substring(0, 200))
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar(20), 'chua_xem')
        .query(`
          INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
          OUTPUT INSERTED.ma_thong_bao
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
        `);
      if (thongBao.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thông báo vào ThongBao');
      }
    }

    await transaction.commit();
    console.log('Xác nhận lời mời thành công:', { ma_loi_moi, trang_thai_loi_moi });
    res.json({ message: `Xác nhận lời mời ${trang_thai_loi_moi} thành công` });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi xác nhận lời mời:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_loi_moi, trang_thai_loi_moi, ma_so }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 9. Lấy danh sách nhóm (chỉ cùng khoa)
router.get('/danh-sach', authenticateSinhVien, async (req, res) => {
  const ma_so = req.user.ma_so;
  try {
    const pool = await poolPromise;
    // Lấy ma_khoa của sinh viên đăng nhập
    const khoaResult = await pool.request()
      .input('ma_so', sql.VarChar(20), ma_so)
      .query('SELECT ma_khoa FROM SinhVien WHERE ma_so = @ma_so');
    if (khoaResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin khoa của sinh viên' });
    }
    const ma_khoa = khoaResult.recordset[0].ma_khoa;

    // Lấy danh sách nhóm có nhóm trưởng cùng khoa
    const result = await pool.request()
      .input('ma_khoa', sql.VarChar(20), ma_khoa)
      .query(`
        SELECT n.ma_nhom, n.ten_nhom, ISNULL(nd.ho_ten, 'Không xác định') AS ten_nhom_truong, n.ngay_tao, n.trang_thai_nhom,
               COUNT(t.ma_so_sinh_vien) AS so_luong_thanh_vien,
               5 AS so_luong_sinh_vien_toi_da
        FROM NhomSinhVien n
        LEFT JOIN ThanhVienNhom t ON n.ma_nhom = t.ma_nhom
        LEFT JOIN NguoiDung nd ON n.ma_so_nhom_truong = nd.ma_so
        JOIN SinhVien sv ON n.ma_so_nhom_truong = sv.ma_so
        WHERE n.trang_thai_nhom = 'dang_tao' AND sv.ma_khoa = @ma_khoa
        GROUP BY n.ma_nhom, n.ten_nhom, nd.ho_ten, n.ngay_tao, n.trang_thai_nhom
      `);
    console.log('Dữ liệu từ API /danh-sach:', result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách nhóm:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 10. Lấy thông tin nhóm của sinh viên
router.get('/thanh-vien', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT 
            n.ma_nhom, 
            n.ten_nhom, 
            n.ma_so_nhom_truong, 
            n.trang_thai_nhom,
            (SELECT COUNT(*) FROM ThanhVienNhom tv WHERE tv.ma_nhom = n.ma_nhom) AS so_luong_thanh_vien,
            5 AS so_luong_sinh_vien_toi_da,
            (SELECT ho_ten FROM NguoiDung WHERE ma_so = n.ma_so_nhom_truong) AS ten_nhom_truong,
            (
              SELECT tv.ma_so_sinh_vien AS ma_so, nd.ho_ten, nd.sdt
              FROM ThanhVienNhom tv
              JOIN SinhVien sv ON tv.ma_so_sinh_vien = sv.ma_so
              JOIN NguoiDung nd ON tv.ma_so_sinh_vien = nd.ma_so
              WHERE tv.ma_nhom = n.ma_nhom
              FOR JSON PATH
            ) AS thanh_vien
        FROM NhomSinhVien n
        JOIN ThanhVienNhom t ON n.ma_nhom = t.ma_nhom
        WHERE t.ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (result.recordset.length === 0) {
      return res.json(null); // Sinh viên chưa có nhóm
    }
    const nhom = result.recordset[0];
    nhom.thanh_vien = nhom.thanh_vien ? JSON.parse(nhom.thanh_vien) : [];
    console.log('Dữ liệu từ API /nhom/thanh-vien:', nhom);
    res.json(nhom);
  } catch (err) {
    console.error('Lỗi lấy thông tin nhóm:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 11. Lấy danh sách lời mời của sinh viên
router.get('/loi-moi', authenticateSinhVien, async (req, res) => {
  const ma_so = req.user.ma_so;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT ma_loi_moi, ma_nhom, ma_so_sinh_vien, ngay_gui, trang_thai_loi_moi
        FROM LoiMoiNhom
        WHERE ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách lời mời:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_so }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 12. Lấy danh sách thông báo
router.get('/thong-bao', authenticateSinhVien, async (req, res) => {
  const ma_so = req.user.ma_so;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT ma_thong_bao, ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai
        FROM ThongBao
        WHERE ma_so_sinh_vien = @ma_so_sinh_vien
        ORDER BY ngay_gui DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách thông báo:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_so }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 13. Đánh dấu thông báo đã xem
router.post('/thong-bao/xem', authenticateSinhVien, async (req, res) => {
  const { ma_thong_bao } = req.body;
  const ma_so = req.user.ma_so;

  if (!ma_thong_bao) {
    console.log('Thiếu mã thông báo:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã thông báo' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_thong_bao', sql.Int, ma_thong_bao)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so)
      .query(`
        UPDATE ThongBao
        SET trang_thai = 'da_xem'
        WHERE ma_thong_bao = @ma_thong_bao AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (result.rowsAffected[0] === 0) {
      console.log('Thông báo không tồn tại hoặc không thuộc về sinh viên:', { ma_thong_bao, ma_so });
      return res.status(404).json({ message: 'Thông báo không tồn tại hoặc không thuộc về bạn' });
    }
    res.json({ message: 'Đánh dấu thông báo đã xem' });
  } catch (err) {
    console.error('Lỗi đánh dấu thông báo:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_thong_bao, ma_so }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 14. Rời nhóm
router.post('/roi-nhom', authenticateSinhVien, async (req, res) => {
  const { ma_nhom } = req.body;
  const ma_so_sinh_vien = req.user.ma_so;

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu rời nhóm:', { ma_nhom, ma_so_sinh_vien });

    // Kiểm tra sinh viên có trong nhóm
    const memberResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (memberResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải thành viên:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Bạn không phải thành viên của nhóm này' });
    }

    // Kiểm tra sinh viên có phải nhóm trưởng
    const nhomResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong
      `);
    const isNhomTruong = nhomResult.recordset.length > 0;

    // Xóa sinh viên khỏi nhóm
    const deleteThanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        DELETE FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (deleteThanhVien.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể xóa thành viên khỏi ThanhVienNhom');
    }

    // Kiểm tra số thành viên còn lại
    const soLuongResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT COUNT(*) as so_luong_thanh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);

    if (soLuongResult.recordset.length === 0 || soLuongResult.recordset[0].so_luong_thanh_vien === 0) {
      // Không còn thành viên, giải tán nhóm
      const deleteNhom = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .query(`
          DELETE FROM NhomSinhVien
          WHERE ma_nhom = @ma_nhom
        `);
      if (deleteNhom.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể xóa nhóm khỏi NhomSinhVien');
      }
      await transaction.commit();
      console.log('Nhóm đã giải tán:', { ma_nhom });
      return res.json({ message: 'Nhóm đã giải tán' });
    }

    // Cập nhật trạng thái nhóm
    const so_luong_thanh_vien = soLuongResult.recordset[0].so_luong_thanh_vien;
    const so_luong_toi_da = 5;
    const trang_thai_nhom = so_luong_thanh_vien >= so_luong_toi_da ? 'hop_le' : 'dang_tao';

    const updateNhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('trang_thai_nhom', sql.VarChar(20), trang_thai_nhom)
      .query(`
        UPDATE NhomSinhVien
        SET trang_thai_nhom = @trang_thai_nhom
        WHERE ma_nhom = @ma_nhom
      `);
    if (updateNhom.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái NhomSinhVien');
    }

    if (isNhomTruong) {
      // Chọn nhóm trưởng mới (kiểm tra cùng khoa)
      const newLeaderResult = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .input('ma_khoa', sql.VarChar(20), await getMaKhoa(ma_so_sinh_vien, transaction))
        .query(`
          SELECT TOP 1 tv.ma_so_sinh_vien
          FROM ThanhVienNhom tv
          JOIN SinhVien sv ON tv.ma_so_sinh_vien = sv.ma_so
          WHERE tv.ma_nhom = @ma_nhom AND sv.ma_khoa = @ma_khoa
          ORDER BY tv.ma_so_sinh_vien
        `);
      if (newLeaderResult.recordset.length > 0) {
        const newLeader = newLeaderResult.recordset[0].ma_so_sinh_vien;
        const updateLeader = await transaction.request()
          .input('ma_nhom', sql.NVarChar(20), ma_nhom)
          .input('ma_so_nhom_truong', sql.VarChar(20), newLeader)
          .input('chuc_vu', sql.NVarChar(50), 'Trưởng nhóm')
          .query(`
            UPDATE NhomSinhVien
            SET ma_so_nhom_truong = @ma_so_nhom_truong
            WHERE ma_nhom = @ma_nhom;
            UPDATE ThanhVienNhom
            SET chuc_vu = @chuc_vu
            WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_nhom_truong
          `);
        if (updateLeader.rowsAffected[0] === 0) {
          await transaction.rollback();
          throw new Error('Không thể cập nhật nhóm trưởng mới');
        }
      }
    }

    // Tạo thông báo cho các thành viên còn lại
    const membersResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);
    for (const member of membersResult.recordset) {
      const thongBao = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), member.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Sinh viên ${ma_so_sinh_vien} đã rời nhóm ${ma_nhom}`.substring(0, 200))
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar(20), 'chua_xem')
        .query(`
          INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
          OUTPUT INSERTED.ma_thong_bao
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
        `);
      if (thongBao.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thông báo vào ThongBao');
      }
    }

    await transaction.commit();
    console.log('Rời nhóm thành công:', { ma_nhom, ma_so_sinh_vien });
    res.json({ message: 'Rời nhóm thành công' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi rời nhóm:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_sinh_vien }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 15. Xóa thành viên (chỉ nhóm trưởng)
router.post('/xoa-thanh-vien', authenticateSinhVien, async (req, res) => {
  const { ma_nhom, ma_so_sinh_vien } = req.body;
  const ma_so_nhom_truong = req.user.ma_so;

  if (!ma_nhom || !ma_so_sinh_vien) {
    console.log('Thiếu dữ liệu:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã nhóm và mã sinh viên' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu xóa thành viên:', { ma_nhom, ma_so_sinh_vien, ma_so_nhom_truong });

    // Kiểm tra người dùng là nhóm trưởng
    const nhomResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query(`
        SELECT * FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong
      `);
    if (nhomResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Chỉ nhóm trưởng được phép xóa thành viên' });
    }

    // Kiểm tra thành viên có trong nhóm
    const memberResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (memberResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Thành viên không có trong nhóm:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Thành viên không có trong nhóm' });
    }

    // Không cho phép xóa chính nhóm trưởng
    if (ma_so_sinh_vien === ma_so_nhom_truong) {
      await transaction.rollback();
      console.log('Không thể xóa nhóm trưởng:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Không thể xóa nhóm trưởng' });
    }

    // Xóa thành viên
    const deleteThanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        DELETE FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (deleteThanhVien.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể xóa thành viên khỏi ThanhVienNhom');
    }

    // Kiểm tra số thành viên còn lại
    const soLuongResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT COUNT(*) as so_luong_thanh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);

    if (soLuongResult.recordset.length === 0 || soLuongResult.recordset[0].so_luong_thanh_vien === 0) {
      // Không còn thành viên, giải tán nhóm
      const deleteNhom = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .query(`
          DELETE FROM NhomSinhVien
          WHERE ma_nhom = @ma_nhom
        `);
      if (deleteNhom.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể xóa nhóm khỏi NhomSinhVien');
      }
      await transaction.commit();
      console.log('Nhóm đã giải tán:', { ma_nhom });
      return res.json({ message: 'Nhóm đã giải tán' });
    }

    // Cập nhật trạng thái nhóm
    const so_luong_thanh_vien = soLuongResult.recordset[0].so_luong_thanh_vien;
    const so_luong_toi_da = 5;
    const trang_thai_nhom = so_luong_thanh_vien >= so_luong_toi_da ? 'hop_le' : 'dang_tao';

    const updateNhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('trang_thai_nhom', sql.VarChar(20), trang_thai_nhom)
      .query(`
        UPDATE NhomSinhVien
        SET trang_thai_nhom = @trang_thai_nhom
        WHERE ma_nhom = @ma_nhom
      `);
    if (updateNhom.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái NhomSinhVien');
    }

    // Tạo thông báo cho các thành viên còn lại
    const membersResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);
    for (const member of membersResult.recordset) {
      const thongBao = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), member.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Sinh viên ${ma_so_sinh_vien} đã rời nhóm ${ma_nhom}`.substring(0, 200))
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar(20), 'chua_xem')
        .query(`
          INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
          OUTPUT INSERTED.ma_thong_bao
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
        `);
      if (thongBao.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thông báo vào ThongBao');
      }
    }

    await transaction.commit();
    console.log('Rời nhóm thành công:', { ma_nhom, ma_so_sinh_vien });
    res.json({ message: 'Rời nhóm thành công' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi rời nhóm:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_sinh_vien }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 15. Xóa thành viên (chỉ nhóm trưởng)
router.post('/xoa-thanh-vien', authenticateSinhVien, async (req, res) => {
  const { ma_nhom, ma_so_sinh_vien } = req.body;
  const ma_so_nhom_truong = req.user.ma_so;

  if (!ma_nhom || !ma_so_sinh_vien) {
    console.log('Thiếu dữ liệu:', { body: req.body });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã nhóm và mã sinh viên' });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu xóa thành viên:', { ma_nhom, ma_so_sinh_vien, ma_so_nhom_truong });

    // Kiểm tra người dùng là nhóm trưởng
    const nhomResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_nhom_truong', sql.VarChar(20), ma_so_nhom_truong)
      .query(`
        SELECT * FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom AND ma_so_nhom_truong = @ma_so_nhom_truong
      `);
    if (nhomResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Không phải nhóm trưởng:', { ma_so_nhom_truong });
      return res.status(403).json({ message: 'Chỉ nhóm trưởng được phép xóa thành viên' });
    }

    // Kiểm tra thành viên có trong nhóm
    const memberResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT * FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (memberResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Thành viên không có trong nhóm:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Thành viên không có trong nhóm' });
    }

    // Không cho phép xóa chính nhóm trưởng
    if (ma_so_sinh_vien === ma_so_nhom_truong) {
      await transaction.rollback();
      console.log('Không thể xóa nhóm trưởng:', { ma_so_sinh_vien });
      return res.status(400).json({ message: 'Không thể xóa nhóm trưởng' });
    }

    // Xóa thành viên
    const deleteThanhVien = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        DELETE FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (deleteThanhVien.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể xóa thành viên khỏi ThanhVienNhom');
    }

    // Kiểm tra số thành viên còn lại
    const soLuongResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT COUNT(*) as so_luong_thanh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);

    if (soLuongResult.recordset.length === 0 || soLuongResult.recordset[0].so_luong_thanh_vien === 0) {
      // Không còn thành viên, giải tán nhóm
      const deleteNhom = await transaction.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .query(`
          DELETE FROM NhomSinhVien
          WHERE ma_nhom = @ma_nhom
        `);
      if (deleteNhom.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể xóa nhóm khỏi NhomSinhVien');
      }
      await transaction.commit();
      console.log('Nhóm đã giải tán:', { ma_nhom });
      return res.json({ message: 'Nhóm đã giải tán' });
    }

    // Cập nhật trạng thái nhóm
    const so_luong_thanh_vien = soLuongResult.recordset[0].so_luong_thanh_vien;
    const so_luong_toi_da = 5;
    const trang_thai_nhom = so_luong_thanh_vien >= so_luong_toi_da ? 'hop_le' : 'dang_tao';

    const updateNhom = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('trang_thai_nhom', sql.VarChar(20), trang_thai_nhom)
      .query(`
        UPDATE NhomSinhVien
        SET trang_thai_nhom = @trang_thai_nhom
        WHERE ma_nhom = @ma_nhom
      `);
    if (updateNhom.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể cập nhật trạng thái NhomSinhVien');
    }

    // Tạo thông báo cho các thành viên còn lại
    const membersResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien
        FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom
      `);
    for (const member of membersResult.recordset) {
      const thongBao = await transaction.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), member.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Thành viên ${ma_so_sinh_vien} đã bị xóa khỏi nhóm ${ma_nhom}`.substring(0, 200))
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar(20), 'chua_xem')
        .query(`
          INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
          OUTPUT INSERTED.ma_thong_bao
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
        `);
      if (thongBao.rowsAffected[0] === 0) {
        await transaction.rollback();
        throw new Error('Không thể thêm thông báo vào ThongBao');
      }
    }

    // Tạo thông báo cho thành viên bị xóa
    const thongBaoXoa = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('noi_dung', sql.NVarChar(200), `Bạn đã bị xóa khỏi nhóm ${ma_nhom}`.substring(0, 200))
      .input('ngay_gui', sql.DateTime, new Date())
      .input('trang_thai', sql.VarChar(20), 'chua_xem')
      .query(`
        INSERT INTO ThongBao (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai)
        OUTPUT INSERTED.ma_thong_bao
        VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, @trang_thai)
      `);
    if (thongBaoXoa.rowsAffected[0] === 0) {
      await transaction.rollback();
      throw new Error('Không thể thêm thông báo vào ThongBao');
    }

    await transaction.commit();
    console.log('Xóa thành viên thành công:', { ma_nhom, ma_so_sinh_vien });
    res.json({ message: 'Xóa thành viên thành công' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi xóa thành viên:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom, ma_so_sinh_vien, ma_so_nhom_truong }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 16. Lấy danh sách thành viên của nhóm
router.get('/thanh-vien/:ma_nhom', authenticateSinhVien, async (req, res) => {
  const { ma_nhom } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT t.ma_so_sinh_vien as ma_so, nd.ho_ten, nd.sdt, t.chuc_vu
        FROM ThanhVienNhom t
        JOIN NguoiDung nd ON t.ma_so_sinh_vien = nd.ma_so
        WHERE t.ma_nhom = @ma_nhom
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách thành viên:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_nhom }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// 17. Lấy thông tin đề tài của nhóm mà sinh viên thuộc về
router.get('/detai/thong-tin', authenticateSinhVien, async (req, res) => {
  const { ma_so } = req.user;

  try {
    const pool = await poolPromise;
    console.log(`Kết nối database thành công, lấy đề tài cho sinh viên ${ma_so}`);

    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT dt.ma_de_tai, dt.ten_de_tai, dt.mo_ta, dt.ma_nhom, dt.ngay_tao AS ngay_dang_ky,
               dt.trang_thai, n.ten_nhom, dt.ma_so_giang_vien, gv.ho_ten AS ten_giang_vien, gv.sdt
        FROM [dbo].[DeTai] dt
        JOIN [dbo].[NhomSinhVien] n ON dt.ma_nhom = n.ma_nhom
        JOIN [dbo].[ThanhVienNhom] tv ON n.ma_nhom = tv.ma_nhom
        LEFT JOIN [dbo].[NguoiDung] gv ON dt.ma_so_giang_vien = gv.ma_so
        WHERE tv.ma_so_sinh_vien = @ma_so_sinh_vien
      `);

    console.log(`Danh sách đề tài cho sinh viên ${ma_so}:`, result.recordset);

    if (result.recordset.length === 0) {
      console.warn(`Không tìm thấy đề tài cho sinh viên ${ma_so}`);
      return res.status(200).json({ de_tai: [], message: 'Nhóm chưa đăng ký đề tài' });
    }

    res.json({ de_tai: result.recordset });
  } catch (err) {
    console.error(`Lỗi lấy thông tin đề tài cho sinh viên ${ma_so}:`, {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
    });
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin đề tài',
      details: err.message,
    });
  }
});
// 18.Lấy danh sách báo cáo tiến độ của nhóm mà sinh viên thuộc về
router.get('/bao-cao-tien-do', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT 
          bc.ma_bao_cao, 
          bc.ma_de_tai, 
          bc.ma_nhom, 
          bc.ky_bao_cao, 
          bc.han_nop, 
          bc.nhan_xet_sinh_vien, 
          bc.ma_so_sinh_vien, 
          bc.ngay_nop, 
          bc.trang_thai, 
          bc.diem_tien_do, 
          bc.nhan_xet, 
          bc.tep_dinh_kem, 
          bc.ngay_danh_gia, 
          bc.tre_han, 
          bc.so_lan_chinh_sua,
          n.ten_nhom,
          dt.ten_de_tai,
          nd.ho_ten AS ten_sinh_vien
        FROM BaoCaoTienDo bc
        JOIN NhomSinhVien n ON bc.ma_nhom = n.ma_nhom
        JOIN DeTai dt ON bc.ma_de_tai = dt.ma_de_tai
        JOIN ThanhVienNhom tv ON n.ma_nhom = tv.ma_nhom
        LEFT JOIN NguoiDung nd ON bc.ma_so_sinh_vien = nd.ma_so
        WHERE tv.ma_so_sinh_vien = @ma_so_sinh_vien
        ORDER BY bc.ky_bao_cao ASC, bc.ngay_nop DESC
      `);

    console.log(`Danh sách báo cáo tiến độ cho sinh viên ${ma_so_sinh_vien}:`, result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error(`Lỗi lấy danh sách báo cáo tiến độ cho sinh viên ${ma_so_sinh_vien}:`, {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
    });
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách báo cáo tiến độ',
      details: err.message,
    });
  }
});

// 19. Lấy điểm bảo vệ của nhóm
router.get('/diem-bao-ve', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('Bắt đầu lấy điểm bảo vệ:', { ma_so_sinh_vien });

    // Lấy ma_nhom của sinh viên
    const nhomResult = await transaction.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT ma_nhom
        FROM ThanhVienNhom
        WHERE ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (nhomResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Sinh viên chưa có nhóm:', { ma_so_sinh_vien });
      return res.status(404).json({ message: 'Bạn chưa thuộc nhóm nào' });
    }
    const ma_nhom = nhomResult.recordset[0].ma_nhom;

    // Lấy ma_de_tai từ ma_nhom
    const deTaiResult = await transaction.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_de_tai
        FROM DeTai
        WHERE ma_nhom = @ma_nhom
      `);
    if (deTaiResult.recordset.length === 0) {
      await transaction.rollback();
      console.log('Nhóm chưa có đề tài:', { ma_nhom });
      return res.status(404).json({ message: 'Nhóm chưa đăng ký đề tài' });
    }
    const ma_de_tai = deTaiResult.recordset[0].ma_de_tai;

    // Lấy điểm bảo vệ từ ChamBaoVe
    const scoresResult = await transaction.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT cb.diem_bao_ve, cb.nhan_xet, nd.ho_ten AS ten_giang_vien, cb.ngay_cham
        FROM ChamBaoVe cb
        JOIN NguoiDung nd ON cb.ma_so_giang_vien = nd.ma_so
        WHERE cb.ma_de_tai = @ma_de_tai
      `);
    const scores = scoresResult.recordset;

    if (scores.length === 0) {
      await transaction.commit();
      console.log('Chưa có điểm bảo vệ:', { ma_de_tai });
      return res.status(200).json({ message: 'Chưa có điểm bảo vệ', diem_bao_ve: null, nhan_xet: null, scores: [] });
    }

    // Tính điểm trung bình
    const diemTrungBinh = scores.reduce((sum, score) => sum + score.diem_bao_ve, 0) / scores.length;
    const nhan_xet = scores[0].nhan_xet || 'Không có nhận xét';

    await transaction.commit();
    console.log('Lấy điểm bảo vệ thành công:', { ma_de_tai, diem_bao_ve: diemTrungBinh });
    res.status(200).json({
      diem_bao_ve: diemTrungBinh.toFixed(2),
      nhan_xet,
      scores
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi lấy điểm bảo vệ:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
      input: { ma_so_sinh_vien }
    });
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});


module.exports = router;