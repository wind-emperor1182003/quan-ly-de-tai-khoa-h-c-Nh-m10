require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { poolPromise, sql } = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const userInfoRoutes = require('./routes/user');
const nhomRoutes = require('./routes/nhom');
const sinhVienRoutes = require('./routes/sinhvien');
const dangKyGiangVienRoutes = require('./routes/dangKyGiangVien');
const giangVienRoutes = require('./routes/giangvien'); // General lecturer routes
const giangVienHDRoutes = require('./routes/giangvienHD'); // Defense council routes
const sinhVienBaoCaoRoutes = require('./routes/sinhVienBaoCao');
const giangVienBaoCaoRoutes = require('./routes/giangVienBaoCao');
const diemRouter = require('./routes/QLdiemrouter');
const dkGiangVienRouter = require('./routes/QLDKgiangvien');
const thongBaoRouter = require('./routes/QLthongbaorouter');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/test', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 AS test');
    res.json({ message: 'Connected to database', result: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed', details: err.message });
  }
});

app.use('/api', authRoutes);
app.use('/api/user', userInfoRoutes);
app.use('/api', userRoutes);
app.use('/api/nhom', nhomRoutes);
app.use('/api/sinhvien', sinhVienRoutes);
app.use('/api/dang-ky-giang-vien', dangKyGiangVienRoutes);
app.use('/api/giangvien', giangVienRoutes); // General lecturer routes
app.use('/api/giangvien/hoidong', giangVienHDRoutes); // Defense council routes
app.use('/api/sinhvien/baocao', sinhVienBaoCaoRoutes);
app.use('/api/giangvien/baocao', giangVienBaoCaoRoutes);
app.use('/api', diemRouter);
app.use('/api/dang-ky-giang-vien', dkGiangVienRouter);
app.use('/api/thong-bao', thongBaoRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});