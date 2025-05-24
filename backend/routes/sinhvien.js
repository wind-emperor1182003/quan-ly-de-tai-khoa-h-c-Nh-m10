const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

console.log('Loading sinhvien.js v2025-05-15-FIXED-SERVER-ERROR-V7');

// Middleware xác thực sinh viên
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
    return res.status(401).json({ message: 'Token không hợp lệ', details: err.message });
  }
};

// Đăng ký hoặc cập nhật đề tài
router.post('/detai/register', authenticateSinhVien, async (req, res) => {
  const { ten_de_tai, mo_ta, ma_nhom, ma_de_tai } = req.body;
  const ma_so_sinh_vien = req.user.ma_so;

  console.log('Đang sử dụng phiên bản sinhvien.js v2025-05-15-FIXED-SERVER-ERROR-V7');
  console.log('Dữ liệu nhận được tại /detai/register:', { ten_de_tai, mo_ta, ma_nhom, ma_de_tai, ma_so_sinh_vien });

  // Kiểm tra dữ liệu đầu vào
  if (!ten_de_tai || !mo_ta || !ma_nhom) {
    return res.status(400).json({ message: 'Thiếu thông tin: ten_de_tai, mo_ta, ma_nhom là bắt buộc' });
  }
  if (typeof ten_de_tai !== 'string' || ten_de_tai.trim().length < 5) {
    return res.status(400).json({ message: 'Tên đề tài phải có ít nhất 5 ký tự' });
  }
  if (typeof mo_ta !== 'string' || mo_ta.trim().length < 10) {
    return res.status(400).json({ message: 'Mô tả phải có ít nhất 10 ký tự' });
  }
  if (typeof ma_nhom !== 'string' || !ma_nhom.startsWith('NHOM')) {
    return res.status(400).json({ message: 'Mã nhóm không hợp lệ' });
  }

  let pool;
  let transaction;
  try {
    pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Kiểm tra kết nối database
    const dbCheck = await pool.request().query(`
      SELECT DB_NAME() AS CurrentDatabase, @@SERVERNAME AS ServerName
    `);
    console.log('Database và Server:', dbCheck.recordset[0]);
    if (dbCheck.recordset[0].CurrentDatabase !== 'QLDTSV') {
      throw new Error(`Kết nối sai database: ${dbCheck.recordset[0].CurrentDatabase}, kỳ vọng QLDTSV`);
    }

    // Kiểm tra schema bảng DeTai
    const deTaiSchemaCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DeTai' AND TABLE_SCHEMA = 'dbo'
    `);
    console.log('Schema bảng DeTai:', deTaiSchemaCheck.recordset);
    if (!deTaiSchemaCheck.recordset.some(col => col.COLUMN_NAME === 'ma_nhom')) {
      throw new Error('Cột ma_nhom không tồn tại trong bảng DeTai');
    }

    // Kiểm tra sinh viên có trong nhóm và là nhóm trưởng
    console.log('Kiểm tra sinh viên trong nhóm:', { ma_nhom, ma_so_sinh_vien });
    const memberResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT n.ma_so_nhom_truong, n.trang_thai_nhom
        FROM [dbo].[ThanhVienNhom] t
        JOIN [dbo].[NhomSinhVien] n ON t.ma_nhom = n.ma_nhom
        WHERE t.ma_nhom = @ma_nhom AND t.ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    console.log('Kết quả kiểm tra sinh viên:', memberResult.recordset);
    if (memberResult.recordset.length === 0) {
      throw new Error('Bạn không phải thành viên của nhóm này');
    }
    const { ma_so_nhom_truong, trang_thai_nhom } = memberResult.recordset[0];
    if (ma_so_nhom_truong !== ma_so_sinh_vien) {
      throw new Error('Chỉ nhóm trưởng mới có thể đăng ký đề tài');
    }
    if (trang_thai_nhom !== 'hop_le') {
      throw new Error('Nhóm chưa hợp lệ');
    }

    // Kiểm tra số lượng thành viên
    console.log('Kiểm tra số lượng thành viên nhóm:', { ma_nhom });
    const nhomResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT COUNT(t.ma_so_sinh_vien) AS so_luong_thanh_vien
        FROM [dbo].[NhomSinhVien] n
        LEFT JOIN [dbo].[ThanhVienNhom] t ON n.ma_nhom = t.ma_nhom
        WHERE n.ma_nhom = @ma_nhom
        GROUP BY n.ma_nhom
      `);
    const so_luong_thanh_vien = nhomResult.recordset[0]?.so_luong_thanh_vien || 0;
    console.log('Số lượng thành viên:', { so_luong_thanh_vien });
    const so_luong_sinh_vien_toi_da = 5;
    if (so_luong_thanh_vien < so_luong_sinh_vien_toi_da) {
      throw new Error(`Nhóm chưa đủ thành viên (hiện tại: ${so_luong_thanh_vien}/${so_luong_sinh_vien_toi_da})`);
    }

    // Kiểm tra giảng viên được duyệt
    console.log('Kiểm tra giảng viên được duyệt:', { ma_nhom });
    const giangVienResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_giang_vien
        FROM [dbo].[DangKyGiangVien]
        WHERE ma_nhom = @ma_nhom AND trang_thai_dang_ky = 'da_duyet'
      `);
    console.log('Kết quả kiểm tra giảng viên:', giangVienResult.recordset);
    if (giangVienResult.recordset.length === 0) {
      throw new Error('Nhóm chưa có giảng viên được duyệt');
    }
    const { ma_so_giang_vien } = giangVienResult.recordset[0];

    // Kiểm tra ma_so_giang_vien tồn tại trong bảng GiangVien
    console.log('Kiểm tra ma_so_giang_vien:', { ma_so_giang_vien });
    const giangVienCheck = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so_giang_vien)
      .query(`
        SELECT ma_so FROM [dbo].[GiangVien] WHERE ma_so = @ma_so_giang_vien
      `);
    console.log('Kết quả kiểm tra GiangVien:', giangVienCheck.recordset);
    if (giangVienCheck.recordset.length === 0) {
      throw new Error(`Mã giảng viên ${ma_so_giang_vien} không tồn tại trong bảng GiangVien`);
    }

    // Kiểm tra ma_nhom tồn tại trong bảng NhomSinhVien
    console.log('Kiểm tra ma_nhom:', { ma_nhom });
    const nhomCheck = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_nhom FROM [dbo].[NhomSinhVien] WHERE ma_nhom = @ma_nhom
      `);
    console.log('Kết quả kiểm tra NhomSinhVien:', nhomCheck.recordset);
    if (nhomCheck.recordset.length === 0) {
      throw new Error(`Mã nhóm ${ma_nhom} không tồn tại trong bảng NhomSinhVien`);
    }

    // Kiểm tra trùng tên đề tài
    console.log('Kiểm tra trùng tên đề tài:', { ten_de_tai });
    const checkDeTai = await pool.request()
      .input('ten_de_tai', sql.NVarChar(200), ten_de_tai.trim())
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_de_tai, ten_de_tai, ma_nhom, trang_thai
        FROM [dbo].[DeTai]
        WHERE LOWER(ten_de_tai) = LOWER(@ten_de_tai) AND ma_nhom != @ma_nhom
      `);
    console.log('Kết quả kiểm tra trùng tên:', checkDeTai.recordset);
    if (checkDeTai.recordset.length > 0) {
      const danhSachDeTai = await pool.request().query(`
        SELECT ma_de_tai, ten_de_tai, ma_nhom, trang_thai, ma_so_giang_vien
        FROM [dbo].[DeTai]
        WHERE trang_thai IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'hoan_thanh')
      `);
      throw new Error('Tên đề tài đã tồn tại', { danhSachDeTai: danhSachDeTai.recordset });
    }

    // Kiểm tra nhóm đã có đề tài
    console.log('Kiểm tra nhóm đã có đề tài:', { ma_nhom });
    const deTaiResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_de_tai, trang_thai, ma_so_giang_vien, ngay_tao
        FROM [dbo].[DeTai]
        WHERE ma_nhom = @ma_nhom
      `);
    console.log('Kết quả kiểm tra nhóm:', deTaiResult.recordset);

    let final_ma_de_tai;
    let isUpdate = false;
    let responseData;

    if (deTaiResult.recordset.length > 0) {
      const existingDeTai = deTaiResult.recordset[0];
      if (existingDeTai.trang_thai !== 'huy') {
        throw new Error('Nhóm đã có đề tài đang hoạt động');
      }
      // Update existing topic
      isUpdate = true;
      final_ma_de_tai = existingDeTai.ma_de_tai;

      console.log('Cập nhật đề tài:', { ma_de_tai: final_ma_de_tai });
      const updateResult = await pool.request()
        .input('ma_de_tai', sql.VarChar(20), final_ma_de_tai)
        .input('ten_de_tai', sql.NVarChar(200), ten_de_tai.trim())
        .input('mo_ta', sql.NVarChar(1000), mo_ta.trim())
        .input('trang_thai', sql.VarChar(20), 'cho_duyet')
        .query(`
          UPDATE [dbo].[DeTai]
          SET ten_de_tai = @ten_de_tai, mo_ta = @mo_ta, trang_thai = @trang_thai
          WHERE ma_de_tai = @ma_de_tai
        `);
      console.log('Kết quả cập nhật DeTai:', updateResult);

      // Verify update
      const verifyUpdate = await pool.request()
        .input('ma_de_tai', sql.VarChar(20), final_ma_de_tai)
        .query(`
          SELECT ma_de_tai, ten_de_tai, mo_ta, ma_nhom, trang_thai, ma_so_giang_vien, ngay_tao
          FROM [dbo].[DeTai]
          WHERE ma_de_tai = @ma_de_tai
        `);
      console.log('Kết quả xác minh cập nhật:', verifyUpdate.recordset);
      if (verifyUpdate.recordset.length === 0) {
        throw new Error('Không tìm thấy đề tài sau khi cập nhật');
      }

      responseData = {
        ma_de_tai: final_ma_de_tai,
        ten_de_tai: ten_de_tai.trim(),
        mo_ta: mo_ta.trim(),
        ma_nhom,
        ma_so_giang_vien: existingDeTai.ma_so_giang_vien,
        trang_thai: 'cho_duyet',
        ngay_tao: existingDeTai.ngay_tao ? new Date(existingDeTai.ngay_tao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
    } else {
      // Create new topic
      console.log('Sinh mã đề tài mới');
      const countResult = await pool.request()
        .query(`SELECT COUNT(*) AS count FROM [dbo].[DeTai] WHERE ma_de_tai LIKE 'DT%'`);
      const newCount = countResult.recordset[0].count + 1;
      final_ma_de_tai = `DT${newCount.toString().padStart(3, '0')}`;
      console.log('Mã đề tài mới:', { ma_de_tai: final_ma_de_tai });

      // Kiểm tra ma_de_tai không trùng
      console.log('Kiểm tra ma_de_tai:', { ma_de_tai: final_ma_de_tai });
      const maDeTaiCheck = await pool.request()
        .input('ma_de_tai', sql.VarChar(20), final_ma_de_tai)
        .query(`
          SELECT ma_de_tai FROM [dbo].[DeTai] WHERE ma_de_tai = @ma_de_tai
        `);
      console.log('Kết quả kiểm tra ma_de_tai:', maDeTaiCheck.recordset);
      if (maDeTaiCheck.recordset.length > 0) {
        throw new Error(`Mã đề tài ${final_ma_de_tai} đã tồn tại`);
      }

      // Thêm đề tài
      console.log('Thêm đề tài vào DeTai:', { ma_de_tai: final_ma_de_tai, ten_de_tai, ma_nhom, ma_so_giang_vien });
      await pool.request()
        .input('ma_de_tai', sql.VarChar(20), final_ma_de_tai)
        .input('ten_de_tai', sql.NVarChar(200), ten_de_tai.trim())
        .input('mo_ta', sql.NVarChar(1000), mo_ta.trim())
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so_giang_vien)
        .input('trang_thai', sql.VarChar(20), 'cho_duyet')
        .input('ngay_tao', sql.Date, new Date().toISOString().split('T')[0])
        .input('so_luong_sinh_vien_toi_da', sql.Int, so_luong_sinh_vien_toi_da)
        .query(`
          INSERT INTO [dbo].[DeTai] (
            ma_de_tai, ten_de_tai, mo_ta, ma_nhom, ma_so_giang_vien, 
            trang_thai, ngay_tao, so_luong_sinh_vien_toi_da
          )
          VALUES (
            @ma_de_tai, @ten_de_tai, @mo_ta, @ma_nhom, @ma_so_giang_vien, 
            @trang_thai, @ngay_tao, @so_luong_sinh_vien_toi_da
          )
        `);

      responseData = {
        ma_de_tai: final_ma_de_tai,
        ten_de_tai: ten_de_tai.trim(),
        mo_ta: mo_ta.trim(),
        ma_nhom,
        ma_so_giang_vien,
        trang_thai: 'cho_duyet',
        ngay_tao: new Date().toISOString().split('T')[0]
      };
    }

    // Thêm thông báo
    console.log('Thêm thông báo cho nhóm:', { ma_nhom, ma_de_tai: final_ma_de_tai });
    try {
      await pool.request()
        .input('ma_nhom', sql.NVarChar(20), ma_nhom)
        .input('ma_de_tai', sql.VarChar(20), final_ma_de_tai)
        .input('noi_dung', sql.NVarChar(500), `Đề tài ${final_ma_de_tai} đã được ${isUpdate ? 'cập nhật' : 'đăng ký'}, đang chờ duyệt`)
        .input('ngay_gui', sql.DateTime, new Date())
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
          VALUES (@ma_nhom, @noi_dung, @ngay_gui, 'chua_xem')
        `);
      console.log('Thông báo đã được thêm thành công');
    } catch (notificationErr) {
      console.error('Lỗi khi thêm thông báo:', notificationErr.message);
      // Log lỗi nhưng không làm thất bại giao dịch chính
    }

    // Chuẩn bị phản hồi
    console.log('Chuẩn bị phản hồi:', { isUpdate, responseData });

    // Commit giao dịch
    await transaction.commit();
    console.log('Transaction committed successfully');

    // Gửi phản hồi
    res.status(isUpdate ? 200 : 201).json({ 
      message: `${isUpdate ? 'Cập nhật' : 'Đăng ký'} đề tài thành công`, 
      ma_de_tai: final_ma_de_tai,
      de_tai: responseData
    });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('Transaction rolled back due to error:', err.message);
      } catch (rollbackErr) {
        console.error('Error during transaction rollback:', rollbackErr.message);
      }
    }
    console.error('Lỗi đăng ký/cập nhật đề tài:', err);

    if (err.message === 'Tên đề tài đã tồn tại') {
      return res.status(400).json({
        message: err.message,
        danhSachDeTai: err.danhSachDeTai
      });
    }
    if (err.message.includes('Nhóm chưa đủ thành viên') || 
        err.message.includes('Nhóm chưa hợp lệ') || 
        err.message.includes('Nhóm chưa có giảng viên') || 
        err.message.includes('Chỉ nhóm trưởng') || 
        err.message.includes('Bạn không phải thành viên') || 
        err.message.includes('Nhóm đã có đề tài đang hoạt động') ||
        err.message.includes('Mã giảng viên') ||
        err.message.includes('Mã nhóm') ||
        err.message.includes('Mã đề tài') ||
        err.message.includes('Không tìm thấy đề tài')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ 
      message: 'Lỗi server khi đăng ký/cập nhật đề tài', 
      details: err.message,
      stack: err.stack
    });
  } finally {
    console.log('Kết thúc xử lý /detai/register');
  }
});

// Lấy danh sách đề tài đã đăng ký
router.get('/detai/danh-sach', authenticateSinhVien, async (req, res) => {
  try {
    const pool = await poolPromise;

    console.log('Lấy danh sách đề tài');
    const result = await pool.request().query(`
      SELECT dt.ma_de_tai, dt.ten_de_tai, dt.ma_nhom, dt.trang_thai, dt.ma_so_giang_vien, nd.ho_ten AS ten_giang_vien
      FROM [dbo].[DeTai] dt
      JOIN [dbo].[NguoiDung] nd ON dt.ma_so_giang_vien = nd.ma_so
      WHERE dt.trang_thai IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'hoan_thanh')
    `);
    console.log('Kết quả danh sách đề tài:', result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài', details: err.message });
  }
});

// Lấy thông tin đề tài của nhóm
router.get('/detai/thong-tin', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;
  try {
    const pool = await poolPromise;

    console.log('Lấy thông tin đề tài cho sinh viên:', { ma_so_sinh_vien });
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT dt.ma_de_tai, dt.ten_de_tai, dt.mo_ta, dt.ma_nhom, dt.trang_thai, dt.ngay_tao, dt.ma_so_giang_vien, nd.ho_ten AS ten_giang_vien, nd.sdt
        FROM [dbo].[DeTai] dt
        JOIN [dbo].[ThanhVienNhom] t ON dt.ma_nhom = t.ma_nhom
        JOIN [dbo].[NguoiDung] nd ON dt.ma_so_giang_vien = nd.ma_so
        WHERE t.ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    console.log('Kết quả thông tin đề tài:', result.recordset);
    res.json(result.recordset[0] || null);
  } catch (err) {
    console.error('Lỗi lấy thông tin đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin đề tài', details: err.message });
  }
});

module.exports = router;