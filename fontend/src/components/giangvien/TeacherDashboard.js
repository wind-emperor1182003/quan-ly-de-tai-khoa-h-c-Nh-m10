import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './TeacherDashboard.scss';

const TeacherDashboard = () => {
  const [dangKyGiangVienList, setDangKyGiangVienList] = useState([]);
  const [deTaiList, setDeTaiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNhom, setSelectedNhom] = useState(null);
  const [thanhVienList, setThanhVienList] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [giangVienFilter, setGiangVienFilter] = useState('all');
  const [deTaiFilter, setDeTaiFilter] = useState('all');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Không tìm thấy token, vui lòng đăng nhập lại');
      toast.error('Không tìm thấy token, vui lòng đăng nhập lại', { toastId: 'auth-error' });
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log('Token decoded:', decoded);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        setError('Token đã hết hạn, vui lòng đăng nhập lại');
        toast.error('Token đã hết hạn, vui lòng đăng nhập lại', { toastId: 'auth-error' });
        localStorage.removeItem('token');
        navigate('/login');
        setLoading(false);
        return;
      }

      console.log('Bắt đầu gọi APIs');
      const [dangKyGiangVienResponse, deTaiResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/giangvien/dang-ky-giang-vien/danh-sach', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/giangvien/detai/danh-sach', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log('Phản hồi /dang-ky-giang-vien/danh-sach:', {
        status: dangKyGiangVienResponse.status,
        data: dangKyGiangVienResponse.data,
      });
      console.log('Phản hồi /detai/danh-sach:', {
        status: deTaiResponse.status,
        data: deTaiResponse.data,
      });

      setDangKyGiangVienList(dangKyGiangVienResponse.data);
      setDeTaiList(deTaiResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      const errorMessage = err.response?.data?.message || 'Không thể lấy dữ liệu';
      setError(errorMessage);
      toast.error(errorMessage, { toastId: 'fetch-error' });
      setLoading(false);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleXemThanhVien = async (ma_nhom, ma_dang_ky_gv) => {
    if (!ma_nhom) {
      toast.error('Mã nhóm không hợp lệ', { toastId: 'thanhvien-error' });
      return;
    }

    setModalLoading(true);
    setModalOpen(true);
    setSelectedNhom({ ma_nhom, ma_dang_ky_gv });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token, vui lòng đăng nhập lại');
      }

      const response = await axios.get(
        `http://localhost:5000/api/giangvien/dang-ky-giang-vien/thanh-vien/${ma_nhom}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Phản hồi API thành viên:', {
        status: response.status,
        data: response.data,
      });

      if (!response.data.thanh_vien) {
        console.warn('Không tìm thấy danh sách thành viên:', response.data);
        setThanhVienList([]);
      } else {
        setThanhVienList(response.data.thanh_vien);
      }
      setModalLoading(false);
    } catch (err) {
      console.error('Lỗi lấy danh sách thành viên:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });

      let errorMessage = 'Lỗi khi lấy danh sách thành viên';
      if (err.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại';
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast.error(errorMessage, { toastId: 'thanhvien-error' });
      setModalOpen(false);
      setModalLoading(false);
      setThanhVienList([]);
    }
  };

  const handleDuyetGiangVien = async (ma_dang_ky_gv) => {
    setActionLoading((prev) => ({ ...prev, [ma_dang_ky_gv]: 'duyet' }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/giangvien/dang-ky-giang-vien/duyet',
        { ma_dang_ky_gv },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || 'Duyệt đăng ký giảng viên thành công', {
        toastId: 'duyet-gv-success',
      });
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Lỗi duyệt đăng ký giảng viên:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt đăng ký giảng viên', {
        toastId: 'duyet-gv-error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [ma_dang_ky_gv]: undefined }));
    }
  };

  const handleTuChoiGiangVien = async (ma_dang_ky_gv) => {
    setActionLoading((prev) => ({ ...prev, [ma_dang_ky_gv]: 'tu_choi' }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/giangvien/dang-ky-giang-vien/tu-choi',
        { ma_dang_ky_gv },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || 'Từ chối đăng ký giảng viên thành công', {
        toastId: 'tuchoi-gv-success',
      });
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Lỗi từ chối đăng ký giảng viên:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đăng ký giảng viên', {
        toastId: 'tuchoi-gv-error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [ma_dang_ky_gv]: undefined }));
    }
  };

  const handleDuyetDeTai = async (ma_de_tai) => {
    setActionLoading((prev) => ({ ...prev, [ma_de_tai]: 'duyet' }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/giangvien/detai/duyet',
        { ma_de_tai },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || 'Duyệt đề tài thành công', {
        toastId: 'duyet-detai-success',
      });
      await fetchData();
    } catch (err) {
      console.error('Lỗi duyệt đề tài:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt đề tài', {
        toastId: 'duyet-detai-error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [ma_de_tai]: undefined }));
    }
  };

  const handleTuChoiDeTai = async (ma_de_tai) => {
    setActionLoading((prev) => ({ ...prev, [ma_de_tai]: 'tu_choi' }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/giangvien/detai/tu-choi',
        { ma_de_tai },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || 'Từ chối đề tài thành công', {
        toastId: 'tuchoi-detai-success',
      });
      await fetchData();
    } catch (err) {
      console.error('Lỗi từ chối đề tài:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đề tài', {
        toastId: 'tuchoi-detai-error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [ma_de_tai]: undefined }));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedNhom(null);
    setThanhVienList([]);
  };

  const filteredDangKyGiangVienList = dangKyGiangVienList.filter((item) =>
    giangVienFilter === 'all' ? true : item.trang_thai_dang_ky === giangVienFilter
  );

  const filteredDeTaiList = deTaiList.filter((item) =>
    deTaiFilter === 'all' ? true : item.trang_thai === deTaiFilter
  );

  const giangVienStatusCounts = {
    cho_duyet: dangKyGiangVienList.filter((item) => item.trang_thai_dang_ky === 'cho_duyet').length,
    da_duyet: dangKyGiangVienList.filter((item) => item.trang_thai_dang_ky === 'da_duyet').length,
    tu_choi: dangKyGiangVienList.filter((item) => item.trang_thai_dang_ky === 'tu_choi').length,
  };

  const deTaiStatusCounts = {
    cho_duyet: deTaiList.filter((item) => item.trang_thai === 'cho_duyet').length,
    da_duyet: deTaiList.filter((item) => item.trang_thai === 'da_duyet').length,
    huy: deTaiList.filter((item) => item.trang_thai === 'huy').length,
  };

  return (
    <div className="teacher-dashboard">
      <h2>Quản Lý Đề Tài</h2>
      <ToastContainer />
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <p className="loading">Đang tải...</p>
      ) : (
        <>
          <section className="section">
            <h3>Danh Sách Đăng Ký Giảng Viên</h3>
            <div className="alert">
              Tổng cộng: <span className="alert-count">{dangKyGiangVienList.length}</span> đăng ký
              (Chờ duyệt: <span className="alert-count">{giangVienStatusCounts.cho_duyet}</span>, 
              Đã duyệt: <span className="alert-count">{giangVienStatusCounts.da_duyet}</span>, 
              Từ chối: <span className="alert-count">{giangVienStatusCounts.tu_choi}</span>)
            </div>
            <div className="filter">
              <label>Lọc trạng thái: </label>
              <select
                value={giangVienFilter}
                onChange={(e) => setGiangVienFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="tu_choi">Từ chối</option>
              </select>
            </div>
            {filteredDangKyGiangVienList.length === 0 ? (
              <p>Không có đăng ký giảng viên nào</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Đăng Ký</th>
                    <th>Mã Nhóm</th>
                    <th>Tên Nhóm</th>
                    <th>Tên Trưởng Nhóm</th>
                    <th>Ngày Đăng Ký</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDangKyGiangVienList.map((item) => (
                    <tr key={item.ma_dang_ky_gv}>
                      <td>{item.ma_dang_ky_gv}</td>
                      <td>{item.ma_nhom}</td>
                      <td>{item.ten_nhom}</td>
                      <td>{item.ten_truong_nhom || 'Không xác định'}</td>
                      <td>{new Date(item.ngay_dang_ky).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`status-badge status-${item.trang_thai_dang_ky}`}>
                          {item.trang_thai_dang_ky === 'cho_duyet' ? 'Chờ duyệt' :
                           item.trang_thai_dang_ky === 'da_duyet' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td className="action-buttons">
                        <button
                          className="btn btn-info"
                          onClick={() => handleXemThanhVien(item.ma_nhom, item.ma_dang_ky_gv)}
                          disabled={actionLoading[item.ma_dang_ky_gv]}
                          data-tooltip="Xem danh sách thành viên nhóm"
                        >
                          <i className="fas fa-users"></i>
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={() => handleDuyetGiangVien(item.ma_dang_ky_gv)}
                          disabled={actionLoading[item.ma_dang_ky_gv] || item.trang_thai_dang_ky !== 'cho_duyet'}
                          data-tooltip="Duyệt đăng ký giảng viên"
                        >
                          {actionLoading[item.ma_dang_ky_gv] === 'duyet' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-check"></i>
                          )}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleTuChoiGiangVien(item.ma_dang_ky_gv)}
                          disabled={actionLoading[item.ma_dang_ky_gv] || item.trang_thai_dang_ky !== 'cho_duyet'}
                          data-tooltip="Từ chối đăng ký giảng viên"
                        >
                          {actionLoading[item.ma_dang_ky_gv] === 'tu_choi' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-times"></i>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="section">
            <h3>Danh Sách Đề Tài</h3>
            <div className="alert">
              Tổng cộng: <span className="alert-count">{deTaiList.length}</span> đề tài
              (Chờ duyệt: <span className="alert-count">{deTaiStatusCounts.cho_duyet}</span>, 
              Đã duyệt: <span className="alert-count">{deTaiStatusCounts.da_duyet}</span>, 
              Hủy: <span className="alert-count">{deTaiStatusCounts.huy}</span>)
            </div>
            <div className="filter">
              <label>Lọc trạng thái: </label>
              <select
                value={deTaiFilter}
                onChange={(e) => setDeTaiFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="huy">Hủy</option>
              </select>
            </div>
            {filteredDeTaiList.length === 0 ? (
              <p>Không có đề tài nào</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Đề Tài</th>
                    <th>Tên Đề Tài</th>
                    <th>Mô Tả</th>
                    <th>Mã Nhóm</th>
                    <th>Tên Nhóm</th>
                    <th>Ngày Đăng Ký</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeTaiList.map((deTai) => (
                    <tr key={deTai.ma_de_tai}>
                      <td>{deTai.ma_de_tai}</td>
                      <td>{deTai.ten_de_tai}</td>
                      <td>{deTai.mo_ta || 'Không có mô tả'}</td>
                      <td>{deTai.ma_nhom}</td>
                      <td>{deTai.ten_nhom}</td>
                      <td>{new Date(deTai.ngay_dang_ky).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`status-badge status-${deTai.trang_thai}`}>
                          {deTai.trang_thai === 'cho_duyet' ? 'Chờ duyệt' :
                           deTai.trang_thai === 'da_duyet' ? 'Đã duyệt' : 'Hủy'}
                        </span>
                      </td>
                      <td className="action-buttons">
                        <button
                          className="btn btn-success"
                          onClick={() => handleDuyetDeTai(deTai.ma_de_tai)}
                          disabled={actionLoading[deTai.ma_de_tai] || deTai.trang_thai !== 'cho_duyet'}
                          data-tooltip="Duyệt đề tài này"
                        >
                          {actionLoading[deTai.ma_de_tai] === 'duyet' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-check"></i>
                          )}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleTuChoiDeTai(deTai.ma_de_tai)}
                          disabled={actionLoading[deTai.ma_de_tai] || deTai.trang_thai !== 'cho_duyet'}
                          data-tooltip="Từ chối đề tài này"
                        >
                          {actionLoading[deTai.ma_de_tai] === 'tu_choi' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-times"></i>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {modalOpen && (
            <div className="modal">
              <div className="modal-content">
                <h3>Danh Sách Thành Viên Nhóm {selectedNhom?.ma_nhom || 'Không xác định'}</h3>
                {modalLoading ? (
                  <p>Đang tải danh sách thành viên...</p>
                ) : thanhVienList.length === 0 ? (
                  <p>Nhóm chưa có thành viên hoặc không tồn tại.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mã Sinh Viên</th>
                        <th>Họ Tên</th>
                        <th>Số Điện Thoại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thanhVienList.map((thanhVien) => (
                        <tr key={thanhVien.ma_so}>
                          <td>{thanhVien.ma_so}</td>
                          <td>{thanhVien.ho_ten}</td>
                          <td>{thanhVien.sdt || 'Không có'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="modal-actions">
                  {selectedNhom?.ma_dang_ky_gv && (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => handleDuyetGiangVien(selectedNhom.ma_dang_ky_gv)}
                        disabled={actionLoading[selectedNhom.ma_dang_ky_gv] || modalLoading}
                        data-tooltip="Duyệt đăng ký giảng viên"
                      >
                        {actionLoading[selectedNhom.ma_dang_ky_gv] === 'duyet' ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-check"></i>
                        )}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleTuChoiGiangVien(selectedNhom.ma_dang_ky_gv)}
                        disabled={actionLoading[selectedNhom.ma_dang_ky_gv] || modalLoading}
                        data-tooltip="Từ chối đăng ký giảng viên"
                      >
                        {actionLoading[selectedNhom.ma_dang_ky_gv] === 'tu_choi' ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-times"></i>
                        )}
                      </button>
                    </>
                  )}
                  <button className="btn btn-secondary" onClick={closeModal} data-tooltip="Đóng">
                    <i className="fas fa-times-circle"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;