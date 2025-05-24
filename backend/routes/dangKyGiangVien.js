const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const { authenticateSinhVien } = require('../middleware/auth');

// Lấy danh sách giảng viên
router.get('/giangvien/danh-sach', authenticateSinhVien, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT g.ma_so, nd.ho_ten
      FROM [dbo].[GiangVien] g
      JOIN [dbo].[NguoiDung] nd ON g.ma_so = nd.ma_so
      WHERE nd.vai_tro = 'giang_vien'
      ORDER BY nd.ho_ten
    `);
    
    if (result.recordset.length === 0) {
      console.warn('Không tìm thấy giảng viên nào trong cơ sở dữ liệu');
      return res.status(404).json({ message: 'Không tìm thấy giảng viên nào' });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách giảng viên:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách giảng viên', 
      details: err.message 
    });
  }
});

// Đăng ký giảng viên hướng dẫn
router.post('/', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;
  const { ma_so_giang_vien, ma_nhom } = req.body;

  console.log('Yêu cầu đăng ký giảng viên:', { ma_so_sinh_vien, ma_so_giang_vien, ma_nhom });

  // Kiểm tra dữ liệu đầu vào
  if (!ma_nhom || !ma_so_giang_vien) {
    console.warn('Thiếu dữ liệu đầu vào:', { ma_nhom, ma_so_giang_vien });
    return res.status(400).json({ message: 'Vui lòng cung cấp mã nhóm và mã giảng viên' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra kết nối database
    const dbCheck = await pool.request().query(`
      SELECT DB_NAME() AS CurrentDatabase, @@SERVERNAME AS ServerName
    `);
    console.log('Database và Server:', dbCheck.recordset[0]);

    // Kiểm tra nhóm và trưởng nhóm
    const nhomResult = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar, ma_so_sinh_vien)
      .query(`
        SELECT ma_nhom, ma_so_nhom_truong, trang_thai_nhom
        FROM [dbo].[NhomSinhVien]
        WHERE ma_nhom = @ma_nhom
      `);

    if (nhomResult.recordset.length === 0) {
      console.warn('Không tìm thấy nhóm:', ma_nhom);
      return res.status(404).json({ message: 'Không tìm thấy nhóm' });
    }

    const { ma_so_nhom_truong, trang_thai_nhom } = nhomResult.recordset[0];
    if (ma_so_nhom_truong !== ma_so_sinh_vien) {
      console.warn('Người dùng không phải trưởng nhóm:', { ma_so_sinh_vien, ma_so_nhom_truong });
      return res.status(403).json({ message: 'Chỉ nhóm trưởng mới có thể đăng ký giảng viên' });
    }

    if (trang_thai_nhom !== 'hop_le') {
      console.warn('Nhóm chưa hợp lệ:', { ma_nhom, trang_thai_nhom });
      return res.status(400).json({ message: 'Nhóm chưa hợp lệ' });
    }

    // Kiểm tra giảng viên tồn tại
    const giangVienResult = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_so
        FROM [dbo].[GiangVien]
        WHERE ma_so = @ma_so_giang_vien
      `);

    if (giangVienResult.recordset.length === 0) {
      console.warn('Không tìm thấy giảng viên:', ma_so_giang_vien);
      return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
    }

    // Kiểm tra đã đăng ký giảng viên chưa
    const dangKyResult = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_dang_ky_gv, trang_thai_dang_ky
        FROM [dbo].[DangKyGiangVien]
        WHERE ma_nhom = @ma_nhom
        AND trang_thai_dang_ky IN ('cho_duyet', 'da_duyet')
      `);

    if (dangKyResult.recordset.length > 0) {
      const { trang_thai_dang_ky } = dangKyResult.recordset[0];
      console.warn('Nhóm đã đăng ký giảng viên:', { ma_nhom, trang_thai_dang_ky });
      return res.status(400).json({ 
        message: `Nhóm đã đăng ký giảng viên, trạng thái: ${trang_thai_dang_ky === 'cho_duyet' ? 'chờ duyệt' : 'đã duyệt'}`
      });
    }

    // Xóa bản ghi bị từ chối (nếu có)
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        DELETE FROM [dbo].[DangKyGiangVien]
        WHERE ma_nhom = @ma_nhom
        AND trang_thai_dang_ky = 'tu_choi'
      `);

    // Tạo bản ghi đăng ký
    console.log('Tạo bản ghi đăng ký giảng viên:', { ma_nhom, ma_so_giang_vien });
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar, ma_so_giang_vien)
      .input('ngay_dang_ky', sql.Date, new Date())
      .input('trang_thai_dang_ky', sql.VarChar, 'cho_duyet')
      .query(`
        INSERT INTO [dbo].[DangKyGiangVien] (ma_nhom, ma_so_giang_vien, ngay_dang_ky, trang_thai_dang_ky)
        VALUES (@ma_nhom, @ma_so_giang_vien, @ngay_dang_ky, @trang_thai_dang_ky)
      `);

    // Thêm thông báo (bọc trong try-catch riêng)
    try {
      console.log('Tạo thông báo cho nhóm:', ma_nhom);
      await pool.request()
        .input('ma_nhom', sql.NVarChar, ma_nhom)
        .input('noi_dung', sql.NVarChar, `Đã đăng ký giảng viên ${ma_so_giang_vien}, đang chờ duyệt`)
        .input('ngay_gui', sql.DateTime, new Date())
        .input('trang_thai', sql.VarChar, 'chua_xem')
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
          VALUES (@ma_nhom, @noi_dung, @ngay_gui, @trang_thai)
        `);
    } catch (thongBaoErr) {
      console.warn('Lỗi tạo thông báo, nhưng đăng ký vẫn thành công:', {
        message: thongBaoErr.message,
        stack: thongBaoErr.stack
      });
      // Không trả về lỗi, chỉ ghi log
    }

    res.status(200).json({ message: 'Đăng ký giảng viên thành công, đang chờ duyệt' });
  } catch (err) {
    console.error('Lỗi đăng ký giảng viên:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
    });
    res.status(500).json({ 
      message: 'Lỗi server khi đăng ký giảng viên', 
      details: err.message 
    });
  }
});

// Lấy thông tin đăng ký giảng viên
router.get('/thong-tin', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar, ma_so_sinh_vien)
      .query(`
        SELECT dkgv.ma_dang_ky_gv, dkgv.ma_nhom, dkgv.ma_so_giang_vien, dkgv.ngay_dang_ky, 
               dkgv.trang_thai_dang_ky, nd.ho_ten AS ten_giang_vien
        FROM [dbo].[DangKyGiangVien] dkgv
        JOIN [dbo].[NguoiDung] nd ON dkgv.ma_so_giang_vien = nd.ma_so
        JOIN [dbo].[NhomSinhVien] n ON dkgv.ma_nhom = n.ma_nhom
        JOIN [dbo].[ThanhVienNhom] t ON n.ma_nhom = t.ma_nhom
        WHERE t.ma_so_sinh_vien = @ma_so_sinh_vien
      `);

    res.json(result.recordset[0] || null);
  } catch (err) {
    console.error('Lỗi lấy thông tin đăng ký giảng viên:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy thông tin đăng ký giảng viên', 
      details: err.message 
    });
  }
});

module.exports = router;