const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const { authenticateSinhVien } = require('../middleware/auth');

// Vô hiệu hóa endpoint /register
router.post('/register', authenticateSinhVien, async (req, res) => {
  return res.status(403).json({ 
    message: 'Endpoint này đã bị vô hiệu hóa. Vui lòng sử dụng /api/sinhvien/detai/register' 
  });
});

// Endpoint lấy danh sách đề tài
router.get('/list', authenticateSinhVien, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ma_de_tai, ten_de_tai, ma_nhom, trang_thai
      FROM [dbo].[DeTai]
      WHERE trang_thai IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'hoan_thanh')
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

module.exports = router;