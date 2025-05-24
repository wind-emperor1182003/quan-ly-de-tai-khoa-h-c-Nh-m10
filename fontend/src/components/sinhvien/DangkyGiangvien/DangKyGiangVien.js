import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import './DangKyGiangVien.scss';

const DangKyGiangVien = () => {
  const [user, setUser] = useState(null);
  const [nhom, setNhom] = useState(null);
  const [maGiangVien, setMaGiangVien] = useState('');
  const [giangVienList, setGiangVienList] = useState([]);
  const [dangKyGiangVien, setDangKyGiangVien] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Không tìm thấy token, vui lòng đăng nhập lại');
      navigate('/');
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        setError('Token đã hết hạn, vui lòng đăng nhập lại');
        localStorage.removeItem('token');
        navigate('/');
        setLoading(false);
        return;
      }

      console.log('Bắt đầu gọi APIs');
      const [userResponse, nhomResponse, giangVienResponse, dangKyGiangVienResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/nhom/thanh-vien', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/dang-ky-giang-vien/giangvien/danh-sach', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/dang-ky-giang-vien/thong-tin', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: null })),
      ]);

      if (userResponse.status !== 200) {
        throw new Error('Không thể lấy thông tin người dùng');
      }
      if (nhomResponse.status !== 200) {
        throw new Error('Không thể lấy thông tin nhóm');
      }
      if (giangVienResponse.status !== 200) {
        throw new Error(giangVienResponse.data?.message || 'Không thể lấy danh sách giảng viên');
      }

      setUser(userResponse.data);
      const nhomData = nhomResponse.data;
      setNhom(nhomData);
      console.log('Dữ liệu nhóm từ API /nhom/thanh-vien:', nhomData);
      if (nhomData) {
        const truongNhom = nhomData.thanh_vien?.find((tv) => tv.ma_so === nhomData.ma_so_nhom_truong);
        console.log('Trưởng nhóm:', truongNhom ? truongNhom.ho_ten : 'Không tìm thấy');
        if (!truongNhom) {
          console.warn('Không tìm thấy trưởng nhóm trong danh sách thành viên:', {
            ma_so_nhom_truong: nhomData.ma_so_nhom_truong,
            danh_sach_thanh_vien: nhomData.thanh_vien?.map((tv) => ({
              ma_so: tv.ma_so,
              ho_ten: tv.ho_ten,
            })) || [],
          });
        }
      }

      if (giangVienResponse.data.length === 0) {
        setError('Không tìm thấy giảng viên nào');
      } else {
        console.log('Danh sách giảng viên:', giangVienResponse.data);
        setGiangVienList(giangVienResponse.data);
      }
      console.log('Thông tin đăng ký giảng viên:', dangKyGiangVienResponse.data);
      setDangKyGiangVien(dangKyGiangVienResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi tải dữ liệu';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  }, [navigate]);

  useEffect(() => {
    console.log('useEffect chạy');
    fetchData();
    return () => {
      console.log('Cleanup useEffect');
    };
  }, [fetchData]);

  useEffect(() => {
    console.log('Trạng thái dangKyGiangVien cập nhật:', dangKyGiangVien);
  }, [dangKyGiangVien]);

  const handleRegisterGiangVien = async (e) => {
    e.preventDefault();
    if (!nhom) {
      toast.error('Bạn chưa có nhóm');
      return;
    }
    if (nhom.ma_so_nhom_truong !== user.ma_so) {
      toast.error('Chỉ nhóm trưởng mới có thể đăng ký giảng viên');
      return;
    }
    if (nhom.trang_thai_nhom !== 'hop_le') {
      toast.error('Nhóm chưa hợp lệ');
      return;
    }
    if (!maGiangVien) {
      toast.error('Vui lòng chọn giảng viên');
      return;
    }
    setSubmitLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Không tìm thấy token, vui lòng đăng nhập lại');
      setSubmitLoading(false);
      navigate('/');
      return;
    }

    console.log('Gửi yêu cầu đăng ký giảng viên:', {
      ma_nhom: nhom.ma_nhom,
      ma_so_giang_vien: maGiangVien,
    });

    try {
      const response = await axios.post(
        'http://localhost:5000/api/dang-ky-giang-vien',
        {
          ma_nhom: nhom.ma_nhom,
          ma_so_giang_vien: maGiangVien,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Phản hồi đăng ký giảng viên:', response.data);
      toast.success(response.data.message);

      // Lấy thông tin đăng ký ngay lập tức
      const dangKyGiangVienResponse = await axios.get(
        'http://localhost:5000/api/dang-ky-giang-vien/thong-tin',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Thông tin đăng ký mới:', dangKyGiangVienResponse.data);
      setDangKyGiangVien(dangKyGiangVienResponse.data);
      setMaGiangVien('');
    } catch (err) {
      console.error('Lỗi đăng ký giảng viên:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        details: err.response?.data?.details || err.message,
      });
      const errorMessage = err.response?.data?.message || 'Lỗi đăng ký giảng viên';
      toast.error(errorMessage);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      } else {
        // Vẫn cố gắng làm mới dữ liệu nếu lỗi không phải 401
        await fetchData();
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="dang-ky-giang-vien-page">
      <main className="dang-ky-giang-vien-container">
        <h2>Đăng Ký Giảng Viên Hướng Dẫn</h2>
        {loading && <p className="loading">Đang tải...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <div className="content">
            {dangKyGiangVien ? (
              <div className="giang-vien-info">
                <h3>Thông Tin Đăng Ký Giảng Viên</h3>
                <p><strong>Tên Giảng Viên:</strong> {dangKyGiangVien.ten_giang_vien}</p>
                <p><strong>Nhóm:</strong> {dangKyGiangVien.ma_nhom}</p>
                <p>
                  <strong>Trạng Thái:</strong>{' '}
                  {dangKyGiangVien.trang_thai_dang_ky === 'cho_duyet'
                    ? 'Chờ duyệt'
                    : dangKyGiangVien.trang_thai_dang_ky === 'da_duyet'
                    ? 'Đã duyệt'
                    : 'Từ chối'}
                </p>
                <p>
                  <strong>Ngày Đăng Ký:</strong>{' '}
                  {new Date(dangKyGiangVien.ngay_dang_ky).toLocaleDateString()}
                </p>
                {dangKyGiangVien.trang_thai_dang_ky === 'tu_choi' && nhom && nhom.trang_thai_nhom === 'hop_le' && nhom.ma_so_nhom_truong === user.ma_so ? (
                  <div className="register-form-container">
                    <h3>Đăng Ký Lại Giảng Viên</h3>
                    <div className="group-info">
                      <p><strong>Tên Nhóm:</strong> {nhom.ten_nhom}</p>
                      <p>
                        <strong>Trưởng Nhóm:</strong>{' '}
                        {nhom.thanh_vien.find((tv) => tv.ma_so === nhom.ma_so_nhom_truong)?.ho_ten ||
                          'Không xác định'}
                      </p>
                      <p><strong>Số lượng:</strong> {nhom.so_luong_thanh_vien}/5</p>
                    </div>
                    <div className="register-form">
                      <form onSubmit={handleRegisterGiangVien}>
                        <div className="form-group">
                          <label htmlFor="maGiangVien">Chọn Giảng Viên Hướng Dẫn</label>
                          <select
                            id="maGiangVien"
                            className="form-control"
                            value={maGiangVien}
                            onChange={(e) => setMaGiangVien(e.target.value)}
                            required
                          >
                            <option value="">-- Chọn giảng viên --</option>
                            {giangVienList.map((gv) => (
                              <option key={gv.ma_so} value={gv.ma_so}>
                                {gv.ho_ten}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className={`btn btn-gradient ${submitLoading ? 'loading' : ''}`}
                          disabled={submitLoading || giangVienList.length === 0}
                        >
                          {submitLoading ? 'Đang đăng ký...' : 'Đăng Ký Lại Giảng Viên'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
                <button
                  className="btn btn-gradient"
                  onClick={() => navigate('/student?tab=group')}
                >
                  Quay Lại
                </button>
              </div>
            ) : nhom ? (
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
                      <p><strong>Số lượng:</strong> {nhom.so_luong_thanh_vien}/5</p>
                    </div>
                    <div className="register-form">
                      <form onSubmit={handleRegisterGiangVien}>
                        <div className="form-group">
                          <label htmlFor="maGiangVien">Chọn Giảng Viên Hướng Dẫn</label>
                          <select
                            id="maGiangVien"
                            className="form-control"
                            value={maGiangVien}
                            onChange={(e) => setMaGiangVien(e.target.value)}
                            required
                          >
                            <option value="">-- Chọn giảng viên --</option>
                            {giangVienList.map((gv) => (
                              <option key={gv.ma_so} value={gv.ma_so}>
                                {gv.ho_ten}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className={`btn btn-gradient ${submitLoading ? 'loading' : ''}`}
                          disabled={submitLoading || giangVienList.length === 0}
                        >
                          {submitLoading ? 'Đang đăng ký...' : 'Đăng Ký Giảng Viên'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <p className="error">Chỉ nhóm trưởng mới có thể đăng ký giảng viên.</p>
                )
              ) : (
                <p className="error">Nhóm chưa đủ thành viên hoặc chưa hợp lệ.</p>
              )
            ) : (
              <p className="error">Bạn chưa có nhóm. Vui lòng tạo hoặc tham gia nhóm trước.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DangKyGiangVien;