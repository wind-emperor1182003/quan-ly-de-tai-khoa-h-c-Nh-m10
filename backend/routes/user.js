//D:\2025\CNPM\Doan\backend\routes\user.js
const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { authenticate } = require('../middleware/auth');

console.log('Loading user.js, authenticate:', typeof authenticate);

router.get('/me', authenticate, async (req, res) => {
  const ma_so = req.user.ma_so;
  console.log('Fetching user with ma_so:', ma_so);

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('SELECT ma_so, ho_ten, email, vai_tro FROM NguoiDung WHERE ma_so = @ma_so');
    
    if (result.recordset.length === 0) {
      console.log('User not found for ma_so:', ma_so);
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    console.log('User found:', result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Lỗi lấy thông tin người dùng:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

module.exports = router;