import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import './Sinhvienbaocao.scss';

const Sinhvienbaocao = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNhomTruong, setIsNhomTruong] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [nhanXet, setNhanXet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setError('Vui lòng đăng nhập');
      return;
    }

    const decoded = jwtDecode(token);
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportResponse, nhomResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/sinhvien/baocao/danh-sach', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/nhom/thanh-vien', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setReports(reportResponse.data);
        setIsNhomTruong(nhomResponse.data?.ma_so_nhom_truong === decoded.ma_so);
      } catch (err) {
        setError(err.response?.data?.message || 'Lỗi tải dữ liệu');
        toast.error(err.response?.data?.message || 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setSelectedFile(file);
    } else {
      toast.error('Chỉ chấp nhận file PDF, DOC, DOCX');
    }
  };

  const handleSubmitReport = async (ma_bao_cao) => {
    if (!isNhomTruong) {
      toast.error('Chỉ trưởng nhóm được nộp báo cáo');
      return;
    }
    if (!selectedFile) {
      toast.error('Vui lòng chọn tệp báo cáo');
      return;
    }

    const formData = new FormData();
    formData.append('ma_bao_cao', ma_bao_cao);
    formData.append('nhan_xet_sinh_vien', nhanXet);
    formData.append('tep_dinh_kem', selectedFile);

    setSubmitting(true);
    try {
      await axios.post('http://localhost:5000/api/sinhvien/baocao/nop', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Nộp báo cáo thành công');
      setReports(reports.map((report) =>
        report.ma_bao_cao === ma_bao_cao
          ? { 
              ...report, 
              trang_thai: 'da_nop', 
              ngay_nop: new Date().toISOString().split('T')[0], 
              nhan_xet_sinh_vien: nhanXet,
              tre_han: new Date() > new Date(report.han_nop) ? 1 : 0,
              so_lan_chinh_sua: report.ngay_nop ? (report.so_lan_chinh_sua || 0) + 1 : 0
            }
          : report
      ));
      setSelectedFile(null);
      setNhanXet('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nộp báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sinhvien/baocao/tep/${filename}`, {
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
    <div className="sinhvien-baocao container mt-5">
      <h2 className="mb-4">Báo Cáo Tiến Độ</h2>
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
                    {report.trang_thai === 'chua_nop' && isNhomTruong && (
                      <div className="d-flex flex-column gap-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="form-control"
                        />
                        <textarea
                          className="form-control"
                          placeholder="Nhận xét của nhóm"
                          value={nhanXet}
                          onChange={(e) => setNhanXet(e.target.value)}
                          rows="3"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSubmitReport(report.ma_bao_cao)}
                          disabled={submitting}
                        >
                          {submitting ? 'Đang nộp...' : report.so_lan_chinh_sua > 0 ? 'Nộp Lại Báo Cáo' : 'Nộp Báo Cáo'}
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

export default Sinhvienbaocao;