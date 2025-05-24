const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const { authenticate } = require('../middleware/auth');

console.log('Loading giangvien.js v2025-05-21-UPDATED');

// Lấy danh sách đăng ký giảng viên cần duyệt
router.get('/dang-ky-giang-vien/danh-sach', authenticate, async (req, res) => {
  const { ma_so, vai_tro } = req.user;
  console.log('req.user:', { ma_so, vai_tro });

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  try {
    const pool = await poolPromise;
    console.log('Kết nối database thành công');

    const result = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT dkgv.ma_dang_ky_gv, dkgv.ma_nhom, dkgv.ngay_dang_ky, n.ten_nhom,
               nd.ho_ten AS ten_truong_nhom, dkgv.trang_thai_dang_ky
        FROM [dbo].[DangKyGiangVien] dkgv
        JOIN [dbo].[NhomSinhVien] n ON dkgv.ma_nhom = n.ma_nhom
        LEFT JOIN [dbo].[NguoiDung] nd ON n.ma_so_nhom_truong = nd.ma_so
        WHERE dkgv.ma_so_giang_vien = @ma_so_giang_vien
      `);
    console.log('Danh sách đăng ký giảng viên:', result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách đăng ký giảng viên:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách đăng ký giảng viên',
      details: err.message
    });
  }
});

// Lấy danh sách thành viên của nhóm
router.get('/dang-ky-giang-vien/thanh-vien/:ma_nhom', authenticate, async (req, res) => {
  const { ma_so, vai_tro } = req.user;
  const { ma_nhom } = req.params;

  if (vai_tro !== 'giang_vien') {
    console.log(`Truy cập bị từ chối: Người dùng ${ma_so} không phải giảng viên`);
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!ma_nhom) {
    console.log('Lỗi: Thiếu mã nhóm');
    return res.status(400).json({ message: 'Mã nhóm không được để trống' });
  }

  try {
    const pool = await poolPromise;
    console.log(`Kết nối database thành công, lấy thành viên cho nhóm ${ma_nhom}`);

    const result = await pool.request()
      .input('ma_nhom', sql.VarChar(20), ma_nhom)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT tv.ma_so_sinh_vien, nd.ho_ten, nd.sdt
        FROM [dbo].[ThanhVienNhom] tv
        JOIN [dbo].[NguoiDung] nd ON tv.ma_so_sinh_vien = nd.ma_so
        JOIN [dbo].[NhomSinhVien] n ON tv.ma_nhom = n.ma_nhom
        JOIN [dbo].[DangKyGiangVien] dkgv ON n.ma_nhom = dkgv.ma_nhom
        WHERE tv.ma_nhom = @ma_nhom
        AND dkgv.ma_so_giang_vien = @ma_so_giang_vien
      `);

    console.log(`Danh sách thành viên cho nhóm ${ma_nhom}:`, result.recordset);

    if (result.recordset.length === 0) {
      console.warn(`Không tìm thấy thành viên cho nhóm ${ma_nhom} của giảng viên ${ma_so}`);
      return res.status(200).json({ thanh_vien: [], message: 'Nhóm chưa có thành viên hoặc không thuộc giảng viên' });
    }

    res.json({ thanh_vien: result.recordset });
  } catch (err) {
    console.error(`Lỗi lấy danh sách thành viên cho nhóm ${ma_nhom}:`, {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách thành viên',
      details: err.message,
    });
  }
});

// Duyệt đăng ký giảng viên
router.post('/dang-ky-giang-vien/duyet', authenticate, async (req, res) => {
  const { ma_dang_ky_gv } = req.body;
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!ma_dang_ky_gv) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã đăng ký giảng viên' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const checkResult = await transaction.request()
        .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
        .query(`
          SELECT ma_nhom
          FROM [dbo].[DangKyGiangVien]
          WHERE ma_dang_ky_gv = @ma_dang_ky_gv
          AND ma_so_giang_vien = @ma_so_giang_vien
          AND trang_thai_dang_ky = 'cho_duyet'
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Không tìm thấy đăng ký giảng viên hoặc bạn không có quyền duyệt' });
      }

      const { ma_nhom } = checkResult.recordset[0];

      await transaction.request()
        .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
        .query(`
          UPDATE [dbo].[DangKyGiangVien]
          SET trang_thai_dang_ky = 'da_duyet'
          WHERE ma_dang_ky_gv = @ma_dang_ky_gv
        `);

      try {
        await transaction.request()
          .input('ma_nhom', sql.NVarChar(20), ma_nhom)
          .input('noi_dung', sql.NVarChar(500), `Giảng viên đã được duyệt, bạn có thể đăng ký đề tài`)
          .input('ngay_gui', sql.DateTime, new Date())
          .query(`
            INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
            VALUES (@ma_nhom, @noi_dung, @ngay_gui, 'chua_xem')
          `);
      } catch (thongBaoErr) {
        console.warn('Lỗi tạo thông báo, nhưng duyệt vẫn thành công:', {
          message: thongBaoErr.message,
          stack: thongBaoErr.stack
        });
      }

      await transaction.commit();
      res.json({ message: 'Duyệt đăng ký giảng viên thành công' });
    } catch (err) {
      await transaction.rollback();
      console.error('Lỗi khi duyệt đăng ký giảng viên:', {
        message: err.message,
        stack: err.stack,
        sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
      });
      res.status(500).json({ 
        message: 'Lỗi server khi duyệt đăng ký giảng viên',
        details: err.message
      });
    }
  } catch (err) {
    console.error('Lỗi kết nối database:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi kết nối database',
      details: err.message
    });
  }
});

// Từ chối đăng ký giảng viên
router.post('/dang-ky-giang-vien/tu-choi', authenticate, async (req, res) => {
  const { ma_dang_ky_gv } = req.body;
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!ma_dang_ky_gv) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã đăng ký giảng viên' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const checkResult = await transaction.request()
        .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
        .query(`
          SELECT ma_nhom, ma_so_giang_vien
          FROM [dbo].[DangKyGiangVien]
          WHERE ma_dang_ky_gv = @ma_dang_ky_gv
          AND ma_so_giang_vien = @ma_so_giang_vien
          AND trang_thai_dang_ky = 'cho_duyet'
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Không tìm thấy đăng ký giảng viên hoặc bạn không có quyền từ chối' });
      }

      const { ma_nhom, ma_so_giang_vien } = checkResult.recordset[0];

      await transaction.request()
        .input('ma_dang_ky_gv', sql.Int, ma_dang_ky_gv)
        .query(`
          UPDATE [dbo].[DangKyGiangVien]
          SET trang_thai_dang_ky = 'tu_choi'
          WHERE ma_dang_ky_gv = @ma_dang_ky_gv
        `);

      try {
        await transaction.request()
          .input('ma_nhom', sql.NVarChar(20), ma_nhom)
          .input('noi_dung', sql.NVarChar(500), `Đăng ký giảng viên ${ma_so_giang_vien} bị từ chối`)
          .input('ngay_gui', sql.DateTime, new Date())
          .query(`
            INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
            VALUES (@ma_nhom, @noi_dung, @ngay_gui, 'chua_xem')
          `);
      } catch (thongBaoErr) {
        console.warn('Lỗi tạo thông báo, nhưng từ chối vẫn thành công:', {
          message: thongBaoErr.message,
          stack: thongBaoErr.stack
        });
      }

      await transaction.commit();
      res.json({ message: 'Từ chối đăng ký giảng viên thành công' });
    } catch (err) {
      await transaction.rollback();
      console.error('Lỗi khi từ chối đăng ký giảng viên:', {
        message: err.message,
        stack: err.stack,
        sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
      });
      res.status(500).json({ 
        message: 'Lỗi server khi từ chối đăng ký giảng viên',
        details: err.message
      });
    }
  } catch (err) {
    console.error('Lỗi kết nối database:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi kết nối database',
      details: err.message
    });
  }
});

// Lấy danh sách đề tài cần duyệt
router.get('/detai/danh-sach', authenticate, async (req, res) => {
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  try {
    const pool = await poolPromise;
    console.log('Kết nối database thành công');

    const result = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT dt.ma_de_tai, dt.ten_de_tai, dt.mo_ta, dt.ma_nhom, dt.ngay_tao AS ngay_dang_ky,
               n.ten_nhom, dt.trang_thai
        FROM [dbo].[DeTai] dt
        JOIN [dbo].[NhomSinhVien] n ON dt.ma_nhom = n.ma_nhom
        JOIN [dbo].[DangKyGiangVien] dkgv ON dt.ma_nhom = dkgv.ma_nhom
        WHERE dt.ma_so_giang_vien = @ma_so_giang_vien
        AND dkgv.trang_thai_dang_ky = 'da_duyet'
        AND dkgv.ma_so_giang_vien = @ma_so_giang_vien
      `);
    console.log('Danh sách đề tài:', result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi lấy danh sách đề tài:', {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách đề tài',
      details: err.message
    });
  }
});

// Duyệt đề tài
router.post('/detai/duyet', authenticate, async (req, res) => {
  const { ma_de_tai } = req.body;
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!ma_de_tai) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã đề tài' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const checkResult = await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
        .query(`
          SELECT dt.ma_nhom, dt.ten_de_tai
          FROM [dbo].[DeTai] dt
          JOIN [dbo].[DangKyGiangVien] dkgv ON dt.ma_nhom = dkgv.ma_nhom
          WHERE dt.ma_de_tai = @ma_de_tai
          AND dt.ma_so_giang_vien = @ma_so_giang_vien
          AND dt.trang_thai = 'cho_duyet'
          AND dkgv.trang_thai_dang_ky = 'da_duyet'
          AND dkgv.ma_so_giang_vien = @ma_so_giang_vien
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Không tìm thấy đề tài hoặc bạn không có quyền duyệt' });
      }

      const { ma_nhom, ten_de_tai } = checkResult.recordset[0];

      await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .query(`
          UPDATE [dbo].[DeTai]
          SET trang_thai = 'da_duyet'
          WHERE ma_de_tai = @ma_de_tai
        `);

      try {
        await transaction.request()
          .input('ma_nhom', sql.NVarChar(20), ma_nhom)
          .input('noi_dung', sql.NVarChar(500), `Đề tài "${ten_de_tai}" đã được duyệt`)
          .input('ngay_gui', sql.DateTime, new Date())
          .query(`
            INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
            VALUES (@ma_nhom, @noi_dung, @ngay_gui, 'chua_xem')
          `);
      } catch (thongBaoErr) {
        console.warn('Lỗi tạo thông báo, nhưng duyệt vẫn thành công:', {
          message: thongBaoErr.message,
          stack: thongBaoErr.stack
        });
      }

      await transaction.commit();
      res.json({ message: 'Duyệt đề tài thành công' });
    } catch (err) {
      await transaction.rollback();
      console.error('Lỗi khi duyệt đề tài:', {
        message: err.message,
        stack: err.stack,
        sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
      });
      res.status(500).json({ 
        message: 'Lỗi server khi duyệt đề tài',
        details: err.message
      });
    }
  } catch (err) {
    console.error('Lỗi kết nối database:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi kết nối database',
      details: err.message
    });
  }
});

// Từ chối đề tài
router.post('/detai/tu-choi', authenticate, async (req, res) => {
  const { ma_de_tai } = req.body;
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!ma_de_tai) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mã đề tài' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const checkResult = await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
        .query(`
          SELECT dt.ma_nhom, dt.ten_de_tai
          FROM [dbo].[DeTai] dt
          JOIN [dbo].[DangKyGiangVien] dkgv ON dt.ma_nhom = dkgv.ma_nhom
          WHERE dt.ma_de_tai = @ma_de_tai
          AND dt.ma_so_giang_vien = @ma_so_giang_vien
          AND dt.trang_thai = 'cho_duyet'
          AND dkgv.trang_thai_dang_ky = 'da_duyet'
          AND dkgv.ma_so_giang_vien = @ma_so_giang_vien
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Không tìm thấy đề tài hoặc bạn không có quyền từ chối' });
      }

      const { ma_nhom, ten_de_tai } = checkResult.recordset[0];

      await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .query(`
          UPDATE [dbo].[DeTai]
          SET trang_thai = 'huy'
          WHERE ma_de_tai = @ma_de_tai
        `);

      try {
        await transaction.request()
          .input('ma_nhom', sql.NVarChar(20), ma_nhom)
          .input('noi_dung', sql.NVarChar(500), `Đề tài "${ten_de_tai}" bị từ chối`)
          .input('ngay_gui', sql.DateTime, new Date())
          .query(`
            INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
            VALUES (@ma_nhom, @noi_dung, @ngay_gui, 'chua_xem')
          `);
      } catch (thongBaoErr) {
        console.warn('Lỗi tạo thông báo, nhưng từ chối vẫn thành công:', {
          message: thongBaoErr.message,
          stack: thongBaoErr.stack
        });
      }

      await transaction.commit();
      res.json({ message: 'Từ chối đề tài thành công' });
    } catch (err) {
      await transaction.rollback();
      console.error('Lỗi khi từ chối đề tài:', {
        message: err.message,
        stack: err.stack,
        sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
      });
      res.status(500).json({ 
        message: 'Lỗi server khi từ chối đề tài',
        details: err.message
      });
    }
  } catch (err) {
    console.error('Lỗi kết nối database:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi kết nối database',
      details: err.message
    });
  }
});

// Lấy chi tiết đề tài
router.get('/detai/:ma_de_tai', authenticate, async (req, res) => {
  const { ma_de_tai } = req.params;
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    console.log(`Truy cập bị từ chối: Người dùng ${ma_so} không phải giảng viên`);
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  try {
    const pool = await poolPromise;
    console.log(`Kết nối database thành công, lấy chi tiết đề tài ${ma_de_tai}`);

    // Check if lecturer is authorized (supervisor or council member)
    const authResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT hdb.vai_tro_hoi_dong
        FROM [dbo].[DeTai] dt
        LEFT JOIN [dbo].[LichBaoVe] lb ON dt.ma_de_tai = lb.ma_de_tai
        LEFT JOIN [dbo].[HoiDongBaoVe] hdb ON lb.ma_lich = hdb.ma_lich
        WHERE dt.ma_de_tai = @ma_de_tai
        AND (dt.ma_so_giang_vien = @ma_so_giang_vien OR hdb.ma_giang_vien = @ma_so_giang_vien)
      `);

    if (authResult.recordset.length === 0) {
      console.warn(`Giảng viên ${ma_so} không có quyền xem đề tài ${ma_de_tai}`);
      return res.status(403).json({ message: 'Bạn không có quyền xem chi tiết đề tài này' });
    }

    // Get lecturer's council role (if any)
    const vai_tro_hoi_dong = authResult.recordset[0]?.vai_tro_hoi_dong || null;

    // Fetch topic details
    const topicResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT dt.*, nd.ho_ten AS ten_giang_vien
        FROM [dbo].[DeTai] dt
        LEFT JOIN [dbo].[NguoiDung] nd ON dt.ma_so_giang_vien = nd.ma_so
        WHERE dt.ma_de_tai = @ma_de_tai
      `);
    if (topicResult.recordset.length === 0) {
      console.warn(`Không tìm thấy đề tài ${ma_de_tai}`);
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }
    const topic = topicResult.recordset[0];

    // Fetch group details
    const groupResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), topic.ma_nhom)
      .query(`
        SELECT ns.*, nd.ho_ten AS ten_nhom_truong
        FROM [dbo].[NhomSinhVien] ns
        LEFT JOIN [dbo].[NguoiDung] nd ON ns.ma_so_nhom_truong = nd.ma_so
        WHERE ns.ma_nhom = @ma_nhom
      `);
    const group = groupResult.recordset[0] || {};

    // Fetch group members
    const membersResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), topic.ma_nhom)
      .query(`
        SELECT tvn.*, nd.ho_ten
        FROM [dbo].[ThanhVienNhom] tvn
        LEFT JOIN [dbo].[NguoiDung] nd ON tvn.ma_so_sinh_vien = nd.ma_so
        WHERE tvn.ma_nhom = @ma_nhom
      `);
    const members = membersResult.recordset;

    // Fetch progress reports
    const reportsResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT bct.*, nd.ho_ten AS ten_sinh_vien_nop
        FROM [dbo].[BaoCaoTienDo] bct
        LEFT JOIN [dbo].[NguoiDung] nd ON bct.ma_so_sinh_vien = nd.ma_so
        WHERE bct.ma_de_tai = @ma_de_tai
        ORDER BY bct.ky_bao_cao
      `);
    const reports = reportsResult.recordset;

    // Fetch defense schedule
    const scheduleResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT * FROM [dbo].[LichBaoVe]
        WHERE ma_de_tai = @ma_de_tai
      `);
    const schedule = scheduleResult.recordset[0] || {};

    // Fetch defense scores
    const scoresResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT cb.*, nd.ho_ten AS ten_giang_vien
        FROM [dbo].[ChamBaoVe] cb
        LEFT JOIN [dbo].[NguoiDung] nd ON cb.ma_so_giang_vien = nd.ma_so
        WHERE cb.ma_de_tai = @ma_de_tai
      `);
    const scores = scoresResult.recordset;

    // Fetch defense council members
    const councilResult = await pool.request()
      .input('ma_lich', sql.Int, schedule.ma_lich || 0)
      .query(`
        SELECT hdb.*, nd.ho_ten AS ten_giang_vien
        FROM [dbo].[HoiDongBaoVe] hdb
        LEFT JOIN [dbo].[NguoiDung] nd ON hdb.ma_giang_vien = nd.ma_so
        WHERE hdb.ma_lich = @ma_lich
      `);
    const council = councilResult.recordset;

    console.log(`Trả về chi tiết đề tài ${ma_de_tai}`);
    res.json({
      topic,
      group,
      members,
      reports,
      schedule,
      scores,
      council,
      vai_tro_hoi_dong,
    });
  } catch (err) {
    console.error(`Lỗi lấy chi tiết đề tài ${ma_de_tai}:`, {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
    });
    res.status(500).json({ 
      message: 'Lỗi server khi lấy chi tiết đề tài',
      details: err.message,
    });
  }
});

// Chấm điểm bảo vệ (Chỉ Chủ tịch)
router.post('/detai/:ma_de_tai/cham', authenticate, async (req, res) => {
  const { ma_de_tai } = req.params;
  const { diem_bao_ve, nhan_xet } = req.body;
  const { ma_so, vai_tro } = req.user;

  console.log(`Yêu cầu chấm điểm: ma_de_tai=${ma_de_tai}, ma_so=${ma_so}, diem_bao_ve=${diem_bao_ve}`);

  if (vai_tro !== 'giang_vien') {
    console.log(`Truy cập bị từ chối: Người dùng ${ma_so} không phải giảng viên`);
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  if (!diem_bao_ve || diem_bao_ve < 0 || diem_bao_ve > 100) {
    console.log(`Dữ liệu không hợp lệ: diem_bao_ve=${diem_bao_ve}`);
    return res.status(400).json({ message: 'Điểm bảo vệ phải từ 0 đến 100' });
  }

  try {
    const pool = await poolPromise;
    console.log(`Kết nối database thành công, chấm điểm đề tài ${ma_de_tai}`);

    // Kiểm tra trạng thái lịch bảo vệ
    const scheduleResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .query(`
        SELECT trang_thai
        FROM [dbo].[LichBaoVe]
        WHERE ma_de_tai = @ma_de_tai
      `);
    if (scheduleResult.recordset.length === 0) {
      console.warn(`Không tìm thấy lịch bảo vệ cho đề tài ${ma_de_tai}`);
      return res.status(400).json({ message: 'Không tìm thấy lịch bảo vệ' });
    }
    if (scheduleResult.recordset[0].trang_thai !== 'Đã xác nhận') {
      console.warn(`Lịch bảo vệ cho đề tài ${ma_de_tai} chưa được xác nhận: ${scheduleResult.recordset[0].trang_thai}`);
      return res.status(400).json({ message: 'Lịch bảo vệ chưa được xác nhận' });
    }

    // Kiểm tra vai trò Chủ tịch
    const authResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT hdb.vai_tro_hoi_dong, hdb.ma_lich
        FROM [dbo].[LichBaoVe] lb
        JOIN [dbo].[HoiDongBaoVe] hdb ON lb.ma_lich = hdb.ma_lich
        WHERE lb.ma_de_tai = @ma_de_tai
        AND hdb.ma_giang_vien = @ma_so_giang_vien
        AND hdb.vai_tro_hoi_dong = N'Chủ tịch'
      `);

    console.log(`Kết quả kiểm tra vai trò:`, authResult.recordset);

    if (authResult.recordset.length === 0) {
      console.warn(`Giảng viên ${ma_so} không phải Chủ tịch cho đề tài ${ma_de_tai}`);
      return res.status(403).json({ message: 'Chỉ Chủ tịch hội đồng được phép chấm điểm' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Kiểm tra điểm đã tồn tại
      const existingScore = await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
        .query(`
          SELECT ma_cham
          FROM [dbo].[ChamBaoVe]
          WHERE ma_de_tai = @ma_de_tai
          AND ma_so_giang_vien = @ma_so_giang_vien
        `);

      if (existingScore.recordset.length > 0) {
        // Cập nhật điểm
        await transaction.request()
          .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
          .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
          .input('diem_bao_ve', sql.Float, diem_bao_ve)
          .input('nhan_xet', sql.NVarChar(500), nhan_xet || null)
          .input('ngay_cham', sql.DateTime, new Date())
          .query(`
            UPDATE [dbo].[ChamBaoVe]
            SET diem_bao_ve = @diem_bao_ve,
                nhan_xet = @nhan_xet,
                ngay_cham = @ngay_cham
            WHERE ma_de_tai = @ma_de_tai
            AND ma_so_giang_vien = @ma_so_giang_vien
          `);
        console.log(`Cập nhật điểm bảo vệ cho đề tài ${ma_de_tai} bởi ${ma_so}`);
      } else {
        // Thêm điểm mới
        await transaction.request()
          .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
          .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
          .input('diem_bao_ve', sql.Float, diem_bao_ve)
          .input('nhan_xet', sql.NVarChar(500), nhan_xet || null)
          .input('ngay_cham', sql.DateTime, new Date())
          .query(`
            INSERT INTO [dbo].[ChamBaoVe] (ma_de_tai, ma_so_giang_vien, diem_bao_ve, nhan_xet, ngay_cham)
            VALUES (@ma_de_tai, @ma_so_giang_vien, @diem_bao_ve, @nhan_xet, @ngay_cham)
          `);
        console.log(`Thêm điểm bảo vệ mới cho đề tài ${ma_de_tai} bởi ${ma_so}`);
      }

      // Gửi thông báo
      const groupResult = await transaction.request()
        .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
        .query(`
          SELECT ma_nhom
          FROM [dbo].[DeTai]
          WHERE ma_de_tai = @ma_de_tai
        `);
      if (groupResult.recordset.length === 0) {
        console.warn(`Không tìm thấy nhóm cho đề tài ${ma_de_tai}`);
      } else {
        const { ma_nhom } = groupResult.recordset[0];
        try {
          await transaction.request()
            .input('ma_nhom', sql.NVarChar(20), ma_nhom)
            .input('noi_dung', sql.NVarChar(500), `Đề tài ${ma_de_tai} đã được chấm điểm: ${diem_bao_ve}`)
            .input('ngay_gui', sql.DateTime, new Date())
            .query(`
              INSERT INTO [dbo].[ThongBao] (ma_nhom, noi_dung, ngay_gui, trang_thai)
              VALUES (@ma_nhom, @noi_dung, @ngay_gui, N'chưa xem')
            `);
          console.log(`Gửi thông báo tới nhóm ${ma_nhom}`);
        } catch (thongBaoErr) {
          console.warn('Lỗi tạo thông báo, nhưng chấm điểm vẫn thành công:', {
            message: thongBaoErr.message,
            stack: thongBaoErr.stack
          });
        }
      }

      await transaction.commit();
      console.log(`Chấm điểm thành công cho đề tài ${ma_de_tai}`);
      res.json({ message: 'Chấm điểm bảo vệ thành công' });
    } catch (err) {
      await transaction.rollback();
      console.error(`Lỗi khi chấm điểm đề tài ${ma_de_tai}:`, {
        message: err.message,
        stack: err.stack,
        sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể'
      });
      res.status(500).json({ 
        message: 'Lỗi server khi chấm điểm',
        details: err.message
      });
    }
  } catch (err) {
    console.error(`Lỗi kết nối database khi chấm điểm ${ma_de_tai}:`, {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Lỗi server khi kết nối database',
      details: err.message
    });
  }
});

// Lấy danh sách hội đồng bảo vệ
router.get('/hoidong', authenticate, async (req, res) => {
  const { ma_so, vai_tro } = req.user;

  if (vai_tro !== 'giang_vien') {
    console.log(`Truy cập bị từ chối: Người dùng ${ma_so} không phải giảng viên`);
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }

  try {
    const pool = await poolPromise;
    console.log(`Kết nối database thành công, lấy danh sách hội đồng cho ${ma_so}`);

    const result = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT lb.ma_lich, lb.ma_de_tai, dt.ten_de_tai, lb.dia_diem, lb.thoi_gian, lb.trang_thai,
               hdb.vai_tro_hoi_dong
        FROM [dbo].[LichBaoVe] lb
        JOIN [dbo].[DeTai] dt ON lb.ma_de_tai = dt.ma_de_tai
        JOIN [dbo].[HoiDongBaoVe] hdb ON lb.ma_lich = hdb.ma_lich
        WHERE hdb.ma_giang_vien = @ma_so_giang_vien
      `);

    console.log(`Danh sách hội đồng cho ${ma_so}:`, result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error(`Lỗi lấy danh sách hội đồng cho ${ma_so}:`, {
      message: err.message,
      stack: err.stack,
      sqlError: err.sqlMessage || 'Không có lỗi SQL cụ thể',
    });
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách hội đồng',
      details: err.message,
    });
  }
});

module.exports = router;