// routes/admin/QLdiemrouter.js
const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware xác thực token (chỉ cho quan_ly)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'quan_ly') {
      return res.status(403).json({ message: 'Chỉ quản lý được phép truy cập' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
};

// GET /api/nhom/valid: Lấy danh sách nhóm hợp lệ
router.get('/nhom/valid', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ns.ma_nhom, ns.ten_nhom
      FROM NhomSinhVien ns
      WHERE ns.trang_thai_nhom = 'hop_le'
        AND NOT EXISTS (
          SELECT 1 FROM DeTai dt WHERE dt.ma_nhom = ns.ma_nhom
        )
      ORDER BY ns.ma_nhom
    `);
    res.json({ nhom: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy danh sách nhóm hợp lệ:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhóm', details: err.message });
  }
});

// GET /api/giangvien/approved/:ma_nhom: Lấy giảng viên đã được phê duyệt của nhóm
router.get('/giangvien/approved/:ma_nhom', authenticateToken, async (req, res) => {
  const { ma_nhom } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT dkgv.ma_so_giang_vien, nd.ho_ten
        FROM DangKyGiangVien dkgv
        INNER JOIN NguoiDung nd ON dkgv.ma_so_giang_vien = nd.ma_so
        WHERE dkgv.ma_nhom = @ma_nhom 
          AND dkgv.trang_thai_dang_ky = 'da_duyet'
          AND nd.vai_tro = 'giang_vien'
      `);
    if (result.recordset.length > 0) {
      res.json({ giangVien: result.recordset[0] });
    } else {
      res.json({ giangVien: null });
    }
  } catch (err) {
    console.error('Lỗi lấy giảng viên:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy giảng viên', details: err.message });
  }
});

// POST /api/de-tai: Thêm đề tài mới
router.post('/de-tai', authenticateToken, async (req, res) => {
  const { ten_detai, mo_ta, ma_nhom, ma_so_giang_vien, trang_thai, so_luong_sinh_vien_toi_da } = req.body;
  console.log(`POST /de-tai: data = ${JSON.stringify(req.body)}`);

  if (!ten_detai || !ma_nhom || !ma_so_giang_vien || !so_luong_sinh_vien_toi_da) {
    return res.status(400).json({ message: 'Thiếu tên đề tài, mã nhóm, mã giảng viên hoặc số lượng sinh viên tối đa' });
  }
  if (isNaN(so_luong_sinh_vien_toi_da) || so_luong_sinh_vien_toi_da < 1) {
    return res.status(400).json({ message: 'Số lượng sinh viên tối đa phải là số nguyên dương' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra nhóm hợp lệ
    const checkNhom = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_nhom, trang_thai_nhom
        FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom AND trang_thai_nhom = 'hop_le'
      `);
    if (checkNhom.recordset.length === 0) {
      return res.status(400).json({ message: 'Nhóm không tồn tại hoặc không hợp lệ' });
    }

    // Kiểm tra đăng ký giảng viên được phê duyệt
    const checkDangKy = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_dang_ky_gv
        FROM DangKyGiangVien
        WHERE ma_nhom = @ma_nhom 
          AND ma_so_giang_vien = @ma_so_giang_vien 
          AND trang_thai_dang_ky = 'da_duyet'
      `);
    if (checkDangKy.recordset.length === 0) {
      return res.status(400).json({ message: 'Nhóm chưa đăng ký giảng viên này hoặc đăng ký chưa được phê duyệt' });
    }

    // Kiểm tra giảng viên
    const checkGiangVien = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_so
        FROM NguoiDung
        WHERE ma_so = @ma_so_giang_vien AND vai_tro = 'giang_vien'
      `);
    if (checkGiangVien.recordset.length === 0) {
      return res.status(400).json({ message: 'Mã giảng viên không hợp lệ' });
    }

    // Kiểm tra nhóm đã có đề  đề tài
    const checkDeTai = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_de_tai
        FROM DeTai
        WHERE ma_nhom = @ma_nhom
      `);
    if (checkDeTai.recordset.length > 0) {
      return res.status(400).json({ message: 'Nhóm đã có đề tài, không thể thêm mới' });
    }

    // Tạo mã đề tài
    const ma_de_tai = `DT${Date.now()}`;

    // Thêm đề tài
    const result = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('ten_de_tai', sql.NVarChar, ten_detai)
      .input('mo_ta', sql.NVarChar, mo_ta || null)
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('trang_thai', sql.NVarChar, trang_thai || 'cho_duyet')
      .input('ngay_tao', sql.Date, new Date())
      .input('so_luong_sinh_vien_toi_da', sql.Int, so_luong_sinh_vien_toi_da)
      .query(`
        INSERT INTO DeTai (ma_de_tai, ten_de_tai, mo_ta, ma_nhom, ma_so_giang_vien, trang_thai, ngay_tao, so_luong_sinh_vien_toi_da)
        VALUES (@ma_de_tai, @ten_de_tai, @mo_ta, @ma_nhom, @ma_so_giang_vien, @trang_thai, @ngay_tao, @so_luong_sinh_vien_toi_da)
      `);

    res.json({ message: 'Thêm đề tài thành công', ma_de_tai });
  } catch (err) {
    console.error('Lỗi thêm đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm đề tài', details: err.message });
  }
});

// GET /api/de-tai: Lấy danh sách đề tài
router.get('/de-tai', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
          dt.ma_de_tai, 
          dt.ten_de_tai, 
          dt.mo_ta, 
          dt.ma_nhom, 
          ns.ten_nhom, 
          dt.ma_so_giang_vien, 
          nd.ho_ten AS ho_ten_giang_vien, 
          dt.trang_thai,
          dt.so_luong_sinh_vien_toi_da
        FROM DeTai dt
        LEFT JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
        LEFT JOIN NguoiDung nd ON dt.ma_so_giang_vien = nd.ma_so
        WHERE dt.ten_de_tai LIKE @search OR dt.ma_de_tai LIKE @search
        ORDER BY dt.ma_de_tai
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM DeTai dt
        WHERE dt.ten_de_tai LIKE @search OR dt.ma_de_tai LIKE @search
      `);
    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ deTai: result.recordset, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài', details: err.message });
  }
});

// PUT /api/de-tai/:ma_de_tai: Cập nhật đề tài
router.put('/de-tai/:ma_de_tai', authenticateToken, async (req, res) => {
  const { ma_de_tai } = req.params;
  const { ten_detai, mo_ta, ma_nhom, ma_so_giang_vien, trang_thai, so_luong_sinh_vien_toi_da } = req.body;
  console.log(`PUT /de-tai: ma_de_tai = ${ma_de_tai}, data = ${JSON.stringify(req.body)}`);

  if (!ten_detai || !ma_nhom || !ma_so_giang_vien || !so_luong_sinh_vien_toi_da) {
    return res.status(400).json({ message: 'Thiếu tên đề tài, mã nhóm, mã giảng viên hoặc số lượng sinh viên tối đa' });
  }
  if (isNaN(so_luong_sinh_vien_toi_da) || so_luong_sinh_vien_toi_da < 1) {
    return res.status(400).json({ message: 'Số lượng sinh viên tối đa phải là số nguyên dương' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra ma_de_tai
    const checkDeTai = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`SELECT ma_de_tai FROM DeTai WHERE ma_de_tai = @ma_de_tai`);
    if (checkDeTai.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Kiểm tra nhóm hợp lệ
    const checkNhom = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_nhom, trang_thai_nhom
        FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom AND trang_thai_nhom = 'hop_le'
      `);
    if (checkNhom.recordset.length === 0) {
      return res.status(400).json({ message: 'Nhóm không tồn tại hoặc không hợp lệ' });
    }

    // Kiểm tra đăng ký giảng viên được phê duyệt
    const checkDangKy = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_dang_ky_gv
        FROM DangKyGiangVien
        WHERE ma_nhom = @ma_nhom 
          AND ma_so_giang_vien = @ma_so_giang_vien 
          AND trang_thai_dang_ky = 'da_duyet'
      `);
    if (checkDangKy.recordset.length === 0) {
      return res.status(400).json({ message: 'Nhóm chưa đăng ký giảng viên này hoặc đăng ký chưa được phê duyệt' });
    }

    // Kiểm tra giảng viên
    const checkGiangVien = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_so
        FROM NguoiDung
        WHERE ma_so = @ma_so_giang_vien AND vai_tro = 'giang_vien'
      `);
    if (checkGiangVien.recordset.length === 0) {
      return res.status(400).json({ message: 'Mã giảng viên không hợp lệ' });
    }

    // Cập nhật đề tài
    const result = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('ten_de_tai', sql.NVarChar, ten_detai)
      .input('mo_ta', sql.NVarChar, mo_ta || null)
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('trang_thai', sql.NVarChar, trang_thai || 'cho_duyet')
      .input('so_luong_sinh_vien_toi_da', sql.Int, so_luong_sinh_vien_toi_da)
      .query(`
        UPDATE DeTai
        SET ten_de_tai = @ten_de_tai,
            mo_ta = @mo_ta,
            ma_nhom = @ma_nhom,
            ma_so_giang_vien = @ma_so_giang_vien,
            trang_thai = @trang_thai,
            so_luong_sinh_vien_toi_da = @so_luong_sinh_vien_toi_da
        WHERE ma_de_tai = @ma_de_tai
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không thể cập nhật đề tài' });
    }

    res.json({ message: 'Cập nhật đề tài thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật đề tài', details: err.message });
  }
});

// DELETE /api/de-tai/:ma_de_tai: Xóa đề tài
router.delete('/de-tai/:ma_de_tai', authenticateToken, async (req, res) => {
  const { ma_de_tai } = req.params;
  console.log(`DELETE /de-tai: ma_de_tai = ${ma_de_tai}`);

  try {
    const pool = await poolPromise;

    // Kiểm tra ma_de_tai
    const checkDeTai = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`SELECT ma_de_tai FROM DeTai WHERE ma_de_tai = @ma_de_tai`);
    if (checkDeTai.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Xóa các bản ghi phụ thuộc
    await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`DELETE FROM ChamBaoVe WHERE ma_de_tai = @ma_de_tai`);

    await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`DELETE FROM LichBaoVe WHERE ma_de_tai = @ma_de_tai`);

    // Xóa đề tài
    const result = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`DELETE FROM DeTai WHERE ma_de_tai = @ma_de_tai`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không thể xóa đề tài' });
    }

    res.json({ message: 'Xóa đề tài thành công' });
  } catch (err) {
    console.error('Lỗi xóa đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa đề tài', details: err.message });
  }
});

// GET /api/giang-vien-hoi-dong/:ma_de_tai: Lấy danh sách giảng viên Chủ tịch
router.get('/giang-vien-hoi-dong/:ma_de_tai', authenticateToken, async (req, res) => {
  const { ma_de_tai } = req.params;
  console.log(`GET /giang-vien-hoi-dong: ma_de_tai = ${ma_de_tai}`);
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`
        SELECT DISTINCT hdb.ma_giang_vien, nd.ho_ten
        FROM HoiDongBaoVe hdb
        INNER JOIN LichBaoVe lb ON hdb.ma_lich = lb.ma_lich
        INNER JOIN NguoiDung nd ON hdb.ma_giang_vien = nd.ma_so
        WHERE lb.ma_de_tai = @ma_de_tai
          AND hdb.vai_tro_hoi_dong = N'Chủ tịch'
          AND lb.trang_thai = N'Đã xác nhận'
      `);
    console.log(`Kết quả giảng viên: ${JSON.stringify(result.recordset)}`);
    res.json({ giangVien: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy danh sách giảng viên hội đồng:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách giảng viên', details: err.message });
  }
});

// POST /api/admin/diem-bao-ve: Tạo bản ghi điểm bảo vệ
router.post('/admin/diem-bao-ve', authenticateToken, async (req, res) => {
  const { ma_de_tai, ma_so_giang_vien, diem_bao_ve, nhan_xet } = req.body;
  console.log(`POST /diem-bao-ve: ma_de_tai = ${ma_de_tai}, ma_so_giang_vien = ${ma_so_giang_vien}`);

  if (!ma_de_tai || !ma_so_giang_vien) {
    return res.status(400).json({ message: 'Thiếu mã đề tài hoặc mã giảng viên' });
  }
  if (diem_bao_ve !== null && (isNaN(diem_bao_ve) || diem_bao_ve < 0 || diem_bao_ve > 100)) {
    return res.status(400).json({ message: 'Điểm bảo vệ phải là số từ 0 đến 100' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra ma_de_tai
    const checkDeTai = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`SELECT ma_de_tai FROM DeTai WHERE ma_de_tai = @ma_de_tai`);
    if (checkDeTai.recordset.length === 0) {
      return res.status(400).json({ message: 'Mã đề tài không tồn tại' });
    }

    // Kiểm tra ma_so_giang_vien
    const checkGiangVien = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`SELECT ma_so FROM NguoiDung WHERE ma_so = @ma_so_giang_vien AND vai_tro = 'giang_vien'`);
    if (checkGiangVien.recordset.length === 0) {
      return res.status(400).json({ message: 'Mã giảng viên không tồn tại hoặc không phải giảng viên' });
    }

    // Kiểm tra Chủ tịch hội đồng
    const checkChuTich = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`
        SELECT hdb.ma_giang_vien
        FROM HoiDongBaoVe hdb
        INNER JOIN LichBaoVe lb ON hdb.ma_lich = lb.ma_lich
        WHERE hdb.ma_giang_vien = @ma_so_giang_vien
          AND lb.ma_de_tai = @ma_de_tai
          AND hdb.vai_tro_hoi_dong = N'Chủ tịch'
          AND lb.trang_thai = N'Đã xác nhận'
      `);
    if (checkChuTich.recordset.length === 0) {
      console.log(`Không tìm thấy Chủ tịch: ma_so_giang_vien = ${ma_so_giang_vien}, ma_de_tai = ${ma_de_tai}`);
      return res.status(403).json({ message: 'Giảng viên không phải chủ tịch hội đồng cho đề tài này' });
    }

    // Thêm điểm bảo vệ
    const result = await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('diem_bao_ve', sql.Float, diem_bao_ve ? parseFloat(diem_bao_ve) : null)
      .input('nhan_xet', sql.NVarChar, nhan_xet || null)
      .input('ngay_cham', sql.Date, new Date())
      .query(`
        INSERT INTO ChamBaoVe (ma_de_tai, ma_so_giang_vien, diem_bao_ve, nhan_xet, ngay_cham)
        OUTPUT INSERTED.ma_cham
        VALUES (@ma_de_tai, @ma_so_giang_vien, @diem_bao_ve, @nhan_xet, @ngay_cham)
      `);

    res.json({ message: 'Thêm điểm bảo vệ thành công', ma_cham: result.recordset[0].ma_cham });
  } catch (err) {
    console.error('Lỗi thêm điểm bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm điểm bảo vệ', details: err.message });
  }
});

// PUT /api/admin/diem-bao-ve/:ma_cham: Cập nhật điểm bảo vệ
router.put('/admin/diem-bao-ve/:ma_cham', authenticateToken, async (req, res) => {
  const { ma_cham } = req.params;
  const { diem_bao_ve, nhan_xet, ma_so_giang_vien, ma_de_tai } = req.body;
  console.log(`PUT /diem-bao-ve: ma_cham = ${ma_cham}, ma_de_tai = ${ma_de_tai}, ma_so_giang_vien = ${ma_so_giang_vien}`);

  if (diem_bao_ve === undefined || nhan_xet === undefined || !ma_so_giang_vien || !ma_de_tai) {
    return res.status(400).json({ message: 'Thiếu điểm bảo vệ, nhận xét, mã giảng viên hoặc mã đề tài' });
  }
  if (diem_bao_ve !== null && (isNaN(diem_bao_ve) || diem_bao_ve < 0 || diem_bao_ve > 100)) {
    return res.status(400).json({ message: 'Điểm bảo vệ phải là số từ 0 đến 100' });
  }
  if (isNaN(ma_cham)) {
    return res.status(400).json({ message: 'Mã chấm không hợp lệ' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra bản ghi
    const checkResult = await pool.request()
      .input('ma_cham', sql.Int, parseInt(ma_cham))
      .query(`
        SELECT ma_cham, ma_de_tai FROM ChamBaoVe WHERE ma_cham = @ma_cham
      `);
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy điểm bảo vệ với mã chấm này' });
    }

    // Kiểm tra Chủ tịch hội đồng
    const checkChuTich = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query(`
        SELECT hdb.ma_giang_vien
        FROM HoiDongBaoVe hdb
        INNER JOIN LichBaoVe lb ON hdb.ma_lich = lb.ma_lich
        WHERE hdb.ma_giang_vien = @ma_so_giang_vien
          AND lb.ma_de_tai = @ma_de_tai
          AND hdb.vai_tro_hoi_dong = N'Chủ tịch'
          AND lb.trang_thai = N'Đã xác nhận'
      `);
    if (checkChuTich.recordset.length === 0) {
      console.log(`Không tìm thấy Chủ tịch: ma_so_giang_vien = ${ma_so_giang_vien}, ma_de_tai = ${ma_de_tai}`);
      return res.status(403).json({ message: 'Giảng viên không phải chủ tịch hội đồng cho đề tài này' });
    }

    // Cập nhật điểm bảo vệ
    const result = await pool.request()
      .input('ma_cham', sql.Int, parseInt(ma_cham))
      .input('diem_bao_ve', sql.Float, diem_bao_ve ? parseFloat(diem_bao_ve) : null)
      .input('nhan_xet', sql.NVarChar, nhan_xet || null)
      .input('ngay_cham', sql.Date, new Date())
      .query(`
        UPDATE ChamBaoVe
        SET diem_bao_ve = @diem_bao_ve, 
            nhan_xet = @nhan_xet,
            ngay_cham = @ngay_cham
        WHERE ma_cham = @ma_cham
      `);

    res.json({ message: 'Cập nhật điểm bảo vệ thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật điểm bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật điểm bảo vệ', details: err.message });
  }
});

// GET /api/admin/diem-bao-ve: Lấy danh sách điểm bảo vệ
router.get('/admin/diem-bao-ve', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
            cb.ma_cham,
            cb.ma_de_tai,
            dt.ten_de_tai,
            ns.ma_nhom,
            ns.ten_nhom,
            cb.diem_bao_ve,
            cb.nhan_xet,
            cb.ngay_cham,
            cb.ma_so_giang_vien,
            nd.ho_ten AS ten_giang_vien
        FROM ChamBaoVe cb
        LEFT JOIN DeTai dt ON cb.ma_de_tai = dt.ma_de_tai
        LEFT JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
        LEFT JOIN NguoiDung nd ON cb.ma_so_giang_vien = nd.ma_so
        WHERE (ns.ten_nhom LIKE @search OR dt.ten_de_tai LIKE @search)
        ORDER BY cb.ma_cham
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM ChamBaoVe cb
        LEFT JOIN DeTai dt ON cb.ma_de_tai = dt.ma_de_tai
        LEFT JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
        WHERE (ns.ten_nhom LIKE @search OR dt.ten_de_tai LIKE @search)
      `);
    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ diemBaoVe: result.recordset, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách điểm bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy điểm bảo vệ', details: err.message });
  }
});

// DELETE /api/admin/diem-bao-ve/:ma_cham: Xóa điểm bảo vệ
router.delete('/admin/diem-bao-ve/:ma_cham', authenticateToken, async (req, res) => {
  const { ma_cham } = req.params;

  if (isNaN(ma_cham)) {
    return res.status(400).json({ message: 'Mã chấm không hợp lệ' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra bản ghi
    const checkResult = await pool.request()
      .input('ma_cham', sql.Int, parseInt(ma_cham))
      .query(`
        SELECT ma_cham FROM ChamBaoVe WHERE ma_cham = @ma_cham
      `);
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy điểm bảo vệ với mã chấm này' });
    }

    // Xóa điểm bảo vệ
    const result = await pool.request()
      .input('ma_cham', sql.Int, parseInt(ma_cham))
      .query(`
        DELETE FROM ChamBaoVe
        WHERE ma_cham = @ma_cham
      `);

    res.json({ message: 'Xóa điểm bảo vệ thành công' });
  } catch (err) {
    console.error('Lỗi xóa điểm bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa điểm bảo vệ', details: err.message });
  }
});

// GET /api/user/me: Lấy thông tin người dùng
router.get('/user/me', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so', sql.NVarChar, req.user.ma_so)
      .query(`
        SELECT ma_so, ho_ten, vai_tro
        FROM NguoiDung
        WHERE ma_so = @ma_so
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Lỗi lấy thông tin người dùng:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// GET /api/nhom/danh-sach: Lấy danh sách nhóm
router.get('/nhom/danh-sach', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
            n.ma_nhom, 
            n.ten_nhom, 
            n.ma_so_nhom_truong, 
            nd.ho_ten AS ten_nhom_truong, 
            n.ngay_tao, 
            n.trang_thai_nhom, 
            dt.ten_de_tai
        FROM NhomSinhVien n
        LEFT JOIN NguoiDung nd ON n.ma_so_nhom_truong = nd.ma_so
        LEFT JOIN DeTai dt ON n.ma_nhom = dt.ma_nhom
        WHERE (n.ten_nhom LIKE @search OR n.ma_nhom LIKE @search)
        ORDER BY n.ma_nhom
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM NhomSinhVien n
        WHERE (n.ten_nhom LIKE @search OR n.ma_nhom LIKE @search)
      `);
    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ groups: result.recordset, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhóm', details: err.message });
  }
});

module.exports = router;