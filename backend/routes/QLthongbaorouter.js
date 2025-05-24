const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware xác thực token (chỉ cho quan_ly)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.error('Lỗi xác thực: Không có header Authorization');
    return res.status(401).json({ message: 'Không có header Authorization' });
  }

  const token = authHeader.match(/(?:[Bb]earer\s+)?(\S+)/)?.[1];
  if (!token) {
    console.error('Lỗi xác thực: Định dạng Authorization không hợp lệ');
    return res.status(401).json({ message: 'Không có token hoặc định dạng sai (yêu cầu Bearer)' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('Lỗi cấu hình: Thiếu JWT_SECRET trong môi trường');
    return res.status(500).json({ message: 'Lỗi server: Thiếu JWT_SECRET' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.vai_tro !== 'quan_ly') {
      console.warn(`Truy cập bị từ chối: Vai trò người dùng là ${decoded.vai_tro}, cần quan_ly`);
      return res.status(403).json({ message: 'Chỉ quản lý được phép truy cập' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Xác thực JWT thất bại:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(403).json({ message: 'Token không hợp lệ', details: err.message });
  }
};

// Middleware log yêu cầu
router.use((req, res, next) => {
  console.log(`Yêu cầu nhận được: ${req.method} ${req.originalUrl}`);
  next();
});

// DELETE /api/thong-bao/admin/:table/delete-all: Xóa toàn bộ bản ghi
router.delete('/admin/:table/delete-all', authenticateToken, async (req, res) => {
  const { table } = req.params;
  console.log(`Nhận yêu cầu DELETE ALL cho bảng: ${table}`);

  const tableConfig = {
    thongbao: { table: 'ThongBao' },
    loimoinhom: { table: 'LoiMoiNhom' },
    loixinnhom: { table: 'LoiXinNhom' },
  };

  if (!tableConfig[table]) {
    console.error(`Yêu cầu bảng không hợp lệ: ${table}`);
    return res.status(400).json({ message: 'Bảng không hợp lệ' });
  }

  const { table: tableName } = tableConfig[table];

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const checkRecords = await transaction.request().query(`
        SELECT COUNT(*) AS total
        FROM ${tableName}
      `);
      if (checkRecords.recordset[0].total === 0) {
        await transaction.commit();
        console.log(`Bảng ${tableName} đã trống, không cần xóa`);
        return res.status(200).json({ message: 'Bảng đã trống, không cần xóa' });
      }

      try {
        await transaction.request().query(`
          TRUNCATE TABLE ${tableName}
        `);
        console.log(`Xóa toàn bộ dữ liệu bảng ${tableName} bằng TRUNCATE thành công, IDENTITY được đặt lại`);
      } catch (truncateErr) {
        console.warn(`TRUNCATE TABLE ${tableName} thất bại: ${truncateErr.message}, chuyển sang DELETE`);
        await transaction.request().query(`
          DELETE FROM ${tableName}
        `);
        console.log(`Xóa toàn bộ dữ liệu bảng ${tableName} bằng DELETE thành công`);
      }

      await transaction.commit();
      res.json({ message: `Xóa toàn bộ dữ liệu trong ${table} thành công` });
    } catch (txErr) {
      await transaction.rollback();
      console.error(`Lỗi giao dịch khi xóa toàn bộ ${table}:`, txErr.message);
      return res.status(500).json({ message: `Lỗi server khi xóa toàn bộ ${table}`, details: txErr.message });
    }
  } catch (err) {
    console.error(`Lỗi xóa toàn bộ ${table}:`, err.message);
    res.status(500).json({ message: `Lỗi server khi xóa toàn bộ ${table}`, details: err.message });
  }
});

// DELETE /api/thong-bao/admin/:table/:id: Xóa bản ghi
router.delete('/admin/:table/:id', authenticateToken, async (req, res) => {
  const { table, id } = req.params;
  console.log(`Nhận yêu cầu DELETE cho bảng: ${table}, id: ${id}`);

  const tableConfig = {
    thongbao: { table: 'ThongBao', idField: 'ma_thong_bao', type: sql.Int },
    loimoinhom: { table: 'LoiMoiNhom', idField: 'ma_loi_moi', type: sql.Int },
    loixinnhom: { table: 'LoiXinNhom', idField: 'ma_loi_xin', type: sql.Int },
  };

  if (!tableConfig[table]) {
    console.error(`Yêu cầu bảng không hợp lệ: ${table}`);
    return res.status(400).json({ message: 'Bảng không hợp lệ' });
  }

  const { table: tableName, idField, type } = tableConfig[table];

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    console.error(`Lỗi xác thực: ID không hợp lệ cho ${table}: ${id}, cần là số nguyên`);
    return res.status(400).json({ message: `ID không hợp lệ cho ${table}, phải là số nguyên` });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request().input('id', type, parsedId);

    const checkRecord = await request.query(`
      SELECT ${idField}
      FROM ${tableName}
      WHERE ${idField} = @id
    `);
    if (checkRecord.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const result = await transaction.request()
        .input('id', type, parsedId)
        .query(`
          DELETE FROM ${tableName}
          WHERE ${idField} = @id
        `);
      await transaction.commit();

      if (result.rowsAffected[0] === 0) {
        return res.status(500).json({ message: 'Không thể xóa bản ghi' });
      }

      res.json({ message: 'Xóa bản ghi thành công' });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error(`Lỗi xóa bản ghi ${table} với id ${id}:`, err.message);
    res.status(500).json({ message: `Lỗi server khi xóa bản ghi ${table}`, details: err.message });
  }
});

// GET /api/thong-bao/admin/list/:table: Lấy danh sách bản ghi
router.get('/admin/list/:table', authenticateToken, async (req, res) => {
  const { table } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search}%`;

  const tableConfig = {
    thongbao: {
      table: 'ThongBao',
      fields: ['tb.ma_thong_bao', 'tb.ma_so_sinh_vien', 'tb.noi_dung', 'tb.ngay_gui', 'tb.trang_thai'],
      selectFields: ['ma_thong_bao', 'ma_so_sinh_vien', 'noi_dung', 'ngay_gui', 'trang_thai'],
      join: 'INNER JOIN SinhVien sv ON tb.ma_so_sinh_vien = sv.ma_so',
      searchFields: ['CAST(tb.ma_thong_bao AS NVARCHAR)', 'tb.ma_so_sinh_vien', 'tb.noi_dung'],
      orderByField: 'tb.ngay_gui',
    },
    loimoinhom: {
      table: 'LoiMoiNhom',
      fields: ['tb.ma_loi_moi', 'tb.ma_nhom', 'tb.ma_so_sinh_vien', 'tb.ngay_gui', 'tb.trang_thai_loi_moi'],
      selectFields: ['ma_loi_moi', 'ma_nhom', 'ma_so_sinh_vien', 'ngay_gui', 'trang_thai_loi_moi'],
      join: 'INNER JOIN NhomSinhVien ns ON tb.ma_nhom = ns.ma_nhom INNER JOIN SinhVien sv ON tb.ma_so_sinh_vien = sv.ma_so',
      searchFields: ['CAST(tb.ma_loi_moi AS NVARCHAR)', 'tb.ma_nhom', 'tb.ma_so_sinh_vien'],
      orderByField: 'tb.ngay_gui',
    },
    loixinnhom: {
      table: 'LoiXinNhom',
      fields: ['tb.ma_loi_xin', 'tb.ma_nhom', 'tb.ma_so_sinh_vien', 'tb.ngay_xin AS ngay_gui', 'tb.trang_thai'],
      selectFields: ['ma_loi_xin', 'ma_nhom', 'ma_so_sinh_vien', 'ngay_gui', 'trang_thai'],
      join: 'INNER JOIN NhomSinhVien ns ON tb.ma_nhom = ns.ma_nhom INNER JOIN SinhVien sv ON tb.ma_so_sinh_vien = sv.ma_so',
      searchFields: ['CAST(tb.ma_loi_xin AS NVARCHAR)', 'tb.ma_nhom', 'tb.ma_so_sinh_vien'],
      orderByField: 'tb.ngay_xin',
    },
  };

  if (!tableConfig[table]) {
    console.error(`Yêu cầu bảng không hợp lệ: ${table}`);
    return res.status(400).json({ message: 'Bảng không hợp lệ' });
  }

  const { table: tableName, fields, selectFields, join, searchFields, orderByField } = tableConfig[table];

  try {
    const pool = await poolPromise;

    // Truy vấn chính
    let query;
    // Sử dụng ROW_NUMBER() cho loixinnhom để hỗ trợ SQL Server 2008
    if (table === 'loixinnhom') {
      query = `
        WITH PagedResults AS (
          SELECT ${fields.join(', ')}, ROW_NUMBER() OVER (ORDER BY ${orderByField} DESC) AS row_num
          FROM ${tableName} tb
          ${join}
          WHERE ${searchFields.map((f) => `${f} LIKE @search`).join(' OR ')}
        )
        SELECT ${selectFields.join(', ')}
        FROM PagedResults
        WHERE row_num > @offset AND row_num <= @offset + @limit
        ORDER BY row_num
      `;
    } else {
      // Sử dụng OFFSET ... FETCH cho các bảng khác (SQL Server 2012 trở lên)
      query = `
        SELECT ${fields.join(', ')}
        FROM ${tableName} tb
        ${join}
        WHERE ${searchFields.map((f) => `${f} LIKE @search`).join(' OR ')}
        ORDER BY ${orderByField} DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
    }

    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(query);

    const countResult = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`
        SELECT COUNT(*) AS total
        FROM ${tableName} tb
        ${join}
        WHERE ${searchFields.map((f) => `${f} LIKE @search`).join(' OR ')}
      `);

    const totalPages = Math.ceil(countResult.recordset[0].total / limit);
    res.json({ items: result.recordset, totalPages });
  } catch (err) {
    console.error(`Lỗi lấy danh sách ${table}:`, err.message);
    res.status(500).json({ message: `Lỗi server khi lấy danh sách ${table}`, details: err.message });
  }
});

module.exports = router;