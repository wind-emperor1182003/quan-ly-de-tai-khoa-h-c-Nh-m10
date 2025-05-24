import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl,
  Dropdown, OverlayTrigger, Popover, FormCheck, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { FaCheck, FaEdit, FaTimes, FaUsers, FaFileAlt, FaBell, FaCalendar, FaChartLine } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import './StudentDashboard.scss';

const RegisterDeTai = ({ onCreateNhom, danhSachNhom }) => {
  const [tenNhom, setTenNhom] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const validateTenNhom = (ten) => {
    if (ten.length < 3) return 'Tên nhóm phải có ít nhất 3 ký tự';
    if (!/^[\p{L}\p{N}\s]+$/u.test(ten)) return 'Tên nhóm không được chứa ký tự đặc biệt';
    return '';
  };

  const handleCreateNhom = async (e) => {
    e.preventDefault();
    const error = validateTenNhom(tenNhom);
    if (error) {
      setLocalError(error);
      toast.error(error);
      return;
    }

    if (!window.confirm('Bạn có chắc muốn tạo nhóm với tên này?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/nhom/create',
        { ten_nhom: tenNhom.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Tạo nhóm thành công!');
      setTenNhom('');
      setLocalError('');
      onCreateNhom(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi tạo nhóm';
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTenNhom('');
    setLocalError('');
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body>
        <h2 className="gradient-text">Đăng Ký Nhóm</h2>
        <p className="text-muted mb-4">
          Nhập tên nhóm để tạo nhóm mới. Tên nhóm phải có ít nhất 3 ký tự và không chứa ký tự đặc biệt.
          <br />
          Hiện có <strong>{danhSachNhom.length}</strong> nhóm trong hệ thống.
        </p>
        <Form onSubmit={handleCreateNhom}>
          <Form.Group className="mb-3">
            <Form.Label>Tên nhóm</Form.Label>
            <FormControl
              type="text"
              value={tenNhom}
              onChange={(e) => {
                setTenNhom(e.target.value);
                setLocalError('');
              }}
              placeholder="Ví dụ: Nhóm Công Nghệ 01"
              required
              disabled={loading}
            />
            {localError && <p className="text-danger mt-2">{localError}</p>}
          </Form.Group>
          <div className="d-flex">
            <Button
              type="submit"
              className="modern-btn me-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Nhóm'
              )}
            </Button>
            <Button
              variant="secondary"
              className="modern-btn"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [user, setUser] = useState(null);
  const [nhom, setNhom] = useState(null);
  const [deTai, setDeTai] = useState([]);
  const [baoCaoTienDo, setBaoCaoTienDo] = useState([]);
  const [sinhVienChuaCoNhom, setSinhVienChuaCoNhom] = useState([]);
  const [danhSachNhom, setDanhSachNhom] = useState([]);
  const [loiXinNhom, setLoiXinNhom] = useState([]);
  const [thongBao, setThongBao] = useState([]);
  const [lichBaoVe, setLichBaoVe] = useState([]);
  const [diemBaoVe, setDiemBaoVe] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setUser(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy thông tin người dùng');
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    const fetchNhom = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/thanh-vien', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        if (response.data) {
          setNhom(response.data);
          const params = new URLSearchParams(location.search);
          const tab = params.get('tab');
          const validGroupTabs = [
            'thanh-vien', 'de-tai', 'lich-bao-ve', 'bao-cao-tien-do',
            'moi-thanh-vien', 'loi-xin', 'notifications', 'diem-bao-ve',
          ];
          if (!tab || !validGroupTabs.includes(tab)) {
            setActiveTab('thanh-vien');
            navigate('/student?tab=thanh-vien', { replace: true });
          } else {
            setActiveTab(tab);
          }
        } else {
          const params = new URLSearchParams(location.search);
          const tab = params.get('tab') || 'register';
          if (tab !== 'register' && tab !== 'xin-vao-nhom') {
            setActiveTab('register');
            navigate('/student?tab=register', { replace: true });
          } else {
            setActiveTab(tab);
          }
        }
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy thông tin nhóm');
      }
    };

    const fetchDanhSachNhom = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/danh-sach', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setDanhSachNhom(response.data);
        setError('');
      } catch (err) {
        setError('Không thể lấy danh sách nhóm');
      }
    };

    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([fetchUser(), fetchNhom(), fetchDanhSachNhom()]);
      setTimeout(() => setIsLoading(false), 500);
    };

    initialize();
  }, [navigate, location.search]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !nhom) return;

    const fetchDeTai = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/detai/thong-tin', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        let deTaiData = Array.isArray(response.data.de_tai) ? response.data.de_tai :
          response.data.ma_de_tai ? [response.data] : [];
        setDeTai(deTaiData);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy thông tin đề tài');
        setDeTai([]);
      }
    };

    const fetchBaoCaoTienDo = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/bao-cao-tien-do', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setBaoCaoTienDo(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy danh sách báo cáo tiến độ');
        setBaoCaoTienDo([]);
      }
    };

    const fetchThongBao = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/thong-bao', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setThongBao(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy danh sách thông báo');
        setThongBao([]);
      }
    };

    const fetchLichBaoVe = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/lich-bao-ve/nhom', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setLichBaoVe(response.data.lichBaoVe || []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy danh sách lịch bảo vệ');
        setLichBaoVe([]);
      }
    };

    const fetchDiemBaoVe = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/diem-bao-ve', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        setDiemBaoVe(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể lấy điểm bảo vệ');
        setDiemBaoVe(null);
      }
    };

    Promise.all([fetchDeTai(), fetchBaoCaoTienDo(), fetchThongBao(), fetchLichBaoVe(), fetchDiemBaoVe()]);
  }, [nhom]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !nhom || !user || user.ma_so !== nhom.ma_so_nhom_truong) return;

    const fetchLoiXinNhom = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/loi-xin', {
          headers: { Authorization: `Bearer ${token}` },
          params: { ma_nhom: nhom.ma_nhom },
          timeout: 5000,
        });
        setLoiXinNhom(response.data);
        setError('');
      } catch (err) {
        setError('Không thể lấy lời xin nhóm');
      }
    };

    const fetchSinhVienChuaCoNhom = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nhom/sinhvien/chua-co-nhom', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSinhVienChuaCoNhom(response.data);
        setError('');
      } catch (err) {
        setError('Không thể lấy danh sách sinh viên chưa có nhóm');
      }
    };

    Promise.all([fetchLoiXinNhom(), fetchSinhVienChuaCoNhom()]);
  }, [nhom, user]);

  const handleXinVaoNhom = async (ma_nhom) => {
    const token = localStorage.getItem('token');
    if (!token || !ma_nhom) {
      toast.error('Dữ liệu không hợp lệ');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/xin-vao-nhom',
        { ma_nhom },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      toast.success('Gửi lời xin vào nhóm thành công');
      const response = await axios.get('http://localhost:5000/api/nhom/danh-sach', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setDanhSachNhom(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi lời xin');
    }
  };

  const handleDuyetLoiXin = async (ma_loi_xin) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/duyet-loi-xin',
        { ma_loi_xin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Duyệt lời xin thành công');
      const response = await axios.get('http://localhost:5000/api/nhom/thanh-vien', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNhom(response.data);
      setLoiXinNhom(loiXinNhom.filter((xin) => xin.ma_loi_xin !== ma_loi_xin));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt lời xin');
    }
  };

  const handleTuChoiLoiXin = async (ma_loi_xin) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/tu-choi-loi-xin',
        { ma_loi_xin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Từ chối lời xin thành công');
      setLoiXinNhom(loiXinNhom.filter((xin) => xin.ma_loi_xin !== ma_loi_xin));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối lời xin');
    }
  };

  const handleMoiThanhVien = async (ma_so_sinh_vien) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/moi',
        { ma_nhom: nhom?.ma_nhom, ma_so_sinh_vien },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Gửi lời mời thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  const handleXoaThanhVien = async (ma_so_sinh_vien) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/xoa-thanh-vien',
        { ma_nhom: nhom?.ma_nhom, ma_so_sinh_vien },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get('http://localhost:5000/api/nhom/thanh-vien', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setNhom(response.data);
      } else {
        setNhom(null);
        setActiveTab('register');
        navigate('/student?tab=register', { replace: true });
      }
      toast.success('Xóa thành viên thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa thành viên');
    }
  };

  const handleXemThongBao = async (ma_thong_bao) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/nhom/thong-bao/xem',
        { ma_thong_bao },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setThongBao(
        thongBao.map((tb) =>
          tb.ma_thong_bao === ma_thong_bao ? { ...tb, trang_thai: 'da_xem' } : tb
        )
      );
      toast.success('Đã đánh dấu thông báo là đã xem');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đánh dấu thông báo');
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const XinVaoNhom = () => {
    const totalPages = Math.ceil(danhSachNhom.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedNhom = danhSachNhom.slice(startIndex, startIndex + itemsPerPage);

    return (
      <Card className="shadow-sm">
        <Card.Body>
          <h2 className="gradient-text">Xin Vào Nhóm</h2>
          {isLoading ? (
            <Table responsive className="modern-table">
              <tbody>
                {Array.from({ length: itemsPerPage }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-row">
                    <td><div className="skeleton" /></td>
                    <td><div className="skeleton" /></td>
                    <td><div className="skeleton" /></td>
                    <td><div className="skeleton" /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : danhSachNhom.length > 0 ? (
            <>
              <Table responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Tên nhóm</th>
                    <th>Nhóm trưởng</th>
                    <th>Số lượng</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNhom.map((nhom) => (
                    <tr key={nhom.ma_nhom} className="slide-in">
                      <td>{nhom.ten_nhom}</td>
                      <td>{nhom.ten_nhom_truong}</td>
                      <td>{`${nhom.so_luong_thanh_vien}/${nhom.so_luong_sinh_vien_toi_da}`}</td>
                      <td>
                        <Button
                          className="modern-btn"
                          onClick={() => handleXinVaoNhom(nhom.ma_nhom)}
                          disabled={nhom.so_luong_thanh_vien >= nhom.so_luong_sinh_vien_toi_da}
                        >
                          {nhom.so_luong_thanh_vien >= nhom.so_luong_sinh_vien_toi_da ? 'Nhóm Đầy' : 'Gửi lời xin'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination className="justify-content-center modern-pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
              </Pagination>
            </>
          ) : (
            <p className="text-muted">Chưa có nhóm nào</p>
          )}
        </Card.Body>
      </Card>
    );
  };

  const ThanhVienNhom = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Thành Viên Nhóm</h2>
        {nhom ? (
          <>
            <h4>Nhóm: {nhom.ten_nhom}</h4>
            <p><strong>Trạng thái:</strong> {nhom.trang_thai_nhom}</p>
            <p><strong>Số lượng:</strong> {nhom.so_luong_thanh_vien} / {nhom.so_luong_sinh_vien_toi_da}</p>
            <p><strong>Nhóm trưởng:</strong> {nhom.thanh_vien.find((tv) => tv.ma_so === nhom.ma_so_nhom_truong)?.ho_ten || nhom.ma_so_nhom_truong}</p>
            <Table responsive className="modern-table">
              <thead>
                <tr>
                  <th>Mã số</th>
                  <th>Họ tên</th>
                  <th>Số điện thoại</th>
                  <th>Chức vụ</th>
                  {user?.ma_so === nhom.ma_so_nhom_truong && <th>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {nhom.thanh_vien.map((tv) => (
                  <tr key={tv.ma_so} className="slide-in">
                    <td>{tv.ma_so}</td>
                    <td>{tv.ho_ten}</td>
                    <td>{tv.sdt || 'Chưa có'}</td>
                    <td>{tv.ma_so === nhom.ma_so_nhom_truong ? 'Nhóm trưởng' : 'Thành viên'}</td>
                    {user?.ma_so === nhom.ma_so_nhom_truong && tv.ma_so !== nhom.ma_so_nhom_truong && (
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          className="modern-btn"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa ${tv.ho_ten} khỏi nhóm?`)) {
                              handleXoaThanhVien(tv.ma_so);
                            }
                          }}
                        >
                          Xóa
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <p className="text-muted">Bạn chưa có nhóm</p>
        )}
      </Card.Body>
    </Card>
  );

  const ThongTinDeTai = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Thông Tin Đề Tài</h2>
        {nhom ? (
          <>
            {deTai && deTai.length > 0 ? (
              <Table responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Mã đề tài</th>
                    <th>Tên đề tài</th>
                    <th>Mô tả</th>
                    <th>Ngày đăng ký</th>
                    <th>Trạng thái</th>
                    <th>Giảng viên</th>
                  </tr>
                </thead>
                <tbody>
                  {deTai.map((dt) => (
                    <tr key={dt.ma_de_tai} className="slide-in">
                      <td>{dt.ma_de_tai}</td>
                      <td>{dt.ten_de_tai}</td>
                      <td>{dt.mo_ta}</td>
                      <td>
                        {dt.ngay_dang_ky && new Date(dt.ngay_dang_ky).toString() !== 'Invalid Date'
                          ? new Date(dt.ngay_dang_ky).toLocaleDateString('vi-VN')
                          : 'Không xác định'}
                      </td>
                      <td>{dt.trang_thai}</td>
                      <td>{dt.ten_giang_vien || 'Chưa có'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">Nhóm chưa đăng ký đề tài.</p>
            )}
            {user?.ma_so === nhom.ma_so_nhom_truong && deTai.length === 0 && (
              <Button
                className="modern-btn"
                onClick={() => alert('Chức năng đăng ký đề tài sẽ được triển khai sau!')}
              >
                Đăng Ký Đề Tài
              </Button>
            )}
          </>
        ) : (
          <p className="text-muted">Bạn chưa có nhóm</p>
        )}
      </Card.Body>
    </Card>
  );

  const LichBaoVe = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Lịch Bảo Vệ</h2>
        {nhom ? (
          <>
            {lichBaoVe && lichBaoVe.length > 0 ? (
              <Table responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Mã lịch</th>
                    <th>Tên đề tài</th>
                    <th>Địa điểm</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {lichBaoVe.map((lich) => (
                    <tr key={lich.ma_lich} className="slide-in">
                      <td>{lich.ma_lich}</td>
                      <td>{lich.ten_de_tai}</td>
                      <td>{lich.dia_diem}</td>
                      <td>
                        {lich.thoi_gian && new Date(lich.thoi_gian).toString() !== 'Invalid Date'
                          ? new Date(lich.thoi_gian).toLocaleString('vi-VN')
                          : 'Không xác định'}
                      </td>
                      <td>{lich.trang_thai}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">Nhóm chưa có lịch bảo vệ.</p>
            )}
          </>
        ) : (
          <p className="text-muted">Bạn chưa có nhóm</p>
        )}
      </Card.Body>
    </Card>
  );

  const BaoCaoTienDo = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Báo Cáo Tiến Độ</h2>
        {nhom ? (
          <>
            {baoCaoTienDo && baoCaoTienDo.length > 0 ? (
              <Table responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Kỳ báo cáo</th>
                    <th>Tên đề tài</th>
                    <th>Ngày nộp</th>
                    <th>Hạn nộp</th>
                    <th>Trạng thái</th>
                    <th>Điểm</th>
                    <th>Tệp đính kèm</th>
                  </tr>
                </thead>
                <tbody>
                  {baoCaoTienDo.map((bc) => (
                    <tr key={bc.ma_bao_cao} className="slide-in">
                      <td>{bc.ky_bao_cao}</td>
                      <td>{bc.ten_de_tai}</td>
                      <td>
                        {bc.ngay_nop && new Date(bc.ngay_nop).toString() !== 'Invalid Date'
                          ? new Date(bc.ngay_nop).toLocaleDateString('vi-VN')
                          : 'Chưa nộp'}
                      </td>
                      <td>
                        {bc.han_nop && new Date(bc.han_nop).toString() !== 'Invalid Date'
                          ? new Date(bc.han_nop).toLocaleDateString('vi-VN')
                          : 'Không xác định'}
                      </td>
                      <td>{bc.trang_thai}</td>
                      <td>{bc.diem_tien_do !== null ? bc.diem_tien_do : 'Chưa chấm'}</td>
                      <td>
                        {bc.tep_dinh_kem ? (
                          <Button variant="link" href={bc.tep_dinh_kem} target="_blank" className="download-link">
                            Xem tệp
                          </Button>
                        ) : (
                          'Không có'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">Nhóm chưa có báo cáo tiến độ.</p>
            )}
          </>
        ) : (
          <p className="text-muted">Bạn chưa có nhóm</p>
        )}
      </Card.Body>
    </Card>
  );

  const MoiThanhVien = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Mời Thành Viên</h2>
        {nhom && user?.ma_so === nhom.ma_so_nhom_truong ? (
          <>
            <Table responsive className="modern-table">
              <thead>
                <tr>
                  <th>Mã số</th>
                  <th>Họ tên</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sinhVienChuaCoNhom.map((sv) => (
                  <tr key={sv.ma_so} className="slide-in">
                    <td>{sv.ma_so}</td>
                    <td>{sv.ho_ten}</td>
                    <td>{sv.sdt || 'Chưa có'}</td>
                    <td>{sv.email}</td>
                    <td>
                      <Button
                        className="modern-btn"
                        onClick={() => handleMoiThanhVien(sv.ma_so)}
                        disabled={nhom.so_luong_thanh_vien >= nhom.so_luong_sinh_vien_toi_da}
                      >
                        {nhom.so_luong_thanh_vien >= nhom.so_luong_sinh_vien_toi_da ? 'Nhóm Đầy' : 'Mời'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <p className="text-muted">Bạn không có quyền truy cập chức năng này.</p>
        )}
      </Card.Body>
    </Card>
  );

  const LoiXinNhom = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Lời Xin Vào Nhóm</h2>
        {nhom && user?.ma_so === nhom.ma_so_nhom_truong ? (
          <>
            {loiXinNhom.length > 0 ? (
              <Table responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Mã số</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loiXinNhom.map((xin) => (
                    <tr key={xin.ma_loi_xin} className="slide-in">
                      <td>{xin.ma_so_sinh_vien}</td>
                      <td>{xin.ho_ten}</td>
                      <td>{xin.email}</td>
                      <td>
                        <Button
                          className="modern-btn me-2"
                          onClick={() => handleDuyetLoiXin(xin.ma_loi_xin)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          variant="danger"
                          className="modern-btn"
                          onClick={() => handleTuChoiLoiXin(xin.ma_loi_xin)}
                        >
                          Từ chối
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">Chưa có lời xin nào</p>
            )}
          </>
        ) : (
          <p className="text-muted">Bạn không có quyền truy cập chức năng này.</p>
        )}
      </Card.Body>
    </Card>
  );

  const Notifications = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Thông Báo</h2>
        {thongBao && thongBao.length > 0 ? (
          <Table responsive className="modern-table">
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {thongBao.map((tb) => (
                <tr key={tb.ma_thong_bao} className="slide-in">
                  <td>{tb.noi_dung}</td>
                  <td>
                    {tb.ngay_gui && new Date(tb.ngay_gui).toString() !== 'Invalid Date'
                      ? new Date(tb.ngay_gui).toLocaleDateString('vi-VN')
                      : 'Không xác định'}
                  </td>
                  <td>{tb.trang_thai === 'chua_xem' ? 'Chưa xem' : 'Đã xem'}</td>
                  <td>
                    {tb.trang_thai === 'chua_xem' && (
                      <Button
                        className="modern-btn"
                        onClick={() => handleXemThongBao(tb.ma_thong_bao)}
                      >
                        Đánh dấu đã xem
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-muted">Không có thông báo nào.</p>
        )}
      </Card.Body>
    </Card>
  );

  const DiemBaoVe = () => (
    <Card className="shadow-sm">
      <Card.Body>
        <h2 className="gradient-text">Điểm Bảo Vệ</h2>
        {nhom ? (
          <>
            {diemBaoVe && diemBaoVe.diem_bao_ve ? (
              <>
                <h4>Nhóm: {nhom.ten_nhom}</h4>
                <p><strong>Đề tài:</strong> {deTai[0]?.ten_de_tai || 'Chưa có đề tài'}</p>
                <p><strong>Điểm trung bình:</strong> {diemBaoVe.diem_bao_ve}</p>
                <p><strong>Loại:</strong> {diemBaoVe.nhan_xet || 'Không có'}</p>
                {diemBaoVe.scores && diemBaoVe.scores.length > 0 && (
                  <>
                    <h5>Điểm hội đồng:</h5>
                    <Table responsive className="modern-table">
                      <thead>
                        <tr>
                          <th>Điểm</th>
                          <th>Nhận xét</th>
                          <th>Ngày chấm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diemBaoVe.scores.map((score, index) => (
                          <tr key={index} className="slide-in">
                            <td>{score.diem_bao_ve}</td>
                            <td>{score.nhan_xet || 'Không có'}</td>
                            <td>
                              {score.ngay_cham && new Date(score.ngay_cham).toString() !== 'Invalid Date'
                                ? new Date(score.ngay_cham).toLocaleDateString('vi-VN')
                                : 'Không xác định'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}
              </>
            ) : (
              <p className="text-muted">Chưa có điểm bảo vệ.</p>
            )}
          </>
        ) : (
          <p className="text-muted">Bạn chưa có nhóm</p>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className={`student-dashboard ${isDarkMode ? 'dark-mode' : ''}`}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Row className="header-card sticky-top">
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <h2 className="gradient-text mb-0">Bảng Điều Khiển Sinh Viên</h2>
              <div className="d-flex align-items-center">
                <FormCheck
                  type="switch"
                  id="dark-mode-switch"
                  label="Dark Mode"
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="me-3"
                />
                <FormControl
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="search-input"
                  onChange={(e) => {/* Implement search if needed */}}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="tabs d-flex flex-wrap mb-4">
                {!nhom && (
                  <>
                    <Button
                      variant={activeTab === 'register' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'register' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('register');
                        navigate('/student?tab=register', { replace: true });
                      }}
                    >
                      <FaUsers className="me-2" /> Đăng Ký Nhóm
                    </Button>
                    <Button
                      variant={activeTab === 'xin-vao-nhom' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'xin-vao-nhom' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('xin-vao-nhom');
                        navigate('/student?tab=xin-vao-nhom', { replace: true });
                      }}
                    >
                      <FaUsers className="me-2" /> Xin Vào Nhóm
                    </Button>
                  </>
                )}
                {nhom && (
                  <>
                    <Button
                      variant={activeTab === 'thanh-vien' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'thanh-vien' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('thanh-vien');
                        navigate('/student?tab=thanh-vien', { replace: true });
                      }}
                    >
                      <FaUsers className="me-2" /> Thành Viên
                    </Button>
                    <Button
                      variant={activeTab === 'de-tai' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'de-tai' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('de-tai');
                        navigate('/student?tab=de-tai', { replace: true });
                      }}
                    >
                      <FaFileAlt className="me-2" /> Đề Tài
                    </Button>
                    <Button
                      variant={activeTab === 'lich-bao-ve' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'lich-bao-ve' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('lich-bao-ve');
                        navigate('/student?tab=lich-bao-ve', { replace: true });
                      }}
                    >
                      <FaCalendar className="me-2" /> Lịch Bảo Vệ
                    </Button>
                    <Button
                      variant={activeTab === 'bao-cao-tien-do' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'bao-cao-tien-do' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('bao-cao-tien-do');
                        navigate('/student?tab=bao-cao-tien-do', { replace: true });
                      }}
                    >
                      <FaChartLine className="me-2" /> Báo Cáo Tiến Độ
                    </Button>
                    {user?.ma_so === nhom.ma_so_nhom_truong && (
                      <>
                        <Button
                          variant={activeTab === 'moi-thanh-vien' ? 'primary' : 'outline-primary'}
                          className={`tab-button me-2 mb-2 ${activeTab === 'moi-thanh-vien' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveTab('moi-thanh-vien');
                            navigate('/student?tab=moi-thanh-vien', { replace: true });
                          }}
                        >
                          <FaUsers className="me-2" /> Mời Thành Viên
                        </Button>
                        <Button
                          variant={activeTab === 'loi-xin' ? 'primary' : 'outline-primary'}
                          className={`tab-button me-2 mb-2 ${activeTab === 'loi-xin' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveTab('loi-xin');
                            navigate('/student?tab=loi-xin', { replace: true });
                          }}
                        >
                          <FaCheck className="me-2" /> Lời Xin
                        </Button>
                      </>
                    )}
                    <Button
                      variant={activeTab === 'notifications' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'notifications' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('notifications');
                        navigate('/student?tab=notifications', { replace: true });
                      }}
                    >
                      <FaBell className="me-2" /> Thông Báo
                    </Button>
                    <Button
                      variant={activeTab === 'diem-bao-ve' ? 'primary' : 'outline-primary'}
                      className={`tab-button me-2 mb-2 ${activeTab === 'diem-bao-ve' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('diem-bao-ve');
                        navigate('/student?tab=diem-bao-ve', { replace: true });
                      }}
                    >
                      <FaChartLine className="me-2" /> Điểm Bảo Vệ
                    </Button>
                  </>
                )}
              </div>
              {error && <p className="text-danger mb-4">{error}</p>}
              {isLoading ? (
                <div className="text-center">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Đang tải...</p>
                </div>
              ) : (
                <div className="tab-content">
                  {activeTab === 'register' && !nhom && (
                    <RegisterDeTai
                      onCreateNhom={(nhom) => {
                        setNhom(nhom);
                        setActiveTab('thanh-vien');
                        navigate('/student?tab=thanh-vien', { replace: true });
                      }}
                      danhSachNhom={danhSachNhom}
                    />
                  )}
                  {activeTab === 'xin-vao-nhom' && !nhom && <XinVaoNhom />}
                  {activeTab === 'thanh-vien' && nhom && <ThanhVienNhom />}
                  {activeTab === 'de-tai' && nhom && <ThongTinDeTai />}
                  {activeTab === 'lich-bao-ve' && nhom && <LichBaoVe />}
                  {activeTab === 'bao-cao-tien-do' && nhom && <BaoCaoTienDo />}
                  {activeTab === 'moi-thanh-vien' && nhom && user?.ma_so === nhom.ma_so_nhom_truong && <MoiThanhVien />}
                  {activeTab === 'loi-xin' && nhom && user?.ma_so === nhom.ma_so_nhom_truong && <LoiXinNhom />}
                  {activeTab === 'notifications' && nhom && <Notifications />}
                  {activeTab === 'diem-bao-ve' && nhom && <DiemBaoVe />}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StudentDashboard;