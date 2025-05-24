const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const { vai_tro, id_nguoi_dung } = req.user;

    let query;
    if (vai_tro === 'sinh_vien') {
      query = `
        SELECT lb.id_lich, lb.thoi_gian, lb.dia_diem, d.ten_de_tai
        FROM LichBaoVe lb
        JOIN DeTai d ON lb.id_de_tai = d.id_de_tai
        WHERE d.id_sinh_vien = @id_nguoi_dung
      `;
    } else if (vai_tro === 'giang_vien') {
      query = `
        SELECT lb.id_lich, lb.thoi_gian, lb.dia_diem, d.ten_de_tai
        FROM LichBaoVe lb
        JOIN DeTai d ON lb.id_de_tai = d.id_de_tai
        WHERE d.id_giang_vien = @id_nguoi_dung
      `;
    } else if (vai_tro === 'hoi_dong') {
      query = `
        SELECT lb.id_lich, lb.thoi_gian, lb.dia_diem, d.ten_de_tai
        FROM LichBaoVe lb
        JOIN DeTai d ON lb.id_de_tai = d.id_de_tai
        WHERE lb.id_hoi_dong = @id_nguoi_dung
      `;
    } else {
      return res.status(403).json({ message: 'Vai trò không hợp lệ' });
    }

    const result = await pool.request()
      .input('id_nguoi_dung', sql.Int, id_nguoi_dung)
      .query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;