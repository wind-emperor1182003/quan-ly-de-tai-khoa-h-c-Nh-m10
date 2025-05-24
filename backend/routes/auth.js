//D:\2025\CNPM\Doan\backend\routes\auth.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');

// Route đăng nhập
router.post('/login', async (req, res) => {
  const { ma_so, mat_khau } = req.body;

  if (!ma_so || !mat_khau) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã số và mật khẩu' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('SELECT * FROM NguoiDung WHERE ma_so = @ma_so');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    }

    const user = result.recordset[0];

    // TODO: Trong sản xuất, sử dụng bcrypt để mã hóa mật khẩu
    if (user.mat_khau !== mat_khau) {
      return res.status(401).json({ message: 'Mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { ma_so: user.ma_so, vai_tro: user.vai_tro },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { ma_so: user.ma_so, ho_ten: user.ho_ten, vai_tro: user.vai_tro } });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Route đăng ký (tùy chọn, nếu cần)
router.post('/register', async (req, res) => {
  const { ma_so, ho_ten, email, mat_khau, vai_tro } = req.body;

  if (!ma_so || !ho_ten || !email || !mat_khau) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra mã số đã tồn tại
    const checkUser = await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('SELECT * FROM NguoiDung WHERE ma_so = @ma_so');
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'Mã số đã tồn tại' });
    }

    // Thêm người dùng
    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .input('ho_ten', sql.NVarChar, ho_ten)
      .input('email', sql.NVarChar, email)
      .input('mat_khau', sql.NVarChar, mat_khau) // TODO: Mã hóa mật khẩu với bcrypt
      .input('vai_tro', sql.VarChar, vai_tro || 'sinh_vien')
      .query(`
        INSERT INTO NguoiDung (ma_so, ho_ten, email, mat_khau, vai_tro)
        VALUES (@ma_so, @ho_ten, @email, @mat_khau, @vai_tro)
      `);

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;