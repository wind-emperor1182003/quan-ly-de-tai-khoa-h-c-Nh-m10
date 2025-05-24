
const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['quan_ly', 'sinh_vien'].includes(decoded.vai_tro)) {
      return res.status(403).json({ message: 'Quyền truy cập bị từ chối' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
};
const checkAdmin = async (req, res, next) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý được phép truy cập' });
  }
  next();
};
// Sinh mã số tự động
router.get('/next-ma-so', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền sinh mã số' });
  }
  const { vai_tro } = req.query;
  if (!['sinh_vien', 'giang_vien', 'quan_ly'].includes(vai_tro)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }
  try {
    const prefix = vai_tro === 'sinh_vien' ? 'SV' : vai_tro === 'giang_vien' ? 'GV' : 'QL';
    const pool = await poolPromise;
    const result = await pool.request()
      .input('prefix', sql.VarChar, `${prefix}%`)
      .query(`
        SELECT MAX(CAST(SUBSTRING(ma_so, 3, LEN(ma_so)) AS INT)) AS max_number
        FROM NguoiDung
        WHERE ma_so LIKE @prefix
      `);
    const maxNumber = result.recordset[0].max_number || 0;
    const nextNumber = maxNumber + 1;
    const nextMaSo = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    res.json({ ma_so: nextMaSo });
  } catch (err) {
    console.error('Lỗi sinh mã số:', err);
    res.status(500).json({ message: 'Lỗi server khi sinh mã số', details: err.message });
  }
});

// Lấy danh sách khoa
router.get('/khoa', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem danh sách khoa' });
  }
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT ma_khoa, ten_khoa
        FROM Khoa
        WHERE ma_khoa LIKE @searchTerm OR ten_khoa LIKE @searchTerm
        ORDER BY ten_khoa
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM Khoa
        WHERE ma_khoa LIKE @searchTerm OR ten_khoa LIKE @searchTerm
      `);
    const total = countResult.recordset[0].total;
    res.json({
      khoa: result.recordset,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách khoa:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách khoa', details: err.message });
  }
});

// Thêm khoa mới
router.post('/khoa', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền thêm khoa' });
  }
  const { ma_khoa, ten_khoa } = req.body;
  if (!ma_khoa || !ten_khoa) {
    return res.status(400).json({ message: 'Thiếu mã khoa hoặc tên khoa' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .input('ten_khoa', sql.NVarChar, ten_khoa)
      .query(`
        INSERT INTO Khoa (ma_khoa, ten_khoa)
        VALUES (@ma_khoa, @ten_khoa)
      `);
    res.json({ message: 'Thêm khoa thành công', ma_khoa });
  } catch (err) {
    console.error('Lỗi thêm khoa:', err);
    if (err.number === 2627) {
      return res.status(400).json({ message: 'Mã khoa đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server khi thêm khoa', details: err.message });
  }
});

// Lấy danh sách lớp
router.get('/lop', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem danh sách lớp' });
  }
  const { page = 1, limit = 10, search = '', ma_khoa } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    let query = `
      SELECT l.ma_lop, l.ten_lop, l.ma_khoa, k.ten_khoa
      FROM Lop l
      LEFT JOIN Khoa k ON l.ma_khoa = k.ma_khoa
      WHERE (l.ma_lop LIKE @searchTerm OR l.ten_lop LIKE @searchTerm)
    `;
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Lop
      WHERE (ma_lop LIKE @searchTerm OR ten_lop LIKE @searchTerm)
    `;
    const request = pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    const countRequest = pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm);
    if (ma_khoa) {
      query += ' AND l.ma_khoa = @ma_khoa';
      countQuery += ' AND ma_khoa = @ma_khoa';
      request.input('ma_khoa', sql.VarChar, ma_khoa);
      countRequest.input('ma_khoa', sql.VarChar, ma_khoa);
    }
    query += ' ORDER BY l.ten_lop OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    const result = await request.query(query);
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    res.json({
      lop: result.recordset,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách lớp:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách lớp', details: err.message });
  }
});

// Thêm lớp mới
router.post('/lop', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền thêm lớp' });
  }
  const { ma_lop, ten_lop, ma_khoa } = req.body;
  if (!ma_lop || !ten_lop || !ma_khoa) {
    return res.status(400).json({ message: 'Thiếu mã lớp, tên lớp hoặc mã khoa' });
  }
  try {
    const pool = await poolPromise;
    // Kiểm tra ma_khoa tồn tại
    const khoaCheck = await pool.request()
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .query('SELECT COUNT(*) AS count FROM Khoa WHERE ma_khoa = @ma_khoa');
    if (khoaCheck.recordset[0].count === 0) {
      return res.status(400).json({ message: 'Mã khoa không tồn tại' });
    }
    await pool.request()
      .input('ma_lop', sql.VarChar, ma_lop)
      .input('ten_lop', sql.NVarChar, ten_lop)
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .query(`
        INSERT INTO Lop (ma_lop, ten_lop, ma_khoa)
        VALUES (@ma_lop, @ten_lop, @ma_khoa)
      `);
    res.json({ message: 'Thêm lớp thành công', ma_lop });
  } catch (err) {
    console.error('Lỗi thêm lớp:', err);
    if (err.number === 2627) {
      return res.status(400).json({ message: 'Mã lớp đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server khi thêm lớp', details: err.message });
  }
});

// Lấy danh sách bộ môn
router.get('/bo-mon', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem danh sách bộ môn' });
  }
  const { page = 1, limit = 10, search = '', ma_khoa } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    let query = `
      SELECT bm.ma_bo_mon, bm.ten_bo_mon, bm.ma_khoa, k.ten_khoa
      FROM Khoa_BoMon bm
      LEFT JOIN Khoa k ON bm.ma_khoa = k.ma_khoa
      WHERE (bm.ma_bo_mon LIKE @searchTerm OR bm.ten_bo_mon LIKE @searchTerm)
    `;
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Khoa_BoMon
      WHERE (ma_bo_mon LIKE @searchTerm OR ten_bo_mon LIKE @searchTerm)
    `;
    const request = pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    const countRequest = pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm);
    if (ma_khoa) {
      query += ' AND bm.ma_khoa = @ma_khoa';
      countQuery += ' AND ma_khoa = @ma_khoa';
      request.input('ma_khoa', sql.VarChar, ma_khoa);
      countRequest.input('ma_khoa', sql.VarChar, ma_khoa);
    }
    query += ' ORDER BY bm.ten_bo_mon OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    const result = await request.query(query);
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    res.json({
      boMon: result.recordset,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách bộ môn:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách bộ môn', details: err.message });
  }
});

// Thêm bộ môn mới
router.post('/bo-mon', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền thêm bộ môn' });
  }
  const { ma_bo_mon, ten_bo_mon, ma_khoa } = req.body;
  if (!ma_bo_mon || !ten_bo_mon || !ma_khoa) {
    return res.status(400).json({ message: 'Thiếu mã bộ môn, tên bộ môn hoặc mã khoa' });
  }
  try {
    const pool = await poolPromise;
    // Kiểm tra ma_khoa tồn tại
    const khoaCheck = await pool.request()
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .query('SELECT COUNT(*) AS count FROM Khoa WHERE ma_khoa = @ma_khoa');
    if (khoaCheck.recordset[0].count === 0) {
      return res.status(400).json({ message: 'Mã khoa không tồn tại' });
    }
    await pool.request()
      .input('ma_bo_mon', sql.VarChar, ma_bo_mon)
      .input('ten_bo_mon', sql.NVarChar, ten_bo_mon)
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .query(`
        INSERT INTO Khoa_BoMon (ma_bo_mon, ten_bo_mon, ma_khoa)
        VALUES (@ma_bo_mon, @ten_bo_mon, @ma_khoa)
      `);
    res.json({ message: 'Thêm bộ môn thành công', ma_bo_mon });
  } catch (err) {
    console.error('Lỗi thêm bộ môn:', err);
    if (err.number === 2627) {
      return res.status(400).json({ message: 'Mã bộ môn đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server khi thêm bộ môn', details: err.message });
  }
});

// Lấy danh sách người dùng
router.get('/users', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem danh sách người dùng' });
  }
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT 
          nd.ma_so, nd.ho_ten, nd.vai_tro, nd.email, nd.sdt,
          sv.ma_lop, sv.ma_khoa, l.ten_lop, k1.ten_khoa AS ten_khoa_sv,
          gv.ma_bo_mon, gv.trinh_do, bm.ten_bo_mon, k2.ten_khoa AS ten_khoa_gv,
          ql.vai_tro_quan_ly, ql.linh_vuc_quan_ly
        FROM NguoiDung nd
        LEFT JOIN SinhVien sv ON nd.ma_so = sv.ma_so
        LEFT JOIN Lop l ON sv.ma_lop = l.ma_lop
        LEFT JOIN Khoa k1 ON sv.ma_khoa = k1.ma_khoa
        LEFT JOIN GiangVien gv ON nd.ma_so = gv.ma_so
        LEFT JOIN Khoa_BoMon bm ON gv.ma_bo_mon = bm.ma_bo_mon
        LEFT JOIN Khoa k2 ON gv.ma_khoa = k2.ma_khoa
        LEFT JOIN QuanLy ql ON nd.ma_so = ql.ma_so
        WHERE nd.ma_so LIKE @searchTerm OR nd.ho_ten LIKE @searchTerm
        ORDER BY nd.ma_so
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const users = result.recordset.map(user => ({
      ...user,
      ten_khoa: user.vai_tro === 'sinh_vien' ? user.ten_khoa_sv : user.vai_tro === 'giang_vien' ? user.ten_khoa_gv : null
    }));
    const countResult = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM NguoiDung
        WHERE ma_so LIKE @searchTerm OR ho_ten LIKE @searchTerm
      `);
    const totalUsers = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalUsers / limit);
    res.json({ users, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách người dùng:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Thêm người dùng
router.post('/users', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền thêm người dùng' });
  }
  const { mat_khau, ho_ten, vai_tro, email, sdt, ma_lop, ma_khoa, ma_bo_mon, trinh_do, vai_tro_quan_ly, linh_vuc_quan_ly } = req.body;
  if (!mat_khau || !ho_ten || !vai_tro) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (mật khẩu, họ tên, vai trò)' });
  }
  if (vai_tro === 'sinh_vien' && (!ma_khoa || !ma_lop)) {
    return res.status(400).json({ message: 'Sinh viên phải có mã khoa và mã lớp' });
  }
  if (vai_tro === 'giang_vien' && (!ma_khoa || !ma_bo_mon)) {
    return res.status(400).json({ message: 'Giảng viên phải có mã khoa và mã bộ môn' });
  }
  try {
    const prefix = vai_tro === 'sinh_vien' ? 'SV' : vai_tro === 'giang_vien' ? 'GV' : 'QL';
    const pool = await poolPromise;
    const result = await pool.request()
      .input('prefix', sql.VarChar, `${prefix}%`)
      .query(`
        SELECT MAX(CAST(SUBSTRING(ma_so, 3, LEN(ma_so)) AS INT)) AS max_number
        FROM NguoiDung
        WHERE ma_so LIKE @prefix
      `);
    const maxNumber = result.recordset[0].max_number || 0;
    const nextNumber = maxNumber + 1;
    const ma_so = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .input('mat_khau', sql.VarChar, mat_khau)
      .input('ho_ten', sql.NVarChar, ho_ten)
      .input('vai_tro', sql.VarChar, vai_tro)
      .input('email', sql.VarChar, email || null)
      .input('sdt', sql.VarChar, sdt || null)
      .query(`
        INSERT INTO NguoiDung (ma_so, mat_khau, ho_ten, vai_tro, email, sdt)
        VALUES (@ma_so, @mat_khau, @ho_ten, @vai_tro, @email, @sdt)
      `);
    if (vai_tro === 'sinh_vien') {
      await pool.request()
        .input('ma_so', sql.VarChar, ma_so)
        .input('ma_lop', sql.VarChar, ma_lop || null)
        .input('ma_khoa', sql.VarChar, ma_khoa || null)
        .query(`
          INSERT INTO SinhVien (ma_so, ma_lop, ma_khoa)
          VALUES (@ma_so, @ma_lop, @ma_khoa)
        `);
    } else if (vai_tro === 'giang_vien') {
      await pool.request()
        .input('ma_so', sql.VarChar, ma_so)
        .input('ma_bo_mon', sql.VarChar, ma_bo_mon || null)
        .input('ma_khoa', sql.VarChar, ma_khoa || null)
        .input('trinh_do', sql.NVarChar, trinh_do || null)
        .query(`
          INSERT INTO GiangVien (ma_so, ma_bo_mon, ma_khoa, trinh_do)
          VALUES (@ma_so, @ma_bo_mon, @ma_khoa, @trinh_do)
        `);
    } else if (vai_tro === 'quan_ly') {
      await pool.request()
        .input('ma_so', sql.VarChar, ma_so)
        .input('vai_tro_quan_ly', sql.NVarChar, vai_tro_quan_ly || null)
        .input('linh_vuc_quan_ly', sql.NVarChar, linh_vuc_quan_ly || null)
        .query(`
          INSERT INTO QuanLy (ma_so, vai_tro_quan_ly, linh_vuc_quan_ly)
          VALUES (@ma_so, @vai_tro_quan_ly, @linh_vuc_quan_ly)
        `);
    }
    res.json({ message: 'Thêm người dùng thành công', ma_so });
  } catch (err) {
    console.error('Lỗi thêm người dùng:', err);
    res.status(500).json({ message: err.number === 2627 ? 'Mã số đã tồn tại' : 'Lỗi server', details: err.message });
  }
});

// Cập nhật người dùng
router.put('/users/:ma_so', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền cập nhật người dùng' });
  }
  const { ma_so } = req.params;
  const { ho_ten, email, sdt } = req.body;
  if (!ho_ten) {
    return res.status(400).json({ message: 'Thiếu họ tên' });
  }
  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .input('ho_ten', sql.NVarChar, ho_ten)
      .input('email', sql.VarChar, email || null)
      .input('sdt', sql.VarChar, sdt || null);
    await request.query(`
      UPDATE NguoiDung
      SET ho_ten = @ho_ten, email = @email, sdt = @sdt
      WHERE ma_so = @ma_so
    `);
    const result = await request.query(`
      SELECT COUNT(*) AS count FROM NguoiDung WHERE ma_so = @ma_so
    `);
    if (result.recordset[0].count === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json({ message: 'Cập nhật người dùng thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật người dùng:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Xóa người dùng
router.delete('/users/:ma_so', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xóa người dùng' });
  }
  const { ma_so } = req.params;
  try {
    const pool = await poolPromise;
    // Kiểm tra ràng buộc trưởng nhóm
    const check = await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('SELECT COUNT(*) as count FROM NhomSinhVien WHERE ma_so_nhom_truong = @ma_so');
    if (check.recordset[0].count > 0) {
      return res.status(400).json({ message: 'Không thể xóa: Người dùng là trưởng nhóm' });
    }
    // Xóa các bản ghi liên quan
    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('DELETE FROM BaoCaoTienDo WHERE ma_so_sinh_vien = @ma_so');
    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('DELETE FROM SinhVien WHERE ma_so = @ma_so');
    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('DELETE FROM GiangVien WHERE ma_so = @ma_so');
    await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('DELETE FROM QuanLy WHERE ma_so = @ma_so');
    const result = await pool.request()
      .input('ma_so', sql.VarChar, ma_so)
      .query('DELETE FROM NguoiDung WHERE ma_so = @ma_so');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json({ message: 'Xóa người dùng thành công' });
  } catch (err) {
    console.error('Lỗi xóa người dùng:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Get all lịch bảo vệ
router.get('/lich-bao-ve', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ma_khoa } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT lb.ma_lich, lb.ma_de_tai, lb.dia_diem, lb.thoi_gian, lb.trang_thai, dt.ten_de_tai, k.ten_khoa
      FROM LichBaoVe lb
      JOIN DeTai dt ON lb.ma_de_tai = dt.ma_de_tai
      JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
      JOIN GiangVien gv ON dt.ma_so_giang_vien = gv.ma_so
      JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      WHERE dt.ten_de_tai LIKE @search
    `;
    const params = [
      { name: 'search', value: `%${search}%`, type: sql.NVarChar },
      { name: 'limit', value: parseInt(limit), type: sql.Int },
      { name: 'offset', value: offset, type: sql.Int },
    ];

    if (ma_khoa && req.user.vai_tro === 'quan_ly') {
      query += ' AND gv.ma_khoa = @ma_khoa';
      params.push({ name: 'ma_khoa', value: ma_khoa, type: sql.VarChar });
    } else if (req.user.vai_tro === 'sinh_vien') {
      query += ' AND ns.ma_so_nhom_truong = @ma_so';
      params.push({ name: 'ma_so', value: req.user.ma_so, type: sql.VarChar });
    }

    query += ' ORDER BY lb.thoi_gian DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    const pool = await poolPromise;
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    const result = await request.query(query);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM LichBaoVe lb
      JOIN DeTai dt ON lb.ma_de_tai = dt.ma_de_tai
      JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
      JOIN GiangVien gv ON dt.ma_so_giang_vien = gv.ma_so
      JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      WHERE dt.ten_de_tai LIKE @search
      ${ma_khoa && req.user.vai_tro === 'quan_ly' ? 'AND gv.ma_khoa = @ma_khoa' : req.user.vai_tro === 'sinh_vien' ? 'AND ns.ma_so_nhom_truong = @ma_so' : ''}
    `;
    const countRequest = pool.request();
    params.filter(p => p.name !== 'limit' && p.name !== 'offset').forEach(param => countRequest.input(param.name, param.type, param.value));
    const countResult = await countRequest.query(countQuery);

    res.json({
      lichBaoVe: result.recordset,
      totalPages: Math.ceil(countResult.recordset[0].total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách lịch bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Add new lịch bảo vệ
router.post('/lich-bao-ve', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền thêm lịch bảo vệ' });
  }

  const { ma_de_tai, dia_diem, thoi_gian, trang_thai, hoi_dong } = req.body;

  if (!ma_de_tai || !dia_diem || !thoi_gian || !trang_thai || !hoi_dong || !Array.isArray(hoi_dong)) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc hoặc hội đồng không hợp lệ' });
  }

  try {
    const pool = await poolPromise;
    const transaction = pool.transaction();

    await transaction.begin();

    // Kiểm tra ma_de_tai tồn tại
    const deTaiCheck = await transaction.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .query('SELECT COUNT(*) AS count FROM DeTai WHERE ma_de_tai = @ma_de_tai');
    if (deTaiCheck.recordset[0].count === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Mã đề tài không tồn tại' });
    }

    // Kiểm tra ma_giang_vien trong hoi_dong
    for (const member of hoi_dong) {
      const { ma_giang_vien, vai_tro_hoi_dong } = member;
      if (!ma_giang_vien || !vai_tro_hoi_dong) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Thiếu mã giảng viên hoặc vai trò hội đồng' });
      }
      const giangVienCheck = await transaction.request()
        .input('ma_giang_vien', sql.VarChar, ma_giang_vien)
        .query('SELECT COUNT(*) AS count FROM GiangVien WHERE ma_so = @ma_giang_vien');
      if (giangVienCheck.recordset[0].count === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: `Mã giảng viên ${ma_giang_vien} không tồn tại` });
      }
    }

    // Thêm lịch bảo vệ
    const lichResult = await transaction.request()
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('dia_diem', sql.NVarChar, dia_diem)
      .input('thoi_gian', sql.DateTime, thoi_gian)
      .input('trang_thai', sql.NVarChar, trang_thai)
      .query(`
        INSERT INTO LichBaoVe (ma_de_tai, dia_diem, thoi_gian, trang_thai)
        OUTPUT INSERTED.ma_lich
        VALUES (@ma_de_tai, @dia_diem, @thoi_gian, @trang_thai)
      `);

    const ma_lich = lichResult.recordset[0].ma_lich;

    // Thêm hội đồng bảo vệ
    for (const member of hoi_dong) {
      const { ma_giang_vien, vai_tro_hoi_dong } = member;
      await transaction.request()
        .input('ma_lich', sql.Int, ma_lich)
        .input('ma_giang_vien', sql.VarChar, ma_giang_vien)
        .input('vai_tro_hoi_dong', sql.NVarChar, vai_tro_hoi_dong)
        .query(`
          INSERT INTO HoiDongBaoVe (ma_lich, ma_giang_vien, vai_tro_hoi_dong)
          VALUES (@ma_lich, @ma_giang_vien, @vai_tro_hoi_dong)
        `);
    }

    await transaction.commit();
    res.json({ message: 'Thêm lịch bảo vệ thành công', ma_lich });
  } catch (err) {
    console.error('Lỗi thêm lịch bảo vệ:', err);
    try { await transaction.rollback(); } catch (rollbackErr) {
      console.error('Lỗi rollback:', rollbackErr);
    }
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Get hội đồng bảo vệ for a lịch bảo vệ
router.get('/lich-bao-ve/:ma_lich/hoi-dong', authenticateToken, async (req, res) => {
  const { ma_lich } = req.params;

  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('ma_lich', sql.Int, parseInt(ma_lich));

    // Kiểm tra ma_lich tồn tại
    const lichCheck = await request.query('SELECT COUNT(*) AS count FROM LichBaoVe WHERE ma_lich = @ma_lich');
    if (lichCheck.recordset[0].count === 0) {
      return res.status(404).json({ message: 'Lịch bảo vệ không tồn tại' });
    }

    const result = await request.query(`
      SELECT hdb.ma_giang_vien, nd.ho_ten, hdb.vai_tro_hoi_dong, gv.trinh_do, k.ten_khoa, bm.ten_bo_mon
      FROM HoiDongBaoVe hdb
      JOIN GiangVien gv ON hdb.ma_giang_vien = gv.ma_so
      JOIN NguoiDung nd ON gv.ma_so = nd.ma_so
      LEFT JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      LEFT JOIN Khoa_BoMon bm ON gv.ma_bo_mon = bm.ma_bo_mon
      WHERE hdb.ma_lich = @ma_lich
      ORDER BY hdb.vai_tro_hoi_dong
    `);

    res.json({
      hoiDong: result.recordset,
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách hội đồng bảo vệ:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Update lịch bảo vệ
router.put('/lich-bao-ve/:ma_lich', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền sửa lịch bảo vệ' });
  }

  const { ma_lich } = req.params;
  const { ma_de_tai, dia_diem, thoi_gian, trang_thai, hoi_dong } = req.body;

  if (!ma_de_tai || !dia_diem || !thoi_gian || !trang_thai || !hoi_dong || !Array.isArray(hoi_dong)) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc hoặc hội đồng không hợp lệ' });
  }

  try {
    const pool = await poolPromise;
    const transaction = pool.transaction();

    await transaction.begin();

    const request = transaction.request()
      .input('ma_lich', sql.Int, parseInt(ma_lich));

    // Kiểm tra ma_lich tồn tại
    const lichCheck = await request.query('SELECT COUNT(*) AS count FROM LichBaoVe WHERE ma_lich = @ma_lich');
    if (lichCheck.recordset[0].count === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lịch bảo vệ không tồn tại' });
    }

    // Kiểm tra ma_de_tai tồn tại
    await request.input('ma_de_tai', sql.VarChar, ma_de_tai);
    const deTaiCheck = await request.query('SELECT COUNT(*) AS count FROM DeTai WHERE ma_de_tai = @ma_de_tai');
    if (deTaiCheck.recordset[0].count === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Mã đề tài không tồn tại' });
    }

    // Kiểm tra ma_giang_vien trong hoi_dong
    for (const member of hoi_dong) {
      const { ma_giang_vien, vai_tro_hoi_dong } = member;
      if (!ma_giang_vien || !vai_tro_hoi_dong) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Thiếu mã giảng viên hoặc vai trò hội đồng' });
      }
      const giangVienCheck = await transaction.request()
        .input('ma_giang_vien', sql.VarChar, ma_giang_vien)
        .query('SELECT COUNT(*) AS count FROM GiangVien WHERE ma_so = @ma_giang_vien');
      if (giangVienCheck.recordset[0].count === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: `Mã giảng viên ${ma_giang_vien} không tồn tại` });
      }
    }

    // Cập nhật LichBaoVe
    await request
      .input('dia_diem', sql.NVarChar, dia_diem)
      .input('thoi_gian', sql.DateTime, thoi_gian)
      .input('trang_thai', sql.NVarChar, trang_thai)
      .query(`
        UPDATE LichBaoVe
        SET ma_de_tai = @ma_de_tai, dia_diem = @dia_diem, thoi_gian = @thoi_gian, trang_thai = @trang_thai
        WHERE ma_lich = @ma_lich
      `);

    // Xóa hội đồng cũ
    await request.query('DELETE FROM HoiDongBaoVe WHERE ma_lich = @ma_lich');

    // Thêm hội đồng mới
    for (const member of hoi_dong) {
      const { ma_giang_vien, vai_tro_hoi_dong } = member;
      await transaction.request()
        .input('ma_lich', sql.Int, parseInt(ma_lich))
        .input('ma_giang_vien', sql.VarChar, ma_giang_vien)
        .input('vai_tro_hoi_dong', sql.NVarChar, vai_tro_hoi_dong)
        .query(`
          INSERT INTO HoiDongBaoVe (ma_lich, ma_giang_vien, vai_tro_hoi_dong)
          VALUES (@ma_lich, @ma_giang_vien, @vai_tro_hoi_dong)
        `);
    }

    await transaction.commit();
    res.json({ message: 'Cập nhật lịch bảo vệ thành công', ma_lich });
  } catch (err) {
    console.error('Lỗi cập nhật lịch bảo vệ:', err);
    try { await transaction.rollback(); } catch (rollbackErr) {
      console.error('Lỗi rollback:', rollbackErr);
    }
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Delete lịch bảo vệ
router.delete('/lich-bao-ve/:ma_lich', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xóa lịch bảo vệ' });
  }

  const { ma_lich } = req.params;

  try {
    const pool = await poolPromise;
    const transaction = pool.transaction();
    await transaction.begin();

    const request = transaction.request()
      .input('ma_lich', sql.Int, parseInt(ma_lich));

    // Kiểm tra ma_lich tồn tại
    const lichCheck = await request.query('SELECT COUNT(*) AS count FROM LichBaoVe WHERE ma_lich = @ma_lich');
    if (lichCheck.recordset[0].count === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lịch bảo vệ không tồn tại' });
    }

    // Xóa các bản ghi liên quan trong HoiDongBaoVe
    await request.query('DELETE FROM HoiDongBaoVe WHERE ma_lich = @ma_lich');

    // Xóa LichBaoVe
    await request.query('DELETE FROM LichBaoVe WHERE ma_lich = @ma_lich');

    await transaction.commit();
    res.json({ message: 'Xóa lịch bảo vệ thành công' });
  } catch (err) {
    console.error('Lỗi xóa lịch bảo vệ:', err);
    try { await transaction.rollback(); } catch (rollbackErr) {
      console.error('Lỗi rollback:', rollbackErr);
    }
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Get all giảng viên
router.get('/giang-vien', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ma_khoa } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT gv.ma_so, nd.ho_ten, gv.trinh_do, gv.ma_khoa, k.ten_khoa, gv.ma_bo_mon, bm.ten_bo_mon
      FROM GiangVien gv
      JOIN NguoiDung nd ON gv.ma_so = nd.ma_so
      LEFT JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      LEFT JOIN Khoa_BoMon bm ON gv.ma_bo_mon = bm.ma_bo_mon
      WHERE nd.ho_ten LIKE @search OR gv.ma_so LIKE @search
    `;
    const params = [
      { name: 'search', value: `%${search}%`, type: sql.NVarChar },
      { name: 'limit', value: parseInt(limit), type: sql.Int },
      { name: 'offset', value: offset, type: sql.Int },
    ];

    if (ma_khoa && req.user.vai_tro === 'quan_ly') {
      query += ' AND gv.ma_khoa = @ma_khoa';
      params.push({ name: 'ma_khoa', value: ma_khoa, type: sql.VarChar });
    }

    query += ' ORDER BY nd.ho_ten ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    const pool = await poolPromise;
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    const result = await request.query(query);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM GiangVien gv
      JOIN NguoiDung nd ON gv.ma_so = nd.ma_so
      WHERE nd.ho_ten LIKE @search OR gv.ma_so LIKE @search
      ${ma_khoa && req.user.vai_tro === 'quan_ly' ? 'AND gv.ma_khoa = @ma_khoa' : ''}
    `;
    const countRequest = pool.request();
    params.filter(p => p.name !== 'limit' && p.name !== 'offset').forEach(param => countRequest.input(param.name, param.type, param.value));
    const countResult = await countRequest.query(countQuery);

    res.json({
      giangVien: result.recordset,
      totalPages: Math.ceil(countResult.recordset[0].total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách giảng viên:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// Get all đề tài
router.get('/de-tai', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ma_khoa } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT dt.ma_de_tai, dt.ten_de_tai, dt.mo_ta, dt.trang_thai, dt.ngay_tao,
             ns.ten_nhom, k.ten_khoa, nd.ho_ten AS ho_ten_giang_vien
      FROM DeTai dt
      JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
      LEFT JOIN GiangVien gv ON dt.ma_so_giang_vien = gv.ma_so
      LEFT JOIN NguoiDung nd ON dt.ma_so_giang_vien = nd.ma_so
      LEFT JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      WHERE dt.ten_de_tai LIKE @search
    `;
    const params = [
      { name: 'search', value: `%${search}%`, type: sql.NVarChar },
      { name: 'limit', value: parseInt(limit), type: sql.Int },
      { name: 'offset', value: offset, type: sql.Int },
    ];

    if (ma_khoa && req.user.vai_tro === 'quan_ly') {
      query += ' AND gv.ma_khoa = @ma_khoa';
      params.push({ name: 'ma_khoa', value: ma_khoa, type: sql.VarChar });
    } else if (req.user.vai_tro === 'sinh_vien') {
      query += ' AND ns.ma_so_nhom_truong = @ma_so';
      params.push({ name: 'ma_so', value: req.user.ma_so, type: sql.VarChar });
    }

    query += ' ORDER BY dt.ngay_tao DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    const pool = await poolPromise;
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    const result = await request.query(query);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM DeTai dt
      JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
      LEFT JOIN GiangVien gv ON dt.ma_so_giang_vien = gv.ma_so
      LEFT JOIN NguoiDung nd ON dt.ma_so_giang_vien = nd.ma_so
      LEFT JOIN Khoa k ON gv.ma_khoa = k.ma_khoa
      WHERE dt.ten_de_tai LIKE @search
      ${ma_khoa && req.user.vai_tro === 'quan_ly' ? 'AND gv.ma_khoa = @ma_khoa' : req.user.vai_tro === 'sinh_vien' ? 'AND ns.ma_so_nhom_truong = @ma_so' : ''}
    `;
    const countRequest = pool.request();
    params.filter(p => p.name !== 'limit' && p.name !== 'offset').forEach(param => countRequest.input(param.name, param.type, param.value));
    const countResult = await countRequest.query(countQuery);

    res.json({
      deTai: result.recordset,
      totalPages: Math.ceil(countResult.recordset[0].total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// GET lịch bảo vệ ở nhóm
router.get('/lich-bao-ve/nhom', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request().input('ma_so', sql.VarChar, req.user.ma_so);
    const result = await request.query(`
      SELECT lb.ma_lich, lb.ma_de_tai, dt.ten_de_tai, lb.dia_diem, lb.thoi_gian, lb.trang_thai
      FROM LichBaoVe lb
      JOIN DeTai dt ON lb.ma_de_tai = dt.ma_de_tai
      JOIN NhomSinhVien nsv ON dt.ma_nhom = nsv.ma_nhom
      JOIN ThanhVienNhom tvn ON nsv.ma_nhom = tvn.ma_nhom
      WHERE tvn.ma_so_sinh_vien = @ma_so
    `);
    res.json({ lichBaoVe: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy lịch bảo vệ nhóm:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});

// --- Thêm các endpoint cho QLbaocao.js ---

// Lấy danh sách báo cáo tiến độ
router.get('/admin/reports', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem báo cáo' });
  }
  const { page = 1, limit = 10, search = '', trang_thai = '', trang_thai_duyet = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('trang_thai', sql.NVarChar, trang_thai || '%')
      .input('trang_thai_duyet', sql.NVarChar, trang_thai_duyet || '%')
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
            bct.ma_bao_cao, 
            bct.ma_de_tai, 
            dt.ten_de_tai, 
            bct.ma_nhom, 
            ns.ten_nhom, 
            bct.ky_bao_cao, 
            bct.han_nop, 
            bct.trang_thai, 
            bct.trang_thai_duyet, 
            bct.diem_tien_do, 
            bct.tep_dinh_kem
        FROM BaoCaoTienDo bct
        LEFT JOIN DeTai dt ON bct.ma_de_tai = dt.ma_de_tai
        LEFT JOIN NhomSinhVien ns ON bct.ma_nhom = ns.ma_nhom
        WHERE (bct.ma_bao_cao LIKE @search 
           OR dt.ten_de_tai LIKE @search 
           OR ns.ten_nhom LIKE @search)
           AND bct.trang_thai LIKE @trang_thai
           AND bct.trang_thai_duyet LIKE @trang_thai_duyet
        ORDER BY bct.ma_bao_cao
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('trang_thai', sql.NVarChar, trang_thai || '%')
      .input('trang_thai_duyet', sql.NVarChar, trang_thai_duyet || '%')
      .query(`
        SELECT COUNT(*) as total 
        FROM BaoCaoTienDo bct
        LEFT JOIN DeTai dt ON bct.ma_de_tai = dt.ma_de_tai
        LEFT JOIN NhomSinhVien ns ON bct.ma_nhom = ns.ma_nhom
        WHERE (bct.ma_bao_cao LIKE @search 
           OR dt.ten_de_tai LIKE @search 
           OR ns.ten_nhom LIKE @search)
           AND bct.trang_thai LIKE @trang_thai
           AND bct.trang_thai_duyet LIKE @trang_thai_duyet
      `);
    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ reports: result.recordset, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy báo cáo', details: err.message });
  }
});

// Lấy danh sách đề tài
router.get('/admin/reports/detai', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem danh sách đề tài' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT dt.ma_de_tai, dt.ten_de_tai, ns.ten_nhom
      FROM DeTai dt
      LEFT JOIN NhomSinhVien ns ON dt.ma_nhom = ns.ma_nhom
      WHERE dt.trang_thai IN ('da_duyet', 'dang_thuc_hien')
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài', details: err.message });
  }
});

// Tạo kỳ báo cáo mới
router.post('/admin/reports', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền tạo báo cáo' });
  }
  const { ma_de_tai, ky_bao_cao, han_nop } = req.body;
  if (!ma_de_tai || !ky_bao_cao || !han_nop) {
    return res.status(400).json({ message: 'Thiếu mã đề tài, kỳ hoặc hạn nộp' });
  }
  try {
    const pool = await poolPromise;
    const ma_bao_cao = `BC${Date.now()}`;
    const result = await pool.request()
      .input('ma_bao_cao', sql.NVarChar, ma_bao_cao)
      .input('ma_de_tai', sql.VarChar, ma_de_tai)
      .input('ky_bao_cao', sql.Int, ky_bao_cao)
      .input('han_nop', sql.Date, han_nop)
      .input('ma_nhom', sql.NVarChar, req.body.ma_nhom || null)
      .query(`
        INSERT INTO BaoCaoTienDo (ma_bao_cao, ma_de_tai, ma_nhom, ky_bao_cao, han_nop, trang_thai, trang_thai_duyet, tre_han, so_lan_chinh_sua)
        VALUES (@ma_bao_cao, @ma_de_tai, @ma_nhom, @ky_bao_cao, @han_nop, 'chua_nop', 'cho_duyet', 0, 0)
        SELECT SCOPE_IDENTITY() AS ma_bao_cao
      `);
    res.json({ message: 'Tạo kỳ báo cáo thành công', ma_bao_cao });
  } catch (err) {
    console.error('Lỗi tạo kỳ báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo báo cáo', details: err.message });
  }
});

// Sửa kỳ báo cáo
router.put('/admin/reports/:ma_bao_cao', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền cập nhật báo cáo' });
  }
  const { ma_bao_cao } = req.params;
  const { trang_thai_duyet, diem_tien_do, ly_do } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar, ma_bao_cao)
      .input('trang_thai_duyet', sql.NVarChar, trang_thai_duyet)
      .input('diem_tien_do', sql.Int, diem_tien_do || null)
      .input('ly_do', sql.NVarChar, ly_do || null)
      .query(`
        UPDATE BaoCaoTienDo
        SET trang_thai_duyet = @trang_thai_duyet, 
            diem_tien_do = @diem_tien_do, 
            nhan_xet = @ly_do
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    res.json({ message: 'Cập nhật báo cáo thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật báo cáo', details: err.message });
  }
});

// Xóa kỳ báo cáo
router.delete('/admin/reports/:ma_bao_cao', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xóa báo cáo' });
  }
  const { ma_bao_cao } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_bao_cao', sql.NVarChar, ma_bao_cao)
      .query(`
        DELETE FROM BaoCaoTienDo
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo với mã số này' });
    }
    res.json({ message: 'Xóa kỳ báo cáo thành công' });
  } catch (err) {
    console.error('Lỗi xóa kỳ báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa báo cáo', details: err.message });
  }
});

// Duyệt báo cáo
router.patch('/admin/reports/:ma_bao_cao/approve', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền duyệt báo cáo' });
  }
  const { ma_bao_cao } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar, ma_bao_cao)
      .query(`
        UPDATE BaoCaoTienDo
        SET trang_thai_duyet = 'da_duyet'
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    res.json({ message: 'Duyệt báo cáo thành công' });
  } catch (err) {
    console.error('Lỗi duyệt báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi duyệt báo cáo', details: err.message });
  }
});

// Yêu cầu thay thế tệp
router.post('/admin/reports/:ma_bao_cao/request-replace', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền yêu cầu thay thế tệp' });
  }
  const { ma_bao_cao } = req.params;
  const { ly_do } = req.body;
  if (!ly_do) {
    return res.status(400).json({ message: 'Thiếu lý do yêu cầu' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar, ma_bao_cao)
      .input('ly_do', sql.NVarChar, ly_do)
      .query(`
        UPDATE BaoCaoTienDo
        SET trang_thai = 'chua_nop', nhan_xet = @ly_do, so_lan_chinh_sua = so_lan_chinh_sua + 1
        WHERE ma_bao_cao = @ma_bao_cao
        IF @@ROWCOUNT = 0
          THROW 50001, 'Không tìm thấy báo cáo với mã số này', 1
      `);
    res.json({ message: 'Yêu cầu thay thế tệp thành công' });
  } catch (err) {
    console.error('Lỗi yêu cầu thay thế tệp:', err);
    res.status(500).json({ message: 'Lỗi server khi yêu cầu thay thế', details: err.message });
  }
});

// Gửi thông báo trễ hạn
router.post('/admin/reports/late-notifications', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền gửi thông báo trễ hạn' });
  }
  const { noi_dung } = req.body;
  if (!noi_dung) {
    return res.status(400).json({ message: 'Thiếu nội dung thông báo' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('noi_dung', sql.NVarChar, noi_dung)
      .query('EXEC sp_GuiThongBaoTreHan @noi_dung');
    res.json({ message: 'Gửi thông báo trễ hạn thành công' });
  } catch (err) {
    console.error('Lỗi gửi thông báo trễ hạn:', err);
    res.status(500).json({ message: 'Lỗi server khi gửi thông báo', details: err.message });
  }
});

// Lấy thống kê báo cáo
router.get('/admin/reports/statistics', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền xem thống kê' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('EXEC sp_ThongKeBaoCao');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Lỗi lấy thống kê báo cáo:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy thống kê', details: err.message });
  }
});

// Tải tệp báo cáo
router.get('/admin/reports/file/:filename', authenticateToken, async (req, res) => {
  if (req.user.vai_tro !== 'quan_ly') {
    return res.status(403).json({ message: 'Chỉ quản lý có quyền tải tệp' });
  }
  const { filename } = req.params;
  const path = require('path');
  const filePath = path.join(__dirname, '..', 'Uploads', filename);
  try {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Lỗi tải tệp:', err);
        res.status(404).json({ message: 'Tệp không tồn tại' });
      }
    });
  } catch (err) {
    console.error('Lỗi tải tệp:', err);
    res.status(500).json({ message: 'Lỗi server khi tải tệp', details: err.message });
  }
});
// lấy nhóm và đề tài
// Route: GET /api/users
// Mục đích: Lấy danh sách người dùng theo vai trò (dùng để lấy danh sách sinh viên cho dropdown)
router.get('/users', authenticateToken, checkAdmin, async (req, res) => {
  const { vai_tro } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('vai_tro', sql.VarChar, vai_tro)
      .query(`
        SELECT ma_so, ho_ten, vai_tro
        FROM NguoiDung
        WHERE vai_tro = @vai_tro
      `);
    res.json({ users: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy danh sách người dùng:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng', details: err.message });
  }
});

// Route: GET /next-ma-so
// Mục đích: Tạo mã số người dùng mới (ma_so) cho vai trò cụ thể (sinh_vien, giang_vien, quan_ly)
router.get('/next-ma-so', authenticateToken, checkAdmin, async (req, res) => {
  const { vai_tro } = req.query;
  if (!['sinh_vien', 'giang_vien', 'quan_ly'].includes(vai_tro)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }
  try {
    const prefix = vai_tro === 'sinh_vien' ? 'SV' : vai_tro === 'giang_vien' ? 'GV' : 'QL';
    const pool = await poolPromise;
    const result = await pool.request()
      .input('prefix', sql.VarChar, `${prefix}%`)
      .query(`
        SELECT MAX(CAST(SUBSTRING(ma_so, 3, LEN(ma_so)) AS INT)) AS max_number
        FROM NguoiDung
        WHERE ma_so LIKE @prefix
      `);
    const maxNumber = result.recordset[0].max_number || 0;
    const nextMaSo = `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`; // Sửa lỗi: thay nextNumber bằng maxNumber + 1
    res.json({ ma_so: nextMaSo });
  } catch (err) {
    console.error('Lỗi sinh mã số:', err);
    res.status(500).json({ message: 'Lỗi server khi sinh mã số', details: err.message });
  }
});

// Route: GET /nhom
// Mục đích: Lấy danh sách nhóm sinh viên với phân trang và bộ lọc tìm kiếm/trạng thái
router.get('/nhom', authenticateToken, checkAdmin, async (req, res) => {
  const { page = 1, limit = 10, search = '', trang_thai = '' } = req.query;
  try {
    const pool = await poolPromise;
    const offset = (page - 1) * limit;
    let query = `
      SELECT n.ma_nhom, n.ten_nhom, n.ma_so_nhom_truong, nd.ho_ten AS ten_nhom_truong, 
             n.ngay_tao, n.trang_thai_nhom, dt.ten_de_tai, 
             COUNT(tvn.ma_so_sinh_vien) AS so_thanh_vien
      FROM NhomSinhVien n
      JOIN NguoiDung nd ON n.ma_so_nhom_truong = nd.ma_so
      LEFT JOIN ThanhVienNhom tvn ON n.ma_nhom = tvn.ma_nhom
      LEFT JOIN DeTai dt ON n.ma_nhom = dt.ma_nhom
      WHERE (n.ma_nhom LIKE @search OR n.ten_nhom LIKE @search)
    `;
    if (trang_thai) {
      query += ` AND n.trang_thai_nhom = @trang_thai`;
    }
    query += `
      GROUP BY n.ma_nhom, n.ten_nhom, n.ma_so_nhom_truong, nd.ho_ten, n.ngay_tao, n.trang_thai_nhom, dt.ten_de_tai
      ORDER BY n.ma_nhom
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      
      SELECT COUNT(*) AS total 
      FROM NhomSinhVien n
      WHERE (n.ma_nhom LIKE @search OR n.ten_nhom LIKE @search)
    `;
    if (trang_thai) {
      query += ` AND n.trang_thai_nhom = @trang_thai`;
    }

    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('trang_thai', sql.VarChar, trang_thai)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, parseInt(limit))
      .query(query);

    const groups = result.recordsets[0];
    const total = result.recordsets[1][0].total;
    res.json({
      groups,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhóm', details: err.message });
  }
});

// Route: GET /nhom/next-ma-nhom
// Mục đích: Tạo mã nhóm mới (ma_nhom)
router.get('/nhom/next-ma-nhom', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 'NHOM' + RIGHT('000' + CAST((ISNULL(MAX(CAST(RIGHT(ma_nhom, 3) AS INT)), 0) + 1) AS VARCHAR(3)), 3)
      FROM NhomSinhVien
    `);
    res.json({ ma_nhom: result.recordset[0][''] });
  } catch (err) {
    console.error('Lỗi tạo mã nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo mã nhóm', details: err.message });
  }
});

// Route: POST /nhom
// Mục đích: Tạo nhóm sinh viên mới và thêm nhóm trưởng vào danh sách thành viên
router.post('/nhom', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { ma_nhom, ten_nhom, ma_so_nhom_truong, ngay_tao } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ten_nhom', sql.NVarChar, ten_nhom)
      .input('ma_so_nhom_truong', sql.VarChar, ma_so_nhom_truong)
      .input('ngay_tao', sql.Date, ngay_tao)
      .input('trang_thai_nhom', sql.VarChar, 'dang_tao')
      .query(`
        INSERT INTO NhomSinhVien (ma_nhom, ten_nhom, ma_so_nhom_truong, ngay_tao, trang_thai_nhom)
        VALUES (@ma_nhom, @ten_nhom, @ma_so_nhom_truong, @ngay_tao, @trang_thai_nhom);
        INSERT INTO ThanhVienNhom (ma_nhom, ma_so_sinh_vien, ngay_tham_gia, chuc_vu)
        VALUES (@ma_nhom, @ma_so_nhom_truong, @ngay_tao, 'Nhóm trưởng');
      `);
    res.status(201).json({ message: 'Thêm nhóm thành công', ma_nhom });
  } catch (err) {
    console.error('Lỗi thêm nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm nhóm', details: err.message });
  }
});

// Route: PUT /nhom/:ma_nhom
// Mục đích: Cập nhật thông tin nhóm và vai trò nhóm trưởng
router.put('/nhom/:ma_nhom', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { ma_nhom } = req.params;
    const { ten_nhom, ma_so_nhom_truong, trang_thai_nhom } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ten_nhom', sql.NVarChar, ten_nhom)
      .input('ma_so_nhom_truong', sql.VarChar, ma_so_nhom_truong)
      .input('trang_thai_nhom', sql.VarChar, trang_thai_nhom)
      .query(`
        UPDATE NhomSinhVien
        SET ten_nhom = @ten_nhom, ma_so_nhom_truong = @ma_so_nhom_truong, trang_thai_nhom = @trang_thai_nhom
        WHERE ma_nhom = @ma_nhom;
        UPDATE ThanhVienNhom
        SET chuc_vu = CASE WHEN ma_so_sinh_vien = @ma_so_nhom_truong THEN 'Nhóm trưởng' ELSE 'Thành viên' END
        WHERE ma_nhom = @ma_nhom;
      `);
    res.json({ message: 'Cập nhật nhóm thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật nhóm', details: err.message });
  }
});

// Route: DELETE /nhom/:ma_nhom
// Mục đích: Xóa nhóm sinh viên
router.delete('/nhom/:ma_nhom', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { ma_nhom } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        DELETE FROM ThanhVienNhom WHERE ma_nhom = @ma_nhom;
        DELETE FROM NhomSinhVien WHERE ma_nhom = @ma_nhom;
      `); // Thêm xóa ThanhVienNhom để tránh dữ liệu rác
    res.json({ message: 'Xóa nhóm thành công' });
  } catch (err) {
    console.error('Lỗi xóa nhóm:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa nhóm', details: err.message });
  }
});

// Route: GET /nhom/:ma_nhom/thanh-vien
// Mục đích: Lấy danh sách thành viên của nhóm
router.get('/nhom/:ma_nhom/thanh-vien', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_nhom', sql.NVarChar, req.params.ma_nhom)
      .query(`
        SELECT tvn.ma_so_sinh_vien, nd.ho_ten, tvn.ngay_tham_gia, tvn.chuc_vu
        FROM ThanhVienNhom tvn
        JOIN NguoiDung nd ON tvn.ma_so_sinh_vien = nd.ma_so
        WHERE tvn.ma_nhom = @ma_nhom
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách thành viên:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách thành viên', details: err.message });
  }
});

// Route: POST /nhom/:ma_nhom/thanh-vien
// Mục đích: Thêm thành viên mới vào nhóm
router.post('/nhom/:ma_nhom/thanh-vien', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { ma_nhom } = req.params;
    const { ma_so_sinh_vien, ngay_tham_gia } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar, ma_so_sinh_vien)
      .input('ngay_tham_gia', sql.Date, ngay_tham_gia)
      .query(`
        INSERT INTO ThanhVienNhom (ma_nhom, ma_so_sinh_vien, ngay_tham_gia, chuc_vu)
        VALUES (@ma_nhom, @ma_so_sinh_vien, @ngay_tham_gia, 'Thành viên')
      `);
    res.status(201).json({ message: 'Thêm thành viên thành công' });
  } catch (err) {
    console.error('Lỗi thêm thành viên:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm thành viên', details: err.message });
  }
});

// Route: DELETE /nhom/:ma_nhom/thanh-vien/:ma_so_sinh_vien
// Mục đích: Xóa thành viên khỏi nhóm
router.delete('/nhom/:ma_nhom/thanh-vien/:ma_so_sinh_vien', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { ma_nhom, ma_so_sinh_vien } = req.params;
    const pool = await poolPromise;
    const checkResult = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar, ma_so_sinh_vien)
      .query(`
        SELECT ma_so_nhom_truong FROM NhomSinhVien WHERE ma_nhom = @ma_nhom
      `);
    if (checkResult.recordset[0].ma_so_nhom_truong === ma_so_sinh_vien) {
      return res.status(403).json({ message: 'Không thể xóa nhóm trưởng' });
    }
    await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_sinh_vien', sql.VarChar, ma_so_sinh_vien)
      .query(`
        DELETE FROM ThanhVienNhom
        WHERE ma_nhom = @ma_nhom AND ma_so_sinh_vien = @ma_so_sinh_vien
      `);
    res.json({ message: 'Xóa thành viên thành công' });
  } catch (err) {
    console.error('Lỗi xóa thành viên:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa thành viên', details: err.message });
  }
});

// Route: GET /khoa
// Mục đích: Lấy danh sách khoa với phân trang và tìm kiếm
router.get('/khoa', authenticateToken, checkAdmin, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT ma_khoa, ten_khoa
        FROM Khoa
        WHERE ma_khoa LIKE @searchTerm OR ten_khoa LIKE @searchTerm
        ORDER BY ten_khoa
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM Khoa
        WHERE ma_khoa LIKE @searchTerm OR ten_khoa LIKE @searchTerm
      `);
    const total = countResult.recordset[0].total;
    res.json({
      khoa: result.recordset,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách khoa:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách khoa', details: err.message });
  }
});

// Route: POST /khoa
// Mục đích: Thêm khoa mới
router.post('/khoa', authenticateToken, checkAdmin, async (req, res) => {
  const { ma_khoa, ten_khoa } = req.body;
  if (!ma_khoa || !ten_khoa) {
    return res.status(400).json({ message: 'Thiếu mã khoa hoặc tên khoa' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .input('ten_khoa', sql.NVarChar, ten_khoa)
      .query(`
        INSERT INTO Khoa (ma_khoa, ten_khoa)
        VALUES (@ma_khoa, @ten_khoa)
      `);
    res.json({ message: 'Thêm khoa thành công', ma_khoa });
  } catch (err) {
    console.error('Lỗi thêm khoa:', err);
    if (err.number === 2627) {
      return res.status(400).json({ message: 'Mã khoa đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server khi thêm khoa', details: err.message });
  }
});
//
// Backend: Lấy danh sách sinh viên chưa có nhóm
router.get('/sinh-vien/chua-co-nhom', authenticateToken, checkAdmin, async (req, res) => {
  const { ma_nhom } = req.query; // Thêm ma_nhom để lấy khoa của nhóm trưởng
  try {
    const pool = await poolPromise;

    // Nếu có ma_nhom, lấy ma_khoa của nhóm trưởng
    let ma_khoa = null;
    if (ma_nhom) {
      const groupResult = await pool.request()
        .input('ma_nhom', sql.NVarChar, ma_nhom)
        .query(`
          SELECT sv.ma_khoa
          FROM NhomSinhVien nsv
          JOIN SinhVien sv ON nsv.ma_so_nhom_truong = sv.ma_so
          WHERE nsv.ma_nhom = @ma_nhom
        `);
      ma_khoa = groupResult.recordset[0]?.ma_khoa;
    }

    // Lấy danh sách sinh viên chưa có nhóm, kèm ma_khoa
    let query = `
      SELECT sv.ma_so, nd.ho_ten, sv.ma_khoa
      FROM SinhVien sv
      JOIN NguoiDung nd ON sv.ma_so = nd.ma_so
      LEFT JOIN ThanhVienNhom tvn ON sv.ma_so = tvn.ma_so_sinh_vien
      WHERE tvn.ma_so_sinh_vien IS NULL
    `;
    if (ma_khoa) {
      query += ` AND sv.ma_khoa = @ma_khoa`;
    }
    query += ` ORDER BY nd.ho_ten`;

    const result = await pool.request()
      .input('ma_khoa', sql.VarChar, ma_khoa)
      .query(query);

    res.json({ sinhVien: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy danh sách sinh viên chưa có nhóm:', err);
    res.status(500).json({ message: 'Lỗi server', details: err.message });
  }
});
//

module.exports = router;