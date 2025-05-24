const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

console.log('Loading sinhVienBaoCao.js v2025-05-16-NOP-BO-SUNG-FIX');

// Cấu hình multer để lưu tệp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../Uploads/BaoCao');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF, DOC, DOCX'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Middleware xác thực sinh viên
const authenticateSinhVien = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'sinh_vien') {
      return res.status(403).json({ message: 'Chỉ sinh viên được phép truy cập' });
    }
    req.user = { ma_so: decoded.ma_so, vai_tro: decoded.vai_tro };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ', details: err.message });
  }
};

// Xử lý lỗi chung
const handleError = (res, err, customMessage, statusCode = 500) => {
  console.error(customMessage, err);
  res.status(statusCode).json({ message: customMessage, details: err.message });
};

// Lấy danh sách báo cáo
router.get('/danh-sach', authenticateSinhVien, async (req, res) => {
  const ma_so_sinh_vien = req.user.ma_so;
  try {
    console.log(`Fetching reports for sinh_vien: ${ma_so_sinh_vien}`);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT bc.ma_bao_cao, bc.ma_de_tai, dt.ten_de_tai, bc.ma_nhom, ns.ten_nhom, 
               bc.ky_bao_cao, bc.han_nop, bc.nhan_xet_sinh_vien, bc.ngay_nop, 
               bc.trang_thai, bc.diem_tien_do, bc.nhan_xet, bc.tep_dinh_kem, 
               bc.ma_so_sinh_vien, bc.ngay_danh_gia, bc.tre_han, bc.so_lan_chinh_sua
        FROM [dbo].[BaoCaoTienDo] bc
        JOIN [dbo].[ThanhVienNhom] tvn ON bc.ma_nhom = tvn.ma_nhom
        JOIN [dbo].[DeTai] dt ON bc.ma_de_tai = dt.ma_de_tai
        JOIN [dbo].[NhomSinhVien] ns ON bc.ma_nhom = ns.ma_nhom
        WHERE tvn.ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    console.log(`Found ${result.recordset.length} reports`);
    res.json(result.recordset);
  } catch (err) {
    handleError(res, err, 'Lỗi server khi lấy danh sách báo cáo');
  }
});

// Nộp báo cáo
router.post('/nop', authenticateSinhVien, upload.single('tep_dinh_kem'), async (req, res) => {
  const { ma_bao_cao, nhan_xet_sinh_vien } = req.body;
  const ma_so_sinh_vien = req.user.ma_so;
  const file = req.file;

  console.log(`Nộp báo cáo: ma_bao_cao=${ma_bao_cao}, ma_so_sinh_vien=${ma_so_sinh_vien}, file=${file?.filename}`);

  if (!ma_bao_cao || !file) {
    if (file) {
      console.log('Missing ma_bao_cao or file, deleting uploaded file:', file.path);
      fs.unlinkSync(file.path);
    }
    return res.status(400).json({ message: 'Thiếu mã báo cáo hoặc tệp đính kèm' });
  }

  let pool, transaction;
  try {
    pool = await poolPromise;
    console.log('Database pool acquired');
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('Transaction started');

    // Kiểm tra nhóm và quyền trưởng nhóm
    console.log('Checking ThanhVienNhom and NhomSinhVien for ma_so_sinh_vien:', ma_so_sinh_vien);
    const nhomResult = await pool.request()
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .query(`
        SELECT tvn.ma_nhom, ns.ma_so_nhom_truong 
        FROM [dbo].[ThanhVienNhom] tvn
        JOIN [dbo].[NhomSinhVien] ns ON tvn.ma_nhom = ns.ma_nhom
        WHERE tvn.ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    if (nhomResult.recordset.length === 0) {
      throw new Error('Sinh viên không thuộc nhóm nào');
    }
    const { ma_nhom, ma_so_nhom_truong } = nhomResult.recordset[0];
    console.log(`Found ma_nhom: ${ma_nhom}, ma_so_nhom_truong: ${ma_so_nhom_truong}`);
    if (ma_so_nhom_truong !== ma_so_sinh_vien) {
      throw new Error('Chỉ trưởng nhóm được nộp báo cáo');
    }

    // Kiểm tra báo cáo
    console.log('Checking BaoCaoTienDo for ma_bao_cao:', ma_bao_cao);
    const baoCaoResult = await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT han_nop, trang_thai, so_lan_chinh_sua, ngay_nop 
        FROM [dbo].[BaoCaoTienDo] 
        WHERE ma_bao_cao = @ma_bao_cao AND ma_nhom = @ma_nhom
      `);
    if (baoCaoResult.recordset.length === 0) {
      throw new Error('Báo cáo không tồn tại hoặc không thuộc nhóm này');
    }
    const { han_nop, trang_thai, so_lan_chinh_sua, ngay_nop } = baoCaoResult.recordset[0];
    console.log(`BaoCaoTienDo: han_nop=${han_nop}, trang_thai=${trang_thai}, so_lan_chinh_sua=${so_lan_chinh_sua}, ngay_nop=${ngay_nop}`);
    if (trang_thai !== 'chua_nop') {
      throw new Error('Báo cáo đã được nộp hoặc đánh giá');
    }
    if (new Date(han_nop) < new Date()) {
      throw new Error('Đã quá hạn nộp báo cáo');
    }

    // Tính tre_han
    const treHan = new Date() > new Date(han_nop) ? 1 : 0;
    console.log(`Calculated tre_han: ${treHan}`);

    // Tính so_lan_chinh_sua
    const newSoLanChinhSua = ngay_nop ? so_lan_chinh_sua + 1 : 0;
    console.log(`Calculated so_lan_chinh_sua: ${newSoLanChinhSua}`);

    // Xóa file cũ nếu tồn tại
    const oldFileResult = await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .query(`
        SELECT tep_dinh_kem 
        FROM [dbo].[BaoCaoTienDo] 
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    const oldFilePath = oldFileResult.recordset[0]?.tep_dinh_kem;
    if (oldFilePath) {
      console.log('Deleting old file:', oldFilePath);
      const fullPath = path.join(__dirname, '..', oldFilePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Cập nhật BaoCaoTienDo
    console.log('Updating BaoCaoTienDo');
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('nhan_xet_sinh_vien', sql.NVarChar(2000), nhan_xet_sinh_vien || null)
      .input('ma_so_sinh_vien', sql.VarChar(20), ma_so_sinh_vien)
      .input('ngay_nop', sql.Date, new Date())
      .input('trang_thai', sql.VarChar(20), 'da_nop')
      .input('tep_dinh_kem', sql.NVarChar(500), file ? `/Uploads/BaoCao/${file.filename}` : null)
      .input('tre_han', sql.Bit, treHan)
      .input('so_lan_chinh_sua', sql.Int, newSoLanChinhSua)
      .query(`
        UPDATE [dbo].[BaoCaoTienDo]
        SET nhan_xet_sinh_vien = @nhan_xet_sinh_vien, 
            ma_so_sinh_vien = @ma_so_sinh_vien, 
            ngay_nop = @ngay_nop, 
            trang_thai = @trang_thai, 
            tep_dinh_kem = @tep_dinh_kem,
            tre_han = @tre_han,
            so_lan_chinh_sua = @so_lan_chinh_sua
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    console.log('Updated BaoCaoTienDo');

    // Lấy danh sách sinh viên trong nhóm
    console.log('Fetching all ma_so_sinh_vien in ma_nhom:', ma_nhom);
    const thanhVienResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien 
        FROM [dbo].[ThanhVienNhom] 
        WHERE ma_nhom = @ma_nhom
      `);
    const sinhVienList = thanhVienResult.recordset;
    console.log(`Found ${sinhVienList.length} sinh_vien in ma_nhom: ${ma_nhom}`);

    // Insert thông báo cho từng sinh viên
    console.log('Inserting ThongBao for each sinh_vien in ma_nhom:', ma_nhom);
    for (const sv of sinhVienList) {
      console.log(`Inserting ThongBao for ma_so_sinh_vien: ${sv.ma_so_sinh_vien}`);
      const noi_dung = newSoLanChinhSua > 0 
        ? `Báo cáo ${ma_bao_cao} đã được chỉnh sửa lần ${newSoLanChinhSua} bởi ${ma_so_sinh_vien}${treHan ? ' (trễ hạn)' : ''}`
        : `Báo cáo ${ma_bao_cao} đã nộp bởi ${ma_so_sinh_vien}${treHan ? ' (trễ hạn)' : ''}`;
      await pool.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), sv.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), noi_dung)
        .input('ngay_gui', sql.Date, new Date())
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai) 
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, 'chua_xem')
        `);
    }
    console.log('Inserted ThongBao for all sinh_vien');

    // Commit transaction
    console.log('Committing transaction');
    await transaction.commit();
    console.log('Transaction committed');

    res.status(200).json({ message: 'Nộp báo cáo thành công', ma_bao_cao });
    console.log(`Response sent: Nộp báo cáo thành công, ma_bao_cao: ${ma_bao_cao}`);
  } catch (err) {
    if (transaction) {
      console.log('Rolling back transaction due to error:', err.message);
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    if (file) {
      console.log('Deleting uploaded file due to error:', file.path);
      fs.unlinkSync(file.path);
    }
    if (err.message.includes('trưởng nhóm') || err.message.includes('không tồn tại') || 
        err.message.includes('quá hạn') || err.message.includes('đã được nộp')) {
      console.log(`Client error: ${err.message}`);
      return res.status(400).json({ message: err.message });
    }
    handleError(res, err, 'Lỗi server khi nộp báo cáo');
  } finally {
    if (pool) {
      console.log('Releasing database pool');
    }
  }
});

// Tải tệp báo cáo
router.get('/tep/:filename', authenticateSinhVien, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../Uploads/BaoCao', filename);
  console.log(`Downloading file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Tệp không tồn tại' });
  }
});

module.exports = router;