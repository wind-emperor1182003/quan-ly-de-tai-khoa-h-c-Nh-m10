import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Giangvienbaocao.scss';

const Giangvienbaocao = () => {
  const [reports, setReports] = useState([]);
  const [deTaiList, setDeTaiList] = useState([]);
  const [selectedNhom, setSelectedNhom] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newReport, setNewReport] = useState({
    ma_de_tai: '',
    ky_bao_cao: 1,
    han_nop: '',
  });
  const [evaluation, setEvaluation] = useState({
    ma_bao_cao: '',
    diem_tien_do: '',
    nhan_xet: '',
  });
  const [supplementRequest, setSupplementRequest] = useState({
    ma_bao_cao: '',
    ly_do: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setError('Vui lòng đăng nhập');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportResponse, deTaiResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/giangvien/baocao/danh-sach', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/giangvien/baocao/detai', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setReports(reportResponse.data);
        setDeTaiList(deTaiResponse.data);
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Lỗi tải dữ liệu: ${err.message}`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleDeTaiChange = (e) => {
    const ma_de_tai = e.target.value;
    setNewReport({ ...newReport, ma_de_tai });
    const selectedDeTai = deTaiList.find(dt => dt.ma_de_tai === ma_de_tai);
    setSelectedNhom(selectedDeTai ? selectedDeTai.ten_nhom : '');
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!newReport.ma_de_tai || !newReport.han_nop) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('http://localhost:5000/api/giangvien/baocao/tao', newReport, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(response.data.message || 'Tạo kỳ báo cáo thành công');
      const selectedDeTai = deTaiList.find(dt => dt.ma_de_tai === newReport.ma_de_tai);
      const newReportData = {
        ...newReport,
        ma_bao_cao: response.data.ma_bao_cao,
        trang_thai: 'chua_nop',
        ten_de_tai: selectedDeTai?.ten_de_tai || newReport.ma_de_tai,
        ten_nhom: selectedDeTai?.ten_nhom || 'Nhóm không tên',
        tre_han: 0,
        so_lan_chinh_sua: 0,
      };
      setReports([...reports, newReportData]);
      setNewReport({ ma_de_tai: '', ky_bao_cao: 1, han_nop: '' });
      setSelectedNhom('');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.details || 'Lỗi tạo kỳ báo cáo';
      toast.error(errorMessage);
      console.error('Error creating report:', err.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluateReport = async (ma_bao_cao) => {
    if (!evaluation.diem_tien_do || evaluation.diem_tien_do < 0 || evaluation.diem_tien_do > 100) {
      toast.error('Điểm tiến độ phải từ 0 đến 100');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('http://localhost:5000/api/giangvien/baocao/danhgia', {
        ma_bao_cao,
        diem_tien_do: parseFloat(evaluation.diem_tien_do),
        nhan_xet: evaluation.nhan_xet,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Đánh giá báo cáo thành công');
      setReports(reports.map((report) =>
        report.ma_bao_cao === ma_bao_cao
          ? { 
              ...report, 
              trang_thai: 'da_danh_gia', 
              diem_tien_do: evaluation.diem_tien_do, 
              nhan_xet: evaluation.nhan_xet,
              ngay_danh_gia: new Date().toISOString().split('T')[0]
            }
          : report
      ));
      setEvaluation({ ma_bao_cao: '', diem_tien_do: '', nhan_xet: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đánh giá báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSupplement = async (ma_bao_cao) => {
    if (!supplementRequest.ly_do) {
      toast.error('Vui lòng nhập lý do yêu cầu nộp bổ sung');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('http://localhost:5000/api/giangvien/baocao/yeucau-nop-bo-sung', {
        ma_bao_cao,
        ly_do: supplementRequest.ly_do,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Yêu cầu nộp bổ sung thành công');
      setReports(reports.map((report) =>
        report.ma_bao_cao === ma_bao_cao
          ? { ...report, trang_thai: 'chua_nop' }
          : report
      ));
      setSupplementRequest({ ma_bao_cao: '', ly_do: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi yêu cầu nộp bổ sung');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/giangvien/baocao/tep/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Lỗi tải tệp');
    }
  };

  if (error) return <div className="error-message">{error}</div>;
  if (loading) return <div className="spinner-border" role="status"><span className="visually-hidden">Đang tải...</span></div>;

  return (
    <div className="giangvien-baocao container mt-5">
      <h2 className="mb-4">Quản Lý Báo Cáo Tiến Độ</h2>
      <div className="create-report card p-4 mb-4">
        <h4 className="card-title">Tạo Kỳ Báo Cáo</h4>
        <form onSubmit={handleCreateReport}>
          <div className="mb-3">
            <label className="form-label">Đề Tài</label>
            <select
              className="form-select"
              value={newReport.ma_de_tai}
              onChange={handleDeTaiChange}
            >
              <option value="">Chọn đề tài</option>
              {deTaiList.map((deTai) => (
                <option key={deTai.ma_de_tai} value={deTai.ma_de_tai}>
                  {deTai.ten_de_tai}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Nhóm Thực Hiện</label>
            <input
              type="text"
              className="form-control"
              value={selectedNhom}
              readOnly
              placeholder="Chọn đề tài để xem nhóm"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Kỳ Báo Cáo</label>
            <select
              className="form-select"
              value={newReport.ky_bao_cao}
              onChange={(e) => setNewReport({ ...newReport, ky_bao_cao: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4].map((ky) => (
                <option key={ky} value={ky}>Kỳ {ky}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Hạn Nộp</label>
            <input
              type="date"
              className="form-control"
              value={newReport.han_nop}
              onChange={(e) => setNewReport({ ...newReport, han_nop: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo Kỳ Báo Cáo'}
          </button>
        </form>
      </div>
      <h4 className="mb-3">Danh Sách Báo Cáo</h4>
      {reports.length === 0 ? (
        <div className="alert alert-info">Chưa có báo cáo tiến độ nào.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>Đề Tài</th>
                <th>Nhóm</th>
                <th>Kỳ Báo Cáo</th>
                <th>Hạn Nộp</th>
                <th>Trạng Thái</th>
                <th>Nhận Xét</th>
                <th>Điểm</th>
                <th>Trễ Hạn</th>
                <th>Số Lần Chỉnh Sửa</th>
                <th>Ngày Đánh Giá</th>
                <th>Tệp</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.ma_bao_cao}>
                  <td>{report.ten_de_tai}</td>
                  <td>{report.ten_nhom}</td>
                  <td>Kỳ {report.ky_bao_cao}</td>
                  <td>{new Date(report.han_nop).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {report.trang_thai === 'chua_nop' ? 'Chưa nộp' : 
                     report.trang_thai === 'da_nop' ? 'Đã nộp' : 'Đã đánh giá'}
                  </td>
                  <td>{report.nhan_xet_sinh_vien || report.nhan_xet || '-'}</td>
                  <td>{report.diem_tien_do ?? '-'}</td>
                  <td>{report.tre_han ? 'Có' : 'Không'}</td>
                  <td>{report.so_lan_chinh_sua || 0}</td>
                  <td>{report.ngay_danh_gia ? new Date(report.ngay_danh_gia).toLocaleDateString('vi-VN') : '-'}</td>
                  <td>
                    {report.tep_dinh_kem ? (
                      <button className="btn btn-link p-0" onClick={() => handleDownload(report.tep_dinh_kem.split('/').pop())}>
                        Tải xuống
                      </button>
                    ) : '-'}
                  </td>
                  <td>
                    {report.trang_thai === 'da_nop' && (
                      <div className="d-flex flex-column gap-2">
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Điểm (0-100)"
                          value={evaluation.diem_tien_do}
                          onChange={(e) => setEvaluation({ ...evaluation, diem_tien_do: e.target.value })}
                          min="0"
                          max="100"
                        />
                        <textarea
                          className="form-control"
                          placeholder="Nhận xét của giảng viên"
                          value={evaluation.nhan_xet}
                          onChange={(e) => setEvaluation({ ...evaluation, nhan_xet: e.target.value })}
                          rows="3"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => handleEvaluateReport(report.ma_bao_cao)}
                          disabled={submitting}
                        >
                          {submitting ? 'Đang đánh giá...' : 'Đánh Giá'}
                        </button>
                        <textarea
                          className="form-control"
                          placeholder="Lý do yêu cầu nộp bổ sung"
                          value={supplementRequest.ly_do}
                          onChange={(e) => setSupplementRequest({ ...supplementRequest, ly_do: e.target.value })}
                          rows="3"
                        />
                        <button
                          className="btn btn-warning"
                          onClick={() => handleRequestSupplement(report.ma_bao_cao)}
                          disabled={submitting}
                        >
                          {submitting ? 'Đang yêu cầu...' : 'Yêu Cầu Nộp Bổ Sung'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Giangvienbaocao;