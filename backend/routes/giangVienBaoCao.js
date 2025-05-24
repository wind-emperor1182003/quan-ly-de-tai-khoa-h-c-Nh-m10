const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

console.log('Loading giangVienBaoCao.js v2025-05-16-NOP-BO-SUNG-FIX');

// Middleware xác thực giảng viên
const authenticateGiangVien = (req, res, next) => {
  console.log('Checking giang_vien role:', req.user);
  const { vai_tro } = req.user;
  if (vai_tro !== 'giang_vien') {
    return res.status(403).json({ message: 'Chỉ giảng viên được phép truy cập' });
  }
  next();
};

// Xử lý lỗi chung
const handleError = (res, err, customMessage, statusCode = 500) => {
  console.error(`${customMessage}:`, err);
  res.status(statusCode).json({ message: customMessage, details: err.message || 'Lỗi không xác định' });
};

// Tạo mã báo cáo
const generateMaBaoCao = async (pool) => {
  try {
    const countResult = await pool.request().query(`SELECT COUNT(*) AS count FROM [dbo].[BaoCaoTienDo]`);
    const count = countResult.recordset[0].count;
    console.log(`Generating ma_bao_cao, current count: ${count}`);
    return `BC${(count + 1).toString().padStart(6, '0')}`;
  } catch (err) {
    throw new Error(`Lỗi tạo mã báo cáo: ${err.message}`);
  }
};

// Lấy danh sách đề tài của giảng viên
router.get('/detai', authenticate, authenticateGiangVien, async (req, res) => {
  const { ma_so } = req.user;
  try {
    console.log(`Fetching de_tai for giang_vien: ${ma_so}`);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT dt.ma_de_tai, dt.ten_de_tai, dt.ma_nhom, ns.ten_nhom
        FROM [dbo].[DeTai] dt
        JOIN [dbo].[NhomSinhVien] ns ON dt.ma_nhom = ns.ma_nhom
        WHERE dt.ma_so_giang_vien = @ma_so_giang_vien
          AND dt.trang_thai IN ('da_duyet', 'dang_thuc_hien')
      `);
    console.log(`Found ${result.recordset.length} de_tai`);
    res.json(result.recordset);
  } catch (err) {
    handleError(res, err, 'Lỗi server khi lấy danh sách đề tài');
  }
});

// Lấy danh sách báo cáo
router.get('/danh-sach', authenticate, authenticateGiangVien, async (req, res) => {
  const { ma_so } = req.user;
  try {
    console.log(`Fetching reports for giang_vien: ${ma_so}`);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT bc.ma_bao_cao, bc.ma_de_tai, dt.ten_de_tai, bc.ma_nhom, ns.ten_nhom, 
               bc.ky_bao_cao, bc.han_nop, bc.nhan_xet_sinh_vien, bc.ngay_nop, 
               bc.trang_thai, bc.diem_tien_do, bc.nhan_xet, bc.tep_dinh_kem, 
               bc.ma_so_sinh_vien, bc.ngay_danh_gia, bc.tre_han, bc.so_lan_chinh_sua
        FROM [dbo].[BaoCaoTienDo] bc
        JOIN [dbo].[DeTai] dt ON bc.ma_de_tai = dt.ma_de_tai
        JOIN [dbo].[NhomSinhVien] ns ON bc.ma_nhom = ns.ma_nhom
        WHERE dt.ma_so_giang_vien = @ma_so_giang_vien
      `);
    console.log(`Found ${result.recordset.length} reports`);
    res.json(result.recordset);
  } catch (err) {
    handleError(res, err, 'Lỗi server khi lấy danh sách báo cáo');
  }
});

// Tạo kỳ báo cáo
router.post('/tao', authenticate, authenticateGiangVien, async (req, res) => {
  const { ma_de_tai, ky_bao_cao, han_nop } = req.body;
  const { ma_so } = req.user;
  console.log(`Creating report with ma_de_tai: ${ma_de_tai}, ky_bao_cao: ${ky_bao_cao}, han_nop: ${han_nop}, giang_vien: ${ma_so}`);

  if (!ma_de_tai || !ky_bao_cao || !han_nop) {
    console.log('Missing required fields');
    return res.status(400).json({ message: 'Thiếu thông tin: ma_de_tai, ky_bao_cao, han_nop' });
  }

  let pool, transaction;
  try {
    pool = await poolPromise;
    console.log('Database pool acquired');
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('Transaction started');

    // Kiểm tra đề tài
    console.log('Checking DeTai for ma_de_tai:', ma_de_tai);
    const deTaiResult = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT ma_nhom 
        FROM [dbo].[DeTai] 
        WHERE ma_de_tai = @ma_de_tai AND ma_so_giang_vien = @ma_so_giang_vien
      `);
    if (deTaiResult.recordset.length === 0) {
      throw new Error('Đề tài không thuộc giảng viên này');
    }
    const { ma_nhom } = deTaiResult.recordset[0];
    console.log(`Found ma_nhom: ${ma_nhom}`);

    // Kiểm tra kỳ báo cáo
    console.log('Validating ky_bao_cao:', ky_bao_cao);
    if (![1, 2, 3, 4].includes(ky_bao_cao)) {
      throw new Error('Kỳ báo cáo phải là 1, 2, 3 hoặc 4');
    }
    const checkKy = await pool.request()
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .input('ky_bao_cao', sql.Int, ky_bao_cao)
      .query(`
        SELECT ma_bao_cao 
        FROM [dbo].[BaoCaoTienDo] 
        WHERE ma_de_tai = @ma_de_tai AND ky_bao_cao = @ky_bao_cao
      `);
    if (checkKy.recordset.length > 0) {
      throw new Error(`Kỳ báo cáo ${ky_bao_cao} đã tồn tại`);
    }
    console.log('Ky bao cao validated');

    // Tạo mã báo cáo
    console.log('Generating ma_bao_cao');
    const ma_bao_cao = await generateMaBaoCao(pool);
    console.log(`Generated ma_bao_cao: ${ma_bao_cao}`);

    // Insert vào BaoCaoTienDo
    console.log('Inserting into BaoCaoTienDo');
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('ma_de_tai', sql.VarChar(20), ma_de_tai)
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .input('ky_bao_cao', sql.Int, ky_bao_cao)
      .input('han_nop', sql.Date, han_nop)
      .input('trang_thai', sql.VarChar(20), 'chua_nop')
      .input('tre_han', sql.Bit, 0)
      .input('so_lan_chinh_sua', sql.Int, 0)
      .query(`
        INSERT INTO [dbo].[BaoCaoTienDo] (
          ma_bao_cao, ma_de_tai, ma_nhom, ky_bao_cao, han_nop, trang_thai, tre_han, so_lan_chinh_sua
        )
        VALUES (@ma_bao_cao, @ma_de_tai, @ma_nhom, @ky_bao_cao, @han_nop, @trang_thai, @tre_han, @so_lan_chinh_sua)
      `);
    console.log('Inserted into BaoCaoTienDo');

    // Lấy danh sách sinh viên trong nhóm
    console.log('Fetching all ma_so_sinh_vien in ma_nhom:', ma_nhom);
    const thanhVienResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien 
        FROM [dbo].[ThanhVienNhom] 
        WHERE ma_nhom = @ma_nhom
      `);
    const sinhVienList = thanhVienResult.recordset;
    console.log(`Found ${sinhVienList.length} sinh_vien in ma_nhom: ${ma_nhom}`);

    // Insert thông báo cho từng sinh viên
    console.log('Inserting ThongBao for each sinh_vien in ma_nhom:', ma_nhom);
    for (const sv of sinhVienList) {
      console.log(`Inserting ThongBao for ma_so_sinh_vien: ${sv.ma_so_sinh_vien}`);
      await pool.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), sv.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Kỳ báo cáo ${ky_bao_cao} của ${ma_de_tai} đã tạo, hạn: ${han_nop}`)
        .input('ngay_gui', sql.Date, new Date())
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai) 
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, 'chua_xem')
        `);
    }
    console.log('Inserted ThongBao for all sinh_vien');

    // Commit transaction
    console.log('Committing transaction');
    await transaction.commit();
    console.log('Transaction committed');

    // Gửi response
    console.log('Sending response');
    res.status(201).json({ message: 'Tạo kỳ báo cáo thành công', ma_bao_cao });
    console.log(`Response sent: Tạo kỳ báo cáo thành công, ma_bao_cao: ${ma_bao_cao}`);
  } catch (err) {
    if (transaction) {
      console.log('Rolling back transaction due to error:', err.message);
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    if (err.message.includes('không thuộc') || err.message.includes('Kỳ báo cáo')) {
      console.log(`Client error: ${err.message}`);
      return res.status(400).json({ message: err.message });
    }
    handleError(res, err, 'Lỗi server khi tạo kỳ báo cáo');
  } finally {
    if (pool) {
      console.log('Releasing database pool');
    }
  }
});

// Đánh giá báo cáo
router.post('/danhgia', authenticate, authenticateGiangVien, async (req, res) => {
  const { ma_bao_cao, diem_tien_do, nhan_xet } = req.body;
  const { ma_so } = req.user;
  console.log(`Evaluating report: ${ma_bao_cao}, giang_vien: ${ma_so}, diem_tien_do: ${diem_tien_do}`);

  if (!ma_bao_cao || diem_tien_do === undefined) {
    console.log('Missing ma_bao_cao or diem_tien_do');
    return res.status(400).json({ message: 'Thiếu mã báo cáo hoặc điểm tiến độ' });
  }
  if (diem_tien_do < 0 || diem_tien_do > 100) {
    console.log('Invalid diem_tien_do');
    return res.status(400).json({ message: 'Điểm tiến độ phải từ 0 đến 100' });
  }

  let pool, transaction;
  try {
    pool = await poolPromise;
    console.log('Database pool acquired for danhgia');
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('Transaction started for danhgia');

    // Kiểm tra báo cáo
    console.log('Checking BaoCaoTienDo for ma_bao_cao:', ma_bao_cao);
    const baoCaoResult = await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT bc.ma_de_tai, bc.trang_thai, bc.ma_nhom
        FROM [dbo].[BaoCaoTienDo] bc
        JOIN [dbo].[DeTai] dt ON bc.ma_de_tai = dt.ma_de_tai
        WHERE bc.ma_bao_cao = @ma_bao_cao AND dt.ma_so_giang_vien = @ma_so_giang_vien
      `);
    if (baoCaoResult.recordset.length === 0) {
      throw new Error('Báo cáo không tồn tại hoặc không thuộc giảng viên này');
    }
    if (baoCaoResult.recordset[0].trang_thai !== 'da_nop') {
      throw new Error('Báo cáo chưa được nộp hoặc đã đánh giá');
    }
    console.log('BaoCaoTienDo validated, ma_nhom:', baoCaoResult.recordset[0].ma_nhom);

    const { ma_nhom } = baoCaoResult.recordset[0];

    // Cập nhật BaoCaoTienDo
    console.log('Updating BaoCaoTienDo');
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('diem_tien_do', sql.Float, diem_tien_do)
      .input('nhan_xet', sql.NVarChar(1000), nhan_xet || null)
      .input('trang_thai', sql.VarChar(20), 'da_danh_gia')
      .input('ngay_danh_gia', sql.Date, new Date())
      .query(`
        UPDATE [dbo].[BaoCaoTienDo]
        SET diem_tien_do = @diem_tien_do, 
            nhan_xet = @nhan_xet, 
            trang_thai = @trang_thai,
            ngay_danh_gia = @ngay_danh_gia
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    console.log('Updated BaoCaoTienDo');

    // Lấy danh sách sinh viên trong nhóm
    console.log('Fetching all ma_so_sinh_vien in ma_nhom:', ma_nhom);
    const thanhVienResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien 
        FROM [dbo].[ThanhVienNhom] 
        WHERE ma_nhom = @ma_nhom
      `);
    const sinhVienList = thanhVienResult.recordset;
    console.log(`Found ${sinhVienList.length} sinh_vien in ma_nhom: ${ma_nhom}`);

    // Insert thông báo cho từng sinh viên
    console.log('Inserting ThongBao for each sinh_vien in ma_nhom:', ma_nhom);
    for (const sv of sinhVienList) {
      console.log(`Inserting ThongBao for ma_so_sinh_vien: ${sv.ma_so_sinh_vien}`);
      await pool.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), sv.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), `Báo cáo ${ma_bao_cao} được đánh giá: ${diem_tien_do} điểm`)
        .input('ngay_gui', sql.Date, new Date())
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai) 
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, 'chua_xem')
        `);
    }
    console.log('Inserted ThongBao for all sinh_vien');

    // Commit transaction
    console.log('Committing transaction for danhgia');
    await transaction.commit();
    console.log('Transaction committed for danhgia');

    // Gửi response
    res.status(200).json({ message: 'Đánh giá báo cáo thành công', ma_bao_cao });
    console.log(`Response sent: Đánh giá báo cáo thành công, ma_bao_cao: ${ma_bao_cao}`);
  } catch (err) {
    if (transaction) {
      console.log('Rolling back transaction due to error:', err.message);
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    if (err.message.includes('không tồn tại') || err.message.includes('chưa được nộp')) {
      console.log(`Client error: ${err.message}`);
      return res.status(400).json({ message: err.message });
    }
    handleError(res, err, 'Lỗi server khi đánh giá báo cáo');
  } finally {
    if (pool) {
      console.log('Releasing database pool for danhgia');
    }
  }
});

// Yêu cầu nộp bổ sung
router.post('/yeucau-nop-bo-sung', authenticate, authenticateGiangVien, async (req, res) => {
  const { ma_bao_cao, ly_do } = req.body;
  const { ma_so } = req.user;
  console.log(`Requesting supplemental submission for ma_bao_cao: ${ma_bao_cao}, giang_vien: ${ma_so}, ly_do: ${ly_do}`);

  if (!ma_bao_cao) {
    console.log('Missing ma_bao_cao');
    return res.status(400).json({ message: 'Thiếu mã báo cáo' });
  }

  let pool, transaction;
  try {
    pool = await poolPromise;
    console.log('Database pool acquired for yeucau-nop-bo-sung');
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('Transaction started for yeucau-nop-bo-sung');

    // Kiểm tra báo cáo
    console.log('Checking BaoCaoTienDo for ma_bao_cao:', ma_bao_cao);
    const baoCaoResult = await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('ma_so_giang_vien', sql.VarChar(20), ma_so)
      .query(`
        SELECT bc.ma_de_tai, bc.trang_thai, bc.ma_nhom
        FROM [dbo].[BaoCaoTienDo] bc
        JOIN [dbo].[DeTai] dt ON bc.ma_de_tai = dt.ma_de_tai
        WHERE bc.ma_bao_cao = @ma_bao_cao AND dt.ma_so_giang_vien = @ma_so_giang_vien
      `);
    if (baoCaoResult.recordset.length === 0) {
      throw new Error('Báo cáo không tồn tại hoặc không thuộc giảng viên này');
    }
    if (baoCaoResult.recordset[0].trang_thai !== 'da_nop') {
      throw new Error('Báo cáo chưa được nộp hoặc đã đánh giá');
    }
    console.log('BaoCaoTienDo validated, ma_nhom:', baoCaoResult.recordset[0].ma_nhom);

    const { ma_nhom } = baoCaoResult.recordset[0];

    // Cập nhật BaoCaoTienDo
    console.log('Updating BaoCaoTienDo to request supplemental submission');
    await pool.request()
      .input('ma_bao_cao', sql.NVarChar(20), ma_bao_cao)
      .input('trang_thai', sql.VarChar(20), 'chua_nop')
      .query(`
        UPDATE [dbo].[BaoCaoTienDo]
        SET trang_thai = @trang_thai
        WHERE ma_bao_cao = @ma_bao_cao
      `);
    console.log('Updated BaoCaoTienDo');

    // Lấy danh sách sinh viên trong nhóm
    console.log('Fetching all ma_so_sinh_vien in ma_nhom:', ma_nhom);
    const thanhVienResult = await pool.request()
      .input('ma_nhom', sql.NVarChar(20), ma_nhom)
      .query(`
        SELECT ma_so_sinh_vien 
        FROM [dbo].[ThanhVienNhom] 
        WHERE ma_nhom = @ma_nhom
      `);
    const sinhVienList = thanhVienResult.recordset;
    console.log(`Found ${sinhVienList.length} sinh_vien in ma_nhom: ${ma_nhom}`);

    // Insert thông báo cho từng sinh viên
    console.log('Inserting ThongBao for each sinh_vien in ma_nhom:', ma_nhom);
    for (const sv of sinhVienList) {
      console.log(`Inserting ThongBao for ma_so_sinh_vien: ${sv.ma_so_sinh_vien}`);
      const noi_dung = ly_do 
        ? `Yêu cầu nộp bổ sung báo cáo ${ma_bao_cao}: ${ly_do}` 
        : `Yêu cầu nộp bổ sung báo cáo ${ma_bao_cao}`;
      await pool.request()
        .input('ma_so_sinh_vien', sql.VarChar(20), sv.ma_so_sinh_vien)
        .input('noi_dung', sql.NVarChar(200), noi_dung)
        .input('ngay_gui', sql.Date, new Date())
        .query(`
          INSERT INTO [dbo].[ThongBao] (ma_so_sinh_vien, noi_dung, ngay_gui, trang_thai) 
          VALUES (@ma_so_sinh_vien, @noi_dung, @ngay_gui, 'chua_xem')
        `);
    }
    console.log('Inserted ThongBao for all sinh_vien');

    // Commit transaction
    console.log('Committing transaction for yeucau-nop-bo-sung');
    await transaction.commit();
    console.log('Transaction committed for yeucau-nop-bo-sung');

    // Gửi response
    res.status(200).json({ message: 'Yêu cầu nộp bổ sung thành công', ma_bao_cao });
    console.log(`Response sent: Yêu cầu nộp bổ sung thành công, ma_bao_cao: ${ma_bao_cao}`);
  } catch (err) {
    if (transaction) {
      console.log('Rolling back transaction due to error:', err.message);
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    if (err.message.includes('không tồn tại') || err.message.includes('chưa được nộp')) {
      console.log(`Client error: ${err.message}`);
      return res.status(400).json({ message: err.message });
    }
    handleError(res, err, 'Lỗi server khi yêu cầu nộp bổ sung');
  } finally {
    if (pool) {
      console.log('Releasing database pool for yeucau-nop-bo-sung');
    }
  }
});

// Tải file báo cáo
router.get('/tep/:filename', authenticate, authenticateGiangVien, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../Uploads/BaoCao', filename);
  console.log(`Downloading file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Tệp không tồn tại' });
  }
});

module.exports = router;