const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { poolPromise } = require('../config/db');

// Middleware to authenticate lecturer
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'giang_vien') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Get defense council schedules
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_giang_vien', sql.VarChar, req.user.ma_so)
      .query(`
        SELECT h.ma_lich, h.ma_giang_vien, h.vai_tro_hoi_dong,
               l.ma_de_tai, l.dia_diem, l.thoi_gian, l.trang_thai,
               d.ten_de_tai
        FROM HoiDongBaoVe h
        INNER JOIN LichBaoVe l ON h.ma_lich = l.ma_lich
        INNER JOIN DeTai d ON l.ma_de_tai = d.ma_de_tai
        WHERE h.ma_giang_vien = @ma_giang_vien
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Grade defense
router.post('/cham', authenticate, async (req, res) => {
  const { ma_lich, ma_de_tai, diem_bao_ve, nhan_xet } = req.body;
  if (!ma_lich || !ma_de_tai || diem_bao_ve === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  if (diem_bao_ve < 0 || diem_bao_ve > 100) {
    return res.status(400).json({ message: 'Điểm phải từ 0 đến 100' });
  }

  try {
    const pool = await poolPromise;
    // Verify lecturer is in the council
    const check = await pool.request()
      .input('ma_lich', sql.Int, ma_lich)
      .input('ma_giang_vien', sql.VarChar, req.user.ma_so)
      .query(`
        SELECT 1 FROM HoiDongBaoVe
        WHERE ma_lich = @ma_lich AND ma_giang_vien = @ma_giang_vien
      `);
    if (check.recordset.length === 0) {
      return res.status(403).json({ message: 'Bạn không có quyền chấm điểm cho lịch này' });
    }

    await pool.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('ma_giang_vien', sql.VarChar, req.user.ma_so)
      .input('diem_bao_ve', sql.Float, diem_bao_ve)
      .input('nhan_xet', sql.NVarChar, nhan_xet || '')
      .query(`
        INSERT INTO ChamBaoVe (ma_de_tai, ma_so_giang_vien, diem_bao_ve, nhan_xet, ngay_cham)
        VALUES (@ma_de_tai, @ma_giang_vien, @diem_bao_ve, @nhan_xet, GETDATE())
      `);
    res.json({ message: 'Chấm điểm thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

module.exports = router;