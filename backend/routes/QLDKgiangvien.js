const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware xác thực token (chỉ cho quan_ly)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'quan_ly') {
      return res.status(403).json({ message: 'Chỉ quản lý được phép truy cập' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
};

// GET /api/dang-ky-giang-vien/admin/list: Lấy danh sách đăng ký giảng viên
router.get('/admin/list', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
          dkgv.ma_dang_ky_gv,
          dkgv.ma_nhom,
          ns.ten_nhom,
          ns.trang_thai_nhom,
          dkgv.ma_so_giang_vien,
          nd.ho_ten AS ho_ten_giang_vien,
          dkgv.ngay_dang_ky,
          dkgv.trang_thai_dang_ky
        FROM DangKyGiangVien dkgv
        INNER JOIN NhomSinhVien ns ON dkgv.ma_nhom = ns.ma_nhom
        INNER JOIN NguoiDung nd ON dkgv.ma_so_giang_vien = nd.ma_so
        WHERE ns.ten_nhom LIKE @search 
          OR dkgv.ma_dang_ky_gv LIKE @search 
          OR nd.ho_ten LIKE @search
        ORDER BY dkgv.ngay_dang_ky DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM DangKyGiangVien dkgv
        INNER JOIN NhomSinhVien ns ON dkgv.ma_nhom = ns.ma_nhom
        INNER JOIN NguoiDung nd ON dkgv.ma_so_giang_vien = nd.ma_so
        WHERE ns.ten_nhom LIKE @search 
          OR dkgv.ma_dang_ky_gv LIKE @search 
          OR nd.ho_ten LIKE @search
      `);
    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ dangKy: result.recordset, totalPages });
  } catch (err) {
    console.error('Lỗi lấy danh sách đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đăng ký', details: err.message });
  }
});

// POST /api/dang-ky-giang-vien/admin: Thêm đăng ký giảng viên mới
router.post('/admin', authenticateToken, async (req, res) => {
  const { ma_nhom, ma_so_giang_vien } = req.body;

  if (!ma_nhom || !ma_so_giang_vien) {
    return res.status(400).json({ message: 'Thiếu thông tin nhóm hoặc giảng viên' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra nhóm tồn tại và hợp lệ
    const nhomCheck = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_nhom, trang_thai_nhom
        FROM NhomSinhVien
        WHERE ma_nhom = @ma_nhom
      `);
    if (nhomCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhóm' });
    }
    if (nhomCheck.recordset[0].trang_thai_nhom !== 'hop_le') {
      return res.status(400).json({ message: 'Nhóm không hợp lệ' });
    }

    // Kiểm tra giảng viên tồn tại
    const giangVienCheck = await pool.request()
      .input('ma_so_giang_vien', sql.NVarChar, ma_so_giang_vien)
      .query(`
        SELECT ma_so
        FROM NguoiDung
        WHERE ma_so = @ma_so_giang_vien AND vai_tro = 'giang_vien'
      `);
    if (giangVienCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
    }

    // Kiểm tra nhóm đã có giảng viên được duyệt
    const existingDangKy = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .query(`
        SELECT ma_dang_ky_gv
        FROM DangKyGiangVien
        WHERE ma_nhom = @ma_nhom AND trang_thai_dang_ky = 'da_duyet'
      `);
    if (existingDangKy.recordset.length > 0) {
      return res.status(400).json({ message: 'Nhóm đã có giảng viên được duyệt' });
    }

    // Thêm đăng ký mới với OUTPUT ... INTO
    const result = await pool.request()
      .input('ma_nhom', sql.NVarChar, ma_nhom)
      .input('ma_so_giang_vien', sql.NVarChar, ma_so_giang_vien)
      .input('ngay_dang_ky', sql.DateTime, new Date())
      .input('trang_thai_dang_ky', sql.NVarChar, 'cho_duyet')
      .query(`
        DECLARE @OutputTable TABLE (ma_dang_ky_gv INT);
        INSERT INTO DangKyGiangVien (ma_nhom, ma_so_giang_vien, ngay_dang_ky, trang_thai_dang_ky)
        OUTPUT INSERTED.ma_dang_ky_gv INTO @OutputTable
        VALUES (@ma_nhom, @ma_so_giang_vien, @ngay_dang_ky, @trang_thai_dang_ky);
        SELECT ma_dang_ky_gv FROM @OutputTable;
      `);

    if (result.recordset.length === 0) {
      return res.status(500).json({ message: 'Không thể thêm đăng ký' });
    }

    const ma_dang_ky_gv = result.recordset[0].ma_dang_ky_gv;

    res.status(201).json({ message: 'Thêm đăng ký giảng viên thành công', ma_dang_ky_gv });
  } catch (err) {
    console.error('Lỗi thêm đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm đăng ký', details: err.message });
  }
});

// PUT /api/dang-ky-giang-vien/admin/:ma_dang_ky_gv: Cập nhật đăng ký (thông tin hoặc trạng thái)
router.put('/admin/:ma_dang_ky_gv', authenticateToken, async (req, res) => {
  const { ma_dang_ky_gv } = req.params;
  const { ma_nhom, ma_so_giang_vien, trang_thai_dang_ky } = req.body;

  // Nếu trạng thái là da_duyet, chỉ cho phép sửa ma_nhom hoặc ma_so_giang_vien
  if (trang_thai_dang_ky === 'da_duyet' && (ma_nhom || ma_so_giang_vien)) {
    return res.status(400).json({ message: 'Không thể thay đổi trạng thái khi sửa thông tin cho đăng ký đã duyệt' });
  }

  // Kiểm tra đầu vào
  if (!ma_nhom && !ma_so_giang_vien && !trang_thai_dang_ky) {
    return res.status(400).json({ message: 'Cần cung cấp ít nhất một thông tin để cập nhật' });
  }

  if (trang_thai_dang_ky && !['cho_duyet', 'da_duyet', 'tu_choi'].includes(trang_thai_dang_ky)) {
    return res.status(400).json({ message: 'Trạng thái đăng ký không hợp lệ' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra đăng ký tồn tại
    const checkDangKy = await pool.request()
      .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
      .query(`
        SELECT ma_dang_ky_gv, ma_nhom, trang_thai_dang_ky
        FROM DangKyGiangVien
        WHERE ma_dang_ky_gv = @ma_dang_ky_gv
      `);
    if (checkDangKy.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
    }

    // Nếu đăng ký đã duyệt, không cho phép thay đổi trạng thái
    if (checkDangKy.recordset[0].trang_thai_dang_ky === 'da_duyet' && trang_thai_dang_ky) {
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái của đăng ký đã duyệt' });
    }

    // Kiểm tra nhóm mới (nếu có)
    let newMaNhom = checkDangKy.recordset[0].ma_nhom;
    if (ma_nhom && ma_nhom !== newMaNhom) {
      const nhomCheck = await pool.request()
        .input('ma_nhom', sql.NVarChar, ma_nhom)
        .query(`
          SELECT ma_nhom, trang_thai_nhom
          FROM NhomSinhVien
          WHERE ma_nhom = @ma_nhom
        `);
      if (nhomCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy nhóm mới' });
      }
      if (nhomCheck.recordset[0].trang_thai_nhom !== 'hop_le') {
        return res.status(400).json({ message: 'Nhóm mới không hợp lệ' });
      }
      newMaNhom = ma_nhom;
    }

    // Kiểm tra giảng viên mới (nếu có)
    if (ma_so_giang_vien) {
      const giangVienCheck = await pool.request()
        .input('ma_so_giang_vien', sql.NVarChar, ma_so_giang_vien)
        .query(`
          SELECT ma_so
          FROM NguoiDung
          WHERE ma_so = @ma_so_giang_vien AND vai_tro = 'giang_vien'
        `);
      if (giangVienCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy giảng viên mới' });
      }
    }

    // Kiểm tra trạng thái (nếu cập nhật trạng thái)
    if (trang_thai_dang_ky && trang_thai_dang_ky !== checkDangKy.recordset[0].trang_thai_dang_ky) {
      if (trang_thai_dang_ky === 'da_duyet') {
        const existingDangKy = await pool.request()
          .input('ma_nhom', sql.NVarChar, newMaNhom)
          .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
          .query(`
            SELECT ma_dang_ky_gv
            FROM DangKyGiangVien
            WHERE ma_nhom = @ma_nhom AND trang_thai_dang_ky = 'da_duyet' AND ma_dang_ky_gv != @ma_dang_ky_gv
          `);
        if (existingDangKy.recordset.length > 0) {
          return res.status(400).json({ message: 'Nhóm đã có giảng viên được duyệt khác' });
        }
      }
    }

    // Cập nhật đăng ký
    const result = await pool.request()
      .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
      .input('ma_nhom', sql.NVarChar, ma_nhom || checkDangKy.recordset[0].ma_nhom)
      .input('ma_so_giang_vien', sql.NVarChar, ma_so_giang_vien || null)
      .input('trang_thai_dang_ky', sql.NVarChar, trang_thai_dang_ky || checkDangKy.recordset[0].trang_thai_dang_ky)
      .query(`
        UPDATE DangKyGiangVien
        SET 
          ma_nhom = @ma_nhom,
          ma_so_giang_vien = COALESCE(@ma_so_giang_vien, ma_so_giang_vien),
          trang_thai_dang_ky = @trang_thai_dang_ky
        WHERE ma_dang_ky_gv = @ma_dang_ky_gv
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(500).json({ message: 'Không thể cập nhật đăng ký' });
    }

    res.json({ message: 'Cập nhật đăng ký thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật đăng ký', details: err.message });
  }
});

// DELETE /api/dang-ky-giang-vien/admin/:ma_dang_ky_gv: Xóa đăng ký
router.delete('/admin/:ma_dang_ky_gv', authenticateToken, async (req, res) => {
  const { ma_dang_ky_gv } = req.params;

  try {
    const pool = await poolPromise;

    // Kiểm tra đăng ký tồn tại
    const checkDangKy = await pool.request()
      .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
      .query(`
        SELECT ma_dang_ky_gv, ma_nhom, trang_thai_dang_ky
        FROM DangKyGiangVien
        WHERE ma_dang_ky_gv = @ma_dang_ky_gv
      `);
    if (checkDangKy.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
    }

    // Xóa đăng ký
    const result = await pool.request()
      .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
      .query(`
        DELETE FROM DangKyGiangVien
        WHERE ma_dang_ky_gv = @ma_dang_ky_gv
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(500).json({ message: 'Không thể xóa đăng ký' });
    }

    res.json({ message: 'Xóa đăng ký thành công' });
  } catch (err) {
    console.error('Lỗi xóa đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa đăng ký', details: err.message });
  }
});

// GET /api/dang-ky-giang-vien/admin/options: Lấy danh sách nhóm và giảng viên để thêm/sửa
router.get('/admin/options', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const nhomResult = await pool.request().query(`
      SELECT ma_nhom, ten_nhom
      FROM NhomSinhVien
      WHERE trang_thai_nhom = 'hop_le'
      ORDER BY ten_nhom
    `);
    const giangVienResult = await pool.request().query(`
      SELECT ma_so, ho_ten
      FROM NguoiDung
      WHERE vai_tro = 'giang_vien'
      ORDER BY ho_ten
    `);
    res.json({
      nhom: nhomResult.recordset,
      giangVien: giangVienResult.recordset,
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách tùy chọn:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tùy chọn', details: err.message });
  }
});

module.exports = router;