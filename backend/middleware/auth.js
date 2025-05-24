//D:\2025\CNPM\Doan\backend\middleware\auth.js
const jwt = require('jsonwebtoken');

// Middleware xác thực token cho tất cả vai trò
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Không có token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ma_so: decoded.ma_so, vai_tro: decoded.vai_tro };
    next();
  } catch (err) {
    console.error('Lỗi xác thực token:', err);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Middleware xác thực token (trước đây chỉ dành cho sinh viên, giờ cho phép tất cả vai trò)
const authenticateSinhVien = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Không có token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ma_so: decoded.ma_so, vai_tro: decoded.vai_tro };
    next();
  } catch (err) {
    console.error('Lỗi xác thực token:', err);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

module.exports = { authenticate, authenticateSinhVien };