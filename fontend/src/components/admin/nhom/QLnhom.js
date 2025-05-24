import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Dropdown,
  Overlay, Tooltip, Popover, OverlayTrigger, FormCheck, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCheck, FaEdit, FaTrash, FaUsers, FaPlus, FaTimes } from 'react-icons/fa';
import './QLnhom.scss';

// Component: Quản Lý Nhóm Sinh Viên
const QLnhom = () => {
  const [groups, setGroups] = useState([]); // Danh sách nhóm
  const [sinhVienList, setSinhVienList] = useState([]); // Danh sách sinh viên
  const [showModal, setShowModal] = useState(false); // Hiển thị modal thêm/sửa nhóm
  const [showMemberModal, setShowMemberModal] = useState(false); // Hiển thị modal quản lý thành viên
  const [editGroup, setEditGroup] = useState(null); // Nhóm đang chỉnh sửa
  const [members, setMembers] = useState([]); // Danh sách thành viên của nhóm
  const [availableStudents, setAvailableStudents] = useState([]);
  const [formData, setFormData] = useState({
    ma_nhom: '',
    ten_nhom: '',
    ma_so_nhom_truong: '',
    ngay_tao: new Date().toISOString().split('T')[0],
    trang_thai_nhom: 'dang_tao',
  }); // Dữ liệu form thêm/sửa nhóm
  const [newMember, setNewMember] = useState(''); // Mã sinh viên để thêm vào nhóm
  const [error, setError] = useState(''); // Thông báo lỗi
  const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại
  const [totalPages, setTotalPages] = useState(1); // Tổng số trang
  const [searchTerm, setSearchTerm] = useState(''); // Từ khóa tìm kiếm
  const [filterStatus, setFilterStatus] = useState(''); // Bộ lọc trạng thái
  const [loadingAction, setLoadingAction] = useState({}); // Trạng thái loading cho các hành động
  const [showTooltip, setShowTooltip] = useState({}); // Trạng thái tooltip cho hành động
  const [isLoading, setIsLoading] = useState(true); // Trạng thái loading bảng
  const [isDarkMode, setIsDarkMode] = useState(false); // Chế độ tối
  const targetRefs = useRef({}); // Tham chiếu cho dropdown hành động
  const itemsPerPage = 10; // Số mục mỗi trang
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // URL API

  // Lấy danh sách nhóm khi trang thay đổi hoặc bộ lọc thay đổi
  useEffect(() => {
  fetchGroups();
  fetchSinhVien();
  fetchAvailableStudents(); // Gọi khi component mount
}, [currentPage, searchTerm, filterStatus]);

  // Hàm lấy danh sách nhóm từ API
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/nhom`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm, trang_thai: filterStatus },
      });
      setGroups(response.data.groups || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể lấy danh sách nhóm';
      setError(message);
      toast.error(message);
    } finally {
      setTimeout(() => setIsLoading(false), 500); // Tắt loading sau 500ms
    }
  };

const fetchAvailableStudents = async (ma_nhom = null) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/sinh-vien/chua-co-nhom`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ma_nhom }, // Gửi ma_nhom để lọc sinh viên cùng khoa
    });
    console.log('Sinh viên chưa có nhóm:', response.data.sinhVien); // Debug
    setAvailableStudents(response.data.sinhVien || []);
  } catch (err) {
    toast.error('Không thể lấy danh sách sinh viên chưa có nhóm');
  }
};
  // Hàm lấy danh sách sinh viên từ API, đảm bảo chỉ lấy sinh_vien
const fetchSinhVien = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/sinh-vien/chua-co-nhom`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSinhVienList(response.data.sinhVien || []);
  } catch (err) {
    toast.error('Không thể lấy danh sách sinh viên chưa có nhóm');
  }
};

  // Hàm lấy danh sách thành viên của nhóm
  const fetchMembers = async (ma_nhom) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/nhom/${ma_nhom}/thanh-vien`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(response.data || []);
    } catch (err) {
      toast.error('Không thể lấy danh sách thành viên');
    }
  };

  // Hàm lấy mã nhóm mới tự động
  const fetchNextMaNhom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/nhom/next-ma-nhom`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormData((prev) => ({ ...prev, ma_nhom: response.data.ma_nhom }));
    } catch (err) {
      toast.error('Không thể tạo mã nhóm tự động');
    }
  };

  // Hiển thị modal thêm/sửa nhóm
  const handleShowModal = (group = null) => {
  if (group) {
    setEditGroup(group);
    setFormData({
      ma_nhom: group.ma_nhom,
      ten_nhom: group.ten_nhom,
      ma_so_nhom_truong: group.ma_so_nhom_truong,
      ngay_tao: group.ngay_tao.split('T')[0],
      trang_thai_nhom: group.trang_thai_nhom,
    });
    fetchMembers(group.ma_nhom); // Lấy danh sách thành viên nhóm
    console.log('Mở modal sửa nhóm:', group.ma_nhom); // Debug
  } else {
    setEditGroup(null);
    setFormData({
      ma_nhom: '',
      ten_nhom: '',
      ma_so_nhom_truong: '',
      ngay_tao: new Date().toISOString().split('T')[0],
      trang_thai_nhom: 'dang_tao',
    });
    fetchNextMaNhom();
    setMembers([]); // Xóa danh sách thành viên khi thêm nhóm mới
  }
  setShowModal(true);
};

  // Đóng modal thêm/sửa nhóm
  const handleCloseModal = () => {
    setShowModal(false);
    setEditGroup(null);
    setFormData({
      ma_nhom: '',
      ten_nhom: '',
      ma_so_nhom_truong: '',
      ngay_tao: new Date().toISOString().split('T')[0],
      trang_thai_nhom: 'dang_tao',
    });
  };

  // Hiển thị modal quản lý thành viên
 const handleShowMemberModal = (group) => {
  setEditGroup(group);
  fetchMembers(group.ma_nhom);
  fetchAvailableStudents(group.ma_nhom); // Truyền ma_nhom để lọc sinh viên cùng khoa
  setShowMemberModal(true);
};

  // Đóng modal quản lý thành viên
  const handleCloseMemberModal = () => {
    setShowMemberModal(false);
    setEditGroup(null);
    setMembers([]);
    setNewMember('');
  };

  // Xử lý thay đổi dữ liệu form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Xử lý gửi form thêm/sửa nhóm
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!formData.ten_nhom || !formData.ma_so_nhom_truong) {
      toast.error('Vui lòng điền tên nhóm và chọn nhóm trưởng');
      return;
    }
    setLoadingAction((prev) => ({ ...prev, [formData.ma_nhom]: 'submit' }));
    try {
      if (editGroup) {
        await axios.put(`${API_BASE_URL}/api/nhom/${editGroup.ma_nhom}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cập nhật nhóm thành công');
      } else {
        await axios.post(`${API_BASE_URL}/api/nhom`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Thêm nhóm thành công');
      }
      fetchGroups();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xử lý nhóm');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [formData.ma_nhom]: null }));
    }
  };

  // Xử lý xóa nhóm
  const handleDelete = async (ma_nhom) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhóm này?')) return;
    setLoadingAction((prev) => ({ ...prev, [ma_nhom]: 'delete' }));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/nhom/${ma_nhom}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Xóa nhóm thành công');
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa nhóm');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [ma_nhom]: null }));
    }
  };

  // Xử lý thêm thành viên vào nhóm
  const handleAddMember = async () => {
  if (!newMember) {
    toast.error('Vui lòng chọn sinh viên');
    return;
  }
  if (members.find((m) => m.ma_so_sinh_vien === newMember)) {
    toast.error('Sinh viên đã có trong nhóm');
    return;
  }
  if (members.length >= 5) {
    toast.error('Nhóm đã đủ 5 thành viên');
    return;
  }
  setLoadingAction((prev) => ({ ...prev, [editGroup.ma_nhom]: 'add_member' }));
  try {
    const token = localStorage.getItem('token');
    await axios.post(
      `${API_BASE_URL}/api/nhom/${editGroup.ma_nhom}/thanh-vien`,
      { ma_so_sinh_vien: newMember, ngay_tham_gia: new Date().toISOString().split('T')[0] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    toast.success('Thêm thành viên thành công');
    fetchMembers(editGroup.ma_nhom);
    setNewMember('');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Lỗi thêm thành viên');
  } finally {
    setLoadingAction((prev) => ({ ...prev, [editGroup.ma_nhom]: null }));
  }
};

  // Xử lý xóa thành viên khỏi nhóm
  const handleRemoveMember = async (ma_so_sinh_vien) => {
    if (ma_so_sinh_vien === editGroup.ma_so_nhom_truong) {
      toast.error('Không thể xóa nhóm trưởng. Vui lòng đổi nhóm trưởng trước.');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này?')) return;
    setLoadingAction((prev) => ({ ...prev, [editGroup.ma_nhom]: `remove_${ma_so_sinh_vien}` }));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/api/nhom/${editGroup.ma_nhom}/thanh-vien/${ma_so_sinh_vien}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Xóa thành viên thành công');
      fetchMembers(editGroup.ma_nhom);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa thành viên');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [editGroup.ma_nhom]: null }));
    }
  };

  // Xử lý tìm kiếm nhóm
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Xử lý lọc theo trạng thái
  const handleFilterStatus = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Xử lý thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Bật/tắt chế độ tối
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Lấy văn bản trạng thái
  const getStatusText = (trang_thai_nhom) => {
    switch (trang_thai_nhom) {
      case 'dang_tao': return 'Đang tạo';
      case 'hop_le': return 'Hợp lệ';
      default: return trang_thai_nhom;
    }
  };

  // Hiển thị popover thông tin nhóm
  const renderPopover = (group) => (
    <Popover id={`popover-${group.ma_nhom}`}>
      <Popover.Header as="h3">{group.ten_nhom}</Popover.Header>
      <Popover.Body>
        <p><strong>Mã nhóm:</strong> {group.ma_nhom}</p>
        <p><strong>Nhóm trưởng:</strong> {group.ten_nhom_truong}</p>
        <p><strong>Thành viên:</strong> {group.so_thanh_vien}</p>
        <p><strong>Trạng thái:</strong> {getStatusText(group.trang_thai_nhom)}</p>
        <p><strong>Đề tài:</strong> {group.ten_de_tai || 'Chưa có'}</p>
      </Popover.Body>
    </Popover>
  );

  return (
    <Container fluid className={`ql-nhom ${isDarkMode ? 'dark-mode' : ''}`}>
      <Row className="header-card sticky-top">
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <h2 className="gradient-text mb-0">Quản Lý Nhóm Sinh Viên</h2>
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
                  placeholder="Tìm kiếm theo mã nhóm hoặc tên nhóm..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="search-input"
                />
                <Dropdown className="ms-2">
                  <Dropdown.Toggle variant="outline-secondary" id="dropdown-status">
                    {filterStatus ? getStatusText(filterStatus) : 'Lọc trạng thái'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterStatus('')}>Tất cả</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterStatus('dang_tao')}>Đang tạo</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterStatus('hop_le')}>Hợp lệ</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Button
                  variant="primary"
                  onClick={() => handleShowModal()}
                  className="ms-2 modern-btn"
                >
                  <FaPlus className="me-2" /> Thêm Nhóm
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="shadow-sm table-card">
            <Card.Body>
              {error && <p className="text-danger">{error}</p>}
              <Table responsive className="bao-cao-tien-do modern-table">
                <thead>
                  <tr>
                    <th>Mã nhóm</th>
                    <th>Tên nhóm</th>
                    <th>Nhóm trưởng</th>
                    <th>Đề tài</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th>Số thành viên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="skeleton-row">
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                      </tr>
                    ))
                  ) : groups.length > 0 ? (
                    groups.map((group, index) => (
                      <tr key={group.ma_nhom} className={`slide-in`} style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>{group.ma_nhom}</td>
                        <td>
                          <OverlayTrigger
                            trigger={['hover', 'focus']}
                            placement="top"
                            overlay={renderPopover(group)}
                          >
                            <span className="popover-trigger">{group.ten_nhom}</span>
                          </OverlayTrigger>
                        </td>
                        <td>{group.ten_nhom_truong}</td>
                        <td>{group.ten_de_tai || 'Chưa có'}</td>
                        <td>{new Date(group.ngay_tao).toLocaleDateString('vi-VN')}</td>
                        <td className={`status-${group.trang_thai_nhom}`}>{getStatusText(group.trang_thai_nhom)}</td>
                        <td>{group.so_thanh_vien}</td>
                        <td>
                          <Dropdown
                            onMouseEnter={() => setShowTooltip({ ...showTooltip, [group.ma_nhom]: true })}
                            onMouseLeave={() => setShowTooltip({ ...showTooltip, [group.ma_nhom]: false })}
                          >
                            <Dropdown.Toggle
                              variant="outline-primary"
                              id={`dropdown-action-${group.ma_nhom}`}
                              size="sm"
                              ref={(el) => (targetRefs.current[group.ma_nhom] = el)}
                              disabled={loadingAction[group.ma_nhom]}
                              className="action-toggle"
                            >
                              {loadingAction[group.ma_nhom] ? (
                                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                              ) : (
                                'Hành động'
                              )}
                            </Dropdown.Toggle>
                            <Overlay
                              target={targetRefs.current[group.ma_nhom]}
                              show={showTooltip[group.ma_nhom]}
                              placement="top"
                            >
                              {(props) => (
                                <Tooltip id={`tooltip-${group.ma_nhom}`} {...props} className="modern-tooltip">
                                  Chọn hành động cho nhóm
                                </Tooltip>
                              )}
                            </Overlay>
                            <Dropdown.Menu className="action-menu">
                              <Dropdown.Item
                                onClick={() => handleShowModal(group)}
                                className="action-edit"
                              >
                                <FaEdit className="me-2" /> Sửa
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleShowMemberModal(group)}
                                className="action-members"
                              >
                                <FaUsers className="me-2" /> Quản lý thành viên
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleDelete(group.ma_nhom)}
                                className="action-delete"
                              >
                                <FaTrash className="me-2" /> Xóa
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center">
                        Không có nhóm nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <Pagination className="justify-content-center modern-pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => handlePageChange(i + 1)}
                    className="page-item"
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
              </Pagination>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal Thêm/Sửa Nhóm */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        dialogClassName="modal-ql-nhom modern-modal"
        animation={true}
      >
        <Modal.Header className="position-relative">
          <Modal.Title>{editGroup ? 'Sửa Nhóm' : 'Thêm Nhóm'}</Modal.Title>
          <Button variant="link" onClick={handleCloseModal} className="close-icon">
            <FaTimes />
          </Button>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mã nhóm</Form.Label>
                  <Form.Control
                    type="text"
                    name="ma_nhom"
                    value={formData.ma_nhom}
                    readOnly
                    disabled
                    placeholder="Mã nhóm tự động"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên nhóm</Form.Label>
                  <Form.Control
                    type="text"
                    name="ten_nhom"
                    value={formData.ten_nhom}
                    onChange={handleInputChange}
                    placeholder="Nhập tên nhóm"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
               <Form.Group className="mb-3">
  <Form.Label>Nhóm trưởng</Form.Label>
  <Form.Select
    name="ma_so_nhom_truong"
    value={formData.ma_so_nhom_truong}
    onChange={handleInputChange}
    required
  >
    <option value="">Chọn nhóm trưởng</option>
    {editGroup
      ? members.map((member) => (
          <option key={member.ma_so_sinh_vien} value={member.ma_so_sinh_vien}>
            {member.ho_ten} ({member.ma_so_sinh_vien}, {member.chuc_vu})
          </option>
        ))
      : sinhVienList.map((sv) => (
          <option key={sv.ma_so} value={sv.ma_so}>
            {sv.ho_ten} ({sv.ma_so})
          </option>
        ))}
  </Form.Select>
</Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày tạo</Form.Label>
                  <Form.Control
                    type="date"
                    name="ngay_tao"
                    value={formData.ngay_tao}
                    onChange={handleInputChange}
                    readOnly={editGroup}
                    disabled={editGroup}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    name="trang_thai_nhom"
                    value={formData.trang_thai_nhom}
                    onChange={handleInputChange}
                  >
                    <option value="dang_tao">Đang tạo</option>
                    <option value="hop_le">Hợp lệ</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                className="modern-btn"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loadingAction[formData.ma_nhom] === 'submit'}
                className="modern-btn"
              >
                {loadingAction[formData.ma_nhom] === 'submit' ? (
                  <>
                    <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
                    Đang xử lý...
                  </>
                ) : editGroup ? 'Cập nhật' : 'Thêm'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal Quản Lý Thành Viên */}
      <Modal
        show={showMemberModal}
        onHide={handleCloseMemberModal}
        backdrop="static"
        keyboard={false}
        dialogClassName="modal-ql-nhom modern-modal"
        animation={true}
      >
        <Modal.Header className="position-relative">
          <Modal.Title>Quản Lý Thành Viên - {editGroup?.ten_nhom}</Modal.Title>
          <Button variant="link" onClick={handleCloseMemberModal} className="close-icon">
            <FaTimes />
          </Button>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
  <Form.Label>Thêm thành viên</Form.Label>
  <div className="d-flex gap-2">
    <Form.Select
      value={newMember}
      onChange={(e) => setNewMember(e.target.value)}
    >
      <option value="">Chọn sinh viên</option>
      {availableStudents.map((sv) => (
        <option key={sv.ma_so} value={sv.ma_so}>
          {sv.ho_ten} ({sv.ma_so})
        </option>
      ))}
    </Form.Select>
    <Button
      variant="primary"
      onClick={handleAddMember}
      disabled={loadingAction[editGroup?.ma_nhom] === 'add_member'}
      className="modern-btn"
    >
      {loadingAction[editGroup?.ma_nhom] === 'add_member' ? (
        <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
      ) : (
        <FaPlus />
      )}
    </Button>
  </div>
</Form.Group>
          <Table responsive className="modern-table">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Họ tên</th>
                <th>Ngày tham gia</th>
                <th>Chức vụ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.ma_so_sinh_vien}>
                    <td>{member.ma_so_sinh_vien}</td>
                    <td>{member.ho_ten}</td>
                    <td>{new Date(member.ngay_tham_gia).toLocaleDateString('vi-VN')}</td>
                    <td>{member.chuc_vu}</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member.ma_so_sinh_vien)}
                        disabled={loadingAction[editGroup?.ma_nhom] === `remove_${member.ma_so_sinh_vien}`}
                        className="action-btn"
                      >
                        {loadingAction[editGroup?.ma_nhom] === `remove_${member.ma_so_sinh_vien}` ? (
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <FaTrash />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    Không có thành viên
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLnhom;