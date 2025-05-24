// D:\2025\CNPM\Doan\frontend\qldt\src\components\layout1\head\Header.js
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Navbar, Nav, NavDropdown, Container, Button, Modal, OverlayTrigger, Tooltip,
  FormCheck, Badge, Dropdown
} from 'react-bootstrap';
import { FaBookOpen, FaUser, FaBell, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import './Header.scss';

const Header = ({ isLoginPage = false }) => {
  const [user, setUser] = useState(null);
  const [thongBao, setThongBao] = useState([]);
  const [showThongBao, setShowThongBao] = useState(false);
  const [error, setError] = useState('');
  const [nhomInfo, setNhomInfo] = useState({
    hasNhom: false,
    isNhomTruong: false,
    isNhomHopLe: false,
    tenNhom: 'Nhóm không tên',
  });
  const [giangVienInfo, setGiangVienInfo] = useState({
    hasGiangVien: false,
    trangThai: '',
  });
  const [deTaiInfo, setDeTaiInfo] = useState({
    hasDeTai: false,
    tenDeTai: '',
    trangThai: '',
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const thongBaoRef = useRef(null);

  useEffect(() => {
    if (isLoginPage) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập');
      navigate('/');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        setError('Phiên đăng nhập đã hết hạn');
        localStorage.removeItem('token');
        localStorage.removeItem('vai_tro');
        localStorage.removeItem('ho_ten');
        navigate('/');
        return;
      }

      const fetchData = async () => {
        try {
          const userResponse = await axios.get('http://localhost:5000/api/user/me', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });

          setUser({
            ma_so: decoded.ma_so,
            vai_tro: decoded.vai_tro,
            ho_ten: userResponse.data.ho_ten,
          });

          if (decoded.vai_tro === 'sinh_vien') {
            const [nhomResponse, thongBaoResponse, giangVienResponse, deTaiResponse] = await Promise.all([
              axios.get('http://localhost:5000/api/nhom/thanh-vien', {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => ({ data: null })),
              axios.get('http://localhost:5000/api/nhom/thong-bao', {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => ({ data: [] })),
              axios.get('http://localhost:5000/api/dang-ky-giang-vien/thong-tin', {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => ({ data: null })),
              axios.get('http://localhost:5000/api/sinhvien/detai/thong-tin', {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => ({ data: null })),
            ]);

            const nhomData = nhomResponse.data;
            const newNhomInfo = {
              hasNhom: !!nhomData && !!nhomData.ma_nhom,
              isNhomTruong: nhomData?.ma_so_nhom_truong === decoded.ma_so,
              isNhomHopLe: nhomData?.trang_thai_nhom === 'hop_le',
              tenNhom: nhomData?.ten_nhom || 'Nhóm không tên',
            };
            const newGiangVienInfo = {
              hasGiangVien: !!giangVienResponse.data,
              trangThai: giangVienResponse.data?.trang_thai_dang_ky || '',
            };
            const newDeTaiInfo = {
              hasDeTai: !!deTaiResponse.data,
              tenDeTai: deTaiResponse.data?.ten_de_tai || '',
              trangThai: deTaiResponse.data?.trang_thai || '',
            };

            setNhomInfo(newNhomInfo);
            setGiangVienInfo(newGiangVienInfo);
            setDeTaiInfo(newDeTaiInfo);
            setThongBao(thongBaoResponse.data);
          }
        } catch (err) {
          let errorMessage = err.response?.data?.message || 'Không thể lấy thông tin người dùng';
          if (err.response?.status === 403) {
            errorMessage = 'Bạn không có quyền truy cập chức năng này';
            navigate(
              decoded.vai_tro === 'giang_vien' ? '/teacher' :
              decoded.vai_tro === 'quan_ly' ? '/admin/users' : '/'
            );
          }
          setError(errorMessage);
          toast.error(errorMessage);
        }
      };

      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    } catch (err) {
      setError('Token không hợp lệ, vui lòng đăng nhập lại');
      localStorage.removeItem('token');
      localStorage.removeItem('vai_tro');
      localStorage.removeItem('ho_ten');
      navigate('/');
    }
  }, [navigate, isLoginPage]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('vai_tro');
    localStorage.removeItem('ho_ten');
    setUser(null);
    navigate('/');
    toast.success('Đăng xuất thành công');
    setShowLogoutModal(false);
  };

  const handleXemThongBao = async (ma_thong_bao) => {
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/thong-bao/xem',
        { ma_thong_bao: parseInt(ma_thong_bao) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setThongBao(thongBao.map((tb) =>
        tb.ma_thong_bao === ma_thong_bao ? { ...tb, trang_thai: 'da_xem' } : tb
      ));
    } catch (err) {
      toast.error('Lỗi đánh dấu thông báo');
    }
  };

  const handleXacNhanLoiMoi = async (ma_loi_moi, trang_thai) => {
    try {
      await axios.post(
        'http://localhost:5000/api/nhom/loi-moi/xac-nhan',
        { ma_loi_moi: parseInt(ma_loi_moi), trang_thai_loi_moi: trang_thai },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(`Đã ${trang_thai === 'dong_y' ? 'chấp nhận' : 'từ chối'} lời mời`);
      const thongBaoResponse = await axios.get('http://localhost:5000/api/nhom/thong-bao', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setThongBao(thongBaoResponse.data);
      if (trang_thai === 'dong_y') {
        setNhomInfo((prev) => ({ ...prev, hasNhom: true }));
      }
    } catch (err) {
      toast.error('Lỗi xử lý lời mời');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode', !isDarkMode);
  };

  const displayRole = (vai_tro) => {
    switch (vai_tro) {
      case 'sinh_vien': return 'Sinh Viên';
      case 'giang_vien': return 'Giảng Viên';
      case 'quan_ly': return 'Quản Lý';
      default: return vai_tro;
    }
  };

  const displayDeTaiStatus = (trang_thai) => {
    switch (trang_thai) {
      case 'cho_duyet': return 'Chờ duyệt';
      case 'da_duyet': return 'Đã duyệt';
      case 'dang_thuc_hien': return 'Đang thực hiện';
      case 'hoan_thanh': return 'Hoàn thành';
      case 'huy': return 'Hủy';
      default: return trang_thai;
    }
  };

  const soThongBaoChuaXem = thongBao.filter((tb) => tb.trang_thai === 'chua_xem').length;

  const renderMenuByRole = () => {
    if (!user) return null;

    const menuItems = {
      sinh_vien: [
        {
          label: 'Quản Lý Nhóm',
          link: nhomInfo.hasNhom ? '/student?tab=group' : '/student?tab=register',
          tooltip: 'Quản lý nhóm sinh viên của bạn',
        },
        ...(nhomInfo.hasNhom && nhomInfo.isNhomTruong && nhomInfo.isNhomHopLe
          ? [
              {
                label: 'Đăng Ký Giảng Viên',
                link: '/student/dang-ky-giang-vien',
                tooltip: 'Đăng ký giảng viên hướng dẫn',
              },
              ...(giangVienInfo.hasGiangVien && giangVienInfo.trangThai === 'da_duyet'
                ? [
                    {
                      label: 'Đăng Ký Đề Tài',
                      link: '/student/registerdetai',
                      tooltip: 'Đăng ký đề tài cho nhóm',
                    },
                    ...(deTaiInfo.hasDeTai && deTaiInfo.trangThai === 'da_duyet'
                      ? [
                          {
                            label: 'Báo Cáo Tiến Độ',
                            link: '/student/baocao',
                            tooltip: 'Nộp báo cáo tiến độ đề tài',
                          },
                          {
                            label: 'Lịch Bảo Vệ',
                            link: '/student/lich-bao-ve',
                            tooltip: 'Xem lịch bảo vệ đề tài',
                          },
                        ]
                      : []),
                  ]
                : []),
            ]
          : []),
      ],
      giang_vien: [
        { label: 'Danh Sách Đề Tài Hướng Dẫn', link: '/teacher', tooltip: 'Xem đề tài bạn hướng dẫn' },
        { label: 'Tạo Đề Tài', link: '/giangvien/create-detai', tooltip: 'Tạo đề tài mới' },
        { label: 'Quản Lý Báo Cáo Tiến Độ', link: '/giangvien/baocao', tooltip: 'Quản lý báo cáo tiến độ' },
        { label: 'Hội Đồng Bảo Vệ', link: '/giangvien/hoidong', tooltip: 'Xem lịch và thông tin hội đồng bảo vệ' },
      ],
      quan_ly: [
        { label: 'Quản Lý Người Dùng', link: '/admin/users', tooltip: 'Quản lý tài khoản người dùng' },
        { label: 'Quản Lý Nhóm', link: '/admin/nhom', tooltip: 'Quản lý các nhóm sinh viên' },
        { label: 'Quản Lý Đề Tài', link: '/admin/detai', tooltip: 'Quản lý danh sách đề tài' },
        { label: 'Quản Lý Đăng Ký Giảng Viên', link: '/admin/dk-giang-vien', tooltip: 'Quản lý đăng ký giảng viên' },
        { label: 'Quản Lý Thông Báo', link: '/admin/thong-bao', tooltip: 'Quản lý thông báo' }, // New menu item
        { label: 'Quản Lý Khoa, Lớp, Bộ Môn', link: '/admin/khoa-lop-bomon', tooltip: 'Quản lý khoa, lớp, bộ môn' },
        { label: 'Quản Lý Lịch Bảo Vệ', link: '/admin/lich-bao-ve', tooltip: 'Quản lý lịch bảo vệ' },
        { label: 'Quản Lý Báo Cáo', link: '/admin/baocao', tooltip: 'Quản lý báo cáo tiến độ' },
        { label: 'Quản Lý Điểm', link: '/admin/diem', tooltip: 'Quản lý điểm bảo vệ và báo cáo tiến độ' },
      ],
    };

    return (
      <NavDropdown
        title="Chức Năng"
        id="chuc-nang-dropdown"
        className="nav-item modern-dropdown"
        renderMenuOnMount={true}
      >
        {menuItems[user.vai_tro]?.map((item, index) => (
          <OverlayTrigger
            key={index}
            placement="right"
            overlay={<Tooltip>{item.tooltip}</Tooltip>}
          >
            <NavDropdown.Item as={Link} to={item.link} className="dropdown-item slide-in">
              {item.label}
            </NavDropdown.Item>
          </OverlayTrigger>
        ))}
      </NavDropdown>
    );
  };

  return (
    <header className={`header ${isDarkMode ? 'dark-mode' : ''}`}>
      <Navbar expand="lg" className="modern-navbar">
        <Container fluid>
          <Navbar.Brand as={Link} to="/" className="gradient-text">
            <FaBookOpen className="me-2" /> Quản Lý Đề Tài
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarNav" />
          <Navbar.Collapse id="navbarNav">
            {error && <div className="error-message">{error}</div>}
            {isLoginPage ? (
              <Nav className="ms-auto">
                <Nav.Link as={Link} to="/home">Trang Chủ</Nav.Link>
                <Nav.Link as={Link} to="/news">Tin Tức</Nav.Link>
                <Nav.Link as={Link} to="/">Đăng Nhập</Nav.Link>
              </Nav>
            ) : (
              <Nav className="ms-auto align-items-center">
                <Nav.Link as={Link} to="/home">Trang Chủ</Nav.Link>
                <Nav.Link as={Link} to="/news">Tin Tức</Nav.Link>
                {renderMenuByRole()}
                <FormCheck
                  type="switch"
                  id="dark-mode-switch"
                  label={isDarkMode ? <FaMoon /> : <FaSun />}
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="ms-3 me-3"
                />
                {user && (
                  <NavDropdown
                    title={
                      <span>
                        <FaUser className="me-1" /> {user.ho_ten} ({displayRole(user.vai_tro)})
                      </span>
                    }
                    id="user-dropdown"
                    className="nav-item user-info modern-dropdown"
                    renderMenuOnMount={true}
                  >
                    <div className="user-info-details">
                      <span>
                        <strong>{user.ho_ten}</strong> ({displayRole(user.vai_tro)})
                      </span>
                      {nhomInfo.hasNhom && user.vai_tro === 'sinh_vien' && (
                        <span>
                          Nhóm: {nhomInfo.tenNhom}
                          {nhomInfo.isNhomTruong ? ' (Trưởng nhóm)' : ''}
                          {nhomInfo.isNhomHopLe ? ' (Hợp lệ)' : ' (Chưa hợp lệ)'}
                        </span>
                      )}
                      {giangVienInfo.hasGiangVien && user.vai_tro === 'sinh_vien' && (
                        <span>
                          Giảng viên: {giangVienInfo.trangThai === 'da_duyet' ? 'Đã duyệt' : 'Chưa duyệt'}
                        </span>
                      )}
                      {deTaiInfo.hasDeTai && user.vai_tro === 'sinh_vien' && (
                        <span>
                          Đề tài: {deTaiInfo.tenDeTai} ({displayDeTaiStatus(deTaiInfo.trangThai)})
                        </span>
                      )}
                    </div>
                    <NavDropdown.Divider />
                    <OverlayTrigger
                      placement="right"
                      overlay={<Tooltip>Đăng xuất khỏi hệ thống</Tooltip>}
                    >
                      <NavDropdown.Item as="button" onClick={handleLogout} className="logout-button">
                        <FaSignOutAlt className="me-2" /> Đăng Xuất
                      </NavDropdown.Item>
                    </OverlayTrigger>
                  </NavDropdown>
                )}
                {user?.vai_tro === 'sinh_vien' && (
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip>Xem thông báo của bạn</Tooltip>}
                  >
                    <Nav.Item className="notification">
                      <Dropdown show={showThongBao} onToggle={() => setShowThongBao(!showThongBao)}>
                        <Dropdown.Toggle as="span" className="nav-link">
                          <FaBell />
                          {soThongBaoChuaXem > 0 && (
                            <Badge bg="danger" className="notification-badge">
                              {soThongBaoChuaXem}
                            </Badge>
                          )}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="thong-bao-dropdown" align="end">
                          {thongBao.length === 0 ? (
                            <Dropdown.ItemText>Chưa có thông báo</Dropdown.ItemText>
                          ) : (
                            thongBao.map((tb) => (
                              <Dropdown.Item
                                key={tb.ma_thong_bao}
                                className={`thong-bao-item ${tb.trang_thai === 'chua_xem' ? 'unread' : ''}`}
                                onClick={() => handleXemThongBao(tb.ma_thong_bao)}
                              >
                                <p>{tb.noi_dung}</p>
                                <small>{new Date(tb.ngay_gui).toLocaleDateString('vi-VN')}</small>
                                {tb.noi_dung.includes('lời mời vào nhóm') && tb.trang_thai === 'chua_xem' && (
                                  <div className="thong-bao-actions">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        const ma_loi_moi = tb.noi_dung.match(/ma_loi_moi: (\d+)/)?.[1];
                                        if (ma_loi_moi) {
                                          handleXacNhanLoiMoi(ma_loi_moi, 'dong_y');
                                        }
                                      }}
                                    >
                                      Chấp nhận
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => {
                                        const ma_loi_moi = tb.noi_dung.match(/ma_loi_moi: (\d+)/)?.[1];
                                        if (ma_loi_moi) {
                                          handleXacNhanLoiMoi(ma_loi_moi, 'tu_choi');
                                        }
                                      }}
                                    >
                                      Từ chối
                                    </Button>
                                  </div>
                                )}
                              </Dropdown.Item>
                            ))
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Nav.Item>
                  </OverlayTrigger>
                )}
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
        className="modern-modal"
      >
        <Modal.Header>
          <Modal.Title>Xác nhận đăng xuất</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={confirmLogout}>
            Đăng xuất
          </Button>
        </Modal.Footer>
      </Modal>
    </header>
  );
};

export default Header;