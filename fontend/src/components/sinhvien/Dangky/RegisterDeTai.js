import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './RegisterDeTai.scss';

const RegisterDeTai = () => {
  const [user, setUser] = useState(null);
  const [nhom, setNhom] = useState(null);
  const [tenDeTai, setTenDeTai] = useState('');
  const [moTa, setMoTa] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [danhSachDeTai, setDanhSachDeTai] = useState([]);
  const [deTaiInfo, setDeTaiInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!loading) return;
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Không tìm thấy token, vui lòng đăng nhập lại', { toastId: 'auth-error' });
      navigate('/');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.error('Token đã hết hạn, vui lòng đăng nhập lại', { toastId: 'auth-error' });
        localStorage.removeItem('token');
        navigate('/');
        return;
      }
    } catch (err) {
      toast.error('Token không hợp lệ, vui lòng đăng nhập lại', { toastId: 'auth-error' });
      localStorage.removeItem('token');
      navigate('/');
      return;
    }

    try {
      const [userResponse, nhomResponse, danhSachDeTaiResponse, deTaiInfoResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/nhom/thanh-vien', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/sinhvien/detai/danh-sach', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/sinhvien/detai/thong-tin', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: null })),
      ]);

      console.log('User:', userResponse.data);
      console.log('Nhóm:', nhomResponse.data);
      console.log('Danh sách đề tài:', danhSachDeTaiResponse.data);
      console.log('Thông tin đề tài:', deTaiInfoResponse.data);

      setUser(userResponse.data);
      setNhom(nhomResponse.data);
      setDanhSachDeTai(danhSachDeTaiResponse.data || []);
      setDeTaiInfo(deTaiInfoResponse.data || null);

      if (deTaiInfoResponse.data && deTaiInfoResponse.data.trang_thai === 'huy') {
        setTenDeTai(deTaiInfoResponse.data.ten_de_tai);
        setMoTa(deTaiInfoResponse.data.mo_ta);
      }
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Lỗi tải dữ liệu', { toastId: 'fetch-error' });
      setLoading(false);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  }, [navigate, loading]);

  useEffect(() => {
    console.log('useEffect chạy');
    fetchData();
    return () => {
      console.log('Cleanup useEffect');
      toast.dismiss();
    };
  }, [fetchData]);

  useEffect(() => {
    console.log('showConfirmModal thay đổi:', showConfirmModal);
  }, [showConfirmModal]);

  const handleRegisterDeTai = async (e) => {
    try {
      e.preventDefault();
      console.log('handleRegisterDeTai được gọi, tenDeTai:', tenDeTai, 'moTa:', moTa);
      if (!tenDeTai.trim() || !moTa.trim()) {
        console.log('Dữ liệu rỗng, không hiển thị modal');
        toast.error('Vui lòng nhập đầy đủ tên đề tài và mô tả', { toastId: 'validation-error' });
        return;
      }
      setShowConfirmModal((prev) => {
        console.log('Cũ:', prev, 'Mới: true');
        return true;
      });
      console.log('Đã gọi setShowConfirmModal(true)');
    } catch (err) {
      console.error('Lỗi trong handleRegisterDeTai:', err);
      toast.error('Lỗi khi xử lý đăng ký đề tài', { toastId: 'submit-error' });
    }
  };

  const confirmRegister = async () => {
    console.log('confirmRegister được gọi, submitLoading:', submitLoading);
    if (submitLoading) return;

    toast.dismiss();

    if (!nhom) {
      toast.error('Bạn chưa có nhóm', { toastId: 'validation-error' });
      setShowConfirmModal(false);
      return;
    }
    if (nhom.ma_so_nhom_truong !== user.ma_so) {
      toast.error('Chỉ nhóm trưởng mới có thể đăng ký đề tài', { toastId: 'validation-error' });
      setShowConfirmModal(false);
      return;
    }
    if (nhom.trang_thai_nhom !== 'hop_le') {
      toast.error('Nhóm chưa hợp lệ', { toastId: 'validation-error' });
      setShowConfirmModal(false);
      return;
    }
    if (tenDeTai.trim().length < 5) {
      toast.error('Tên đề tài phải có ít nhất 5 ký tự', { toastId: 'validation-error' });
      setShowConfirmModal(false);
      return;
    }
    if (moTa.trim().length < 10) {
      toast.error('Mô tả phải có ít nhất 10 ký tự', { toastId: 'validation-error' });
      setShowConfirmModal(false);
      return;
    }

    setSubmitLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Không tìm thấy token, vui lòng đăng nhập lại', { toastId: 'auth-error' });
      setSubmitLoading(false);
      setShowConfirmModal(false);
      navigate('/');
      return;
    }

    const payload = {
      ten_de_tai: tenDeTai.trim(),
      mo_ta: moTa.trim(),
      ma_nhom: nhom.ma_nhom,
      ma_de_tai: deTaiInfo && deTaiInfo.trang_thai === 'huy' ? deTaiInfo.ma_de_tai : undefined,
    };
    console.log('Gửi API với payload:', payload);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/sinhvien/detai/register',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Phản hồi API:', response.data);

      setDeTaiInfo(response.data.de_tai);
      setDanhSachDeTai((prev) => {
        if (deTaiInfo && deTaiInfo.trang_thai === 'huy') {
          return prev.map((dt) =>
            dt.ma_de_tai === response.data.de_tai.ma_de_tai ? response.data.de_tai : dt
          );
        }
        return [...prev, response.data.de_tai];
      });

      toast.success(response.data.message, {
        toastId: 'register-success',
        autoClose: 3000,
      });

      setTenDeTai('');
      setMoTa('');
      setSubmitLoading(false);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Lỗi đăng ký:', err.response?.data || err.message);
      setSubmitLoading(false);
      setShowConfirmModal(false);

      if (err.response?.status === 400) {
        toast.error(err.response.data.message, { toastId: 'register-error' });
      } else if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.', { toastId: 'auth-error' });
      } else {
        toast.error(err.response?.data?.message || 'Lỗi server khi đăng ký đề tài', {
          toastId: 'register-error',
        });
      }
    }
  };

  const handleCloseDeTaiInfo = () => {
    setDeTaiInfo(null);
    navigate('/student?tab=group');
  };

  console.log('Render với state:', { loading, deTaiInfo, danhSachDeTai, submitLoading, showConfirmModal });

  if (!user && !loading) return null;

  return (
    <div className="register-detai-page">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
      />
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      {showConfirmModal && (
        console.log('Rendering modal'),
        <div className="modal">
          <div className="modal-content">
            <h3>Xác Nhận {deTaiInfo && deTaiInfo.trang_thai === 'huy' ? 'Cập Nhật' : 'Đăng Ký'}</h3>
            <p>
              Bạn có chắc muốn {deTaiInfo && deTaiInfo.trang_thai === 'huy' ? 'cập nhật' : 'đăng ký'} đề tài "
              <strong>{tenDeTai}</strong>" không?
            </p>
            <div className="modal-buttons">
              <button className="confirm" onClick={confirmRegister} disabled={submitLoading}>
                Xác Nhận
              </button>
              <button className="cancel" onClick={() => setShowConfirmModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="register-detai-container">
        <h2>Đăng Ký Đề Tài</h2>
        {!loading && (
          <div className="content">
            {deTaiInfo ? (
              <div className="detai-info">
                <h3>Thông Tin Đề Tài</h3>
                {deTaiInfo.trang_thai === 'cho_duyet' && (
                  <p className="success-message">Đăng ký đề tài thành công, đang chờ duyệt!</p>
                )}
                <p><strong>Mã Đề Tài:</strong> {deTaiInfo.ma_de_tai}</p>
                <p><strong>Tên Đề Tài:</strong> {deTaiInfo.ten_de_tai}</p>
                <p><strong>Mô Tả:</strong> {deTaiInfo.mo_ta}</p>
                <p><strong>Nhóm:</strong> {deTaiInfo.ma_nhom}</p>
                <p><strong>Giảng Viên:</strong> {deTaiInfo.ten_giang_vien || 'Chưa xác định'}</p>
                <p>
                  <strong>Trạng Thái:</strong>{' '}
                  {deTaiInfo.trang_thai === 'cho_duyet'
                    ? 'Chờ duyệt'
                    : deTaiInfo.trang_thai === 'da_duyet'
                    ? 'Đã duyệt'
                    : deTaiInfo.trang_thai === 'dang_thuc_hien'
                    ? 'Đang thực hiện'
                    : deTaiInfo.trang_thai === 'hoan_thanh'
                    ? 'Hoàn thành'
                    : deTaiInfo.trang_thai === 'huy'
                    ? 'Hủy'
                    : 'Không xác định'}
                </p>
                <p><strong>Ngày Tạo:</strong> {new Date(deTaiInfo.ngay_tao).toLocaleDateString('vi-VN')}</p>
                {deTaiInfo.trang_thai === 'huy' && nhom && nhom.trang_thai_nhom === 'hop_le' && nhom.ma_so_nhom_truong === user.ma_so ? (
                  <div className="register-form-container">
                    <h3>Cập Nhật Đề Tài</h3>
                    <div className="group-info">
                      <p><strong>Tên Nhóm:</strong> {nhom.ten_nhom}</p>
                      <p>
                        <strong>Trưởng Nhóm:</strong>{' '}
                        {nhom.thanh_vien.find((tv) => tv.ma_so === nhom.ma_so_nhom_truong)?.ho_ten || 'Không xác định'}
                      </p>
                      <p><strong>Số lượng:</strong> {nhom.so_luong_thanh_vien}/{nhom.so_luong_sinh_vien_toi_da}</p>
                    </div>
                    <div className="register-form">
                      <form
                        onSubmit={(e) => {
                          console.log('Form submit triggered');
                          handleRegisterDeTai(e);
                        }}
                      >
                        <div className="form-group">
                          <label htmlFor="tenDeTai">Tên Đề Tài</label>
                          <input
                            id="tenDeTai"
                            type="text"
                            className="form-control"
                            value={tenDeTai}
                            onChange={(e) => setTenDeTai(e.target.value)}
                            placeholder="Nhập tên đề tài (tối thiểu 5 ký tự)"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="moTa">Mô Tả</label>
                          <textarea
                            id="moTa"
                            className="form-control"
                            value={moTa}
                            onChange={(e) => setMoTa(e.target.value)}
                            placeholder="Nhập mô tả đề tài (tối thiểu 10 ký tự)"
                            rows="4"
                          ></textarea>
                        </div>
                        <button
                          type="submit"
                          className={`btn btn-gradient ${submitLoading ? 'loading' : ''}`}
                          disabled={submitLoading}
                        >
                          {submitLoading ? 'Đang cập nhật...' : 'Cập Nhật Đề Tài'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
                <button className="btn btn-gradient" onClick={handleCloseDeTaiInfo}>
                  Đóng
                </button>
              </div>
            ) : (
              nhom ? (
                nhom.trang_thai_nhom === 'hop_le' ? (
                  nhom.ma_so_nhom_truong === user.ma_so ? (
                    <div className="register-form-container">
                      <div className="group-info">
                        <p><strong>Tên Nhóm:</strong> {nhom.ten_nhom}</p>
                        <p>
                          <strong>Trưởng Nhóm:</strong>{' '}
                          {nhom.thanh_vien.find((tv) => tv.ma_so === nhom.ma_so_nhom_truong)?.ho_ten ||
                            'Không xác định'}
                        </p>
                        <p><strong>Số lượng:</strong> {nhom.so_luong_thanh_vien}/{nhom.so_luong_sinh_vien_toi_da}</p>
                      </div>
                      <div className="register-form">
                        <form
                          onSubmit={(e) => {
                            console.log('Form submit triggered');
                            handleRegisterDeTai(e);
                          }}
                        >
                          <div className="form-group">
                            <label htmlFor="tenDeTai">Tên Đề Tài</label>
                            <input
                              id="tenDeTai"
                              type="text"
                              className="form-control"
                              value={tenDeTai}
                              onChange={(e) => setTenDeTai(e.target.value)}
                              placeholder="Nhập tên đề tài (tối thiểu 5 ký tự)"
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="moTa">Mô Tả</label>
                            <textarea
                              id="moTa"
                              className="form-control"
                              value={moTa}
                              onChange={(e) => setMoTa(e.target.value)}
                              placeholder="Nhập mô tả đề tài (tối thiểu 10 ký tự)"
                              rows="4"
                            ></textarea>
                          </div>
                          <button
                            type="submit"
                            className={`btn btn-gradient ${submitLoading ? 'loading' : ''}`}
                            disabled={submitLoading}
                          >
                            {submitLoading ? 'Đang đăng ký...' : 'Đăng Ký Đề Tài'}
                          </button>
                        </form>
                        {danhSachDeTai.length > 0 && (
                          <div className="danh-sach-detai">
                            <h3>Danh Sách Đề Tài Đã Đăng Ký</h3>
                            <ul>
                              {danhSachDeTai.map((dt) => (
                                <li key={dt.ma_de_tai}>
                                  <strong>{dt.ten_de_tai}</strong> (Nhóm: {dt.ma_nhom}, Giảng Viên:{' '}
                                  {dt.ten_giang_vien || 'Không xác định'}, Trạng Thái:{' '}
                                  {dt.trang_thai === 'cho_duyet'
                                    ? 'Chờ duyệt'
                                    : dt.trang_thai === 'da_duyet'
                                    ? 'Đã duyệt'
                                    : dt.trang_thai === 'dang_thuc_hien'
                                    ? 'Đang thực hiện'
                                    : dt.trang_thai === 'hoan_thanh'
                                    ? 'Hoàn thành'
                                    : dt.trang_thai === 'huy'
                                    ? 'Hủy'
                                    : 'Không xác định'})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="error">Chỉ nhóm trưởng mới có thể đăng ký đề tài.</p>
                  )
                ) : (
                  <p className="error">Nhóm chưa đủ thành viên hoặc chưa hợp lệ để đăng ký đề tài.</p>
                )
              ) : (
                <p className="error">Bạn chưa có nhóm. Vui lòng tạo hoặc tham gia nhóm trước.</p>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RegisterDeTai;