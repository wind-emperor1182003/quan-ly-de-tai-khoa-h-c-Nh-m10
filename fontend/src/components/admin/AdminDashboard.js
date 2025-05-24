// D:\2025\CNPM\Doan\frontend\qldt\src\components\admin\AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AdminDashboard.scss';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    ma_so: '',
    mat_khau: '',
    ho_ten: '',
    vai_tro: 'sinh_vien',
    email: '',
    sdt: '',
    lop: '',
    khoa: '',
    bo_mon: '',
    trinh_do: '',
    vai_tro_quan_ly: '',
    linh_vuc_quan_ly: '',
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
        },
      });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách người dùng:', err.response?.status, err.response?.data);
      setError(err.response?.data?.message || 'Không thể lấy danh sách người dùng');
      toast.error(err.response?.data?.message || 'Lỗi lấy danh sách người dùng');
    }
  };

  const handleShowModal = (user = null) => {
    if (user) {
      setEditUser(user);
      setFormData({
        ma_so: user.ma_so,
        mat_khau: '',
        ho_ten: user.ho_ten,
        vai_tro: user.vai_tro,
        email: user.email || '',
        sdt: user.sdt || '',
        lop: user.lop || '',
        khoa: user.khoa || '',
        bo_mon: user.bo_mon || '',
        trinh_do: user.trinh_do || '',
        vai_tro_quan_ly: user.vai_tro_quan_ly || '',
        linh_vuc_quan_ly: user.linh_vuc_quan_ly || '',
      });
    } else {
      setEditUser(null);
      setFormData({
        ma_so: '',
        mat_khau: '',
        ho_ten: '',
        vai_tro: 'sinh_vien',
        email: '',
        sdt: '',
        lop: '',
        khoa: '',
        bo_mon: '',
        trinh_do: '',
        vai_tro_quan_ly: '',
        linh_vuc_quan_ly: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing user modal');
    setShowModal(false);
    setEditUser(null);
    setFormData({
      ma_so: '',
      mat_khau: '',
      ho_ten: '',
      vai_tro: 'sinh_vien',
      email: '',
      sdt: '',
      lop: '',
      khoa: '',
      bo_mon: '',
      trinh_do: '',
      vai_tro_quan_ly: '',
      linh_vuc_quan_ly: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting user form:', formData);
    const token = localStorage.getItem('token');
    const data = { ...formData };

    if (!data.ma_so || !data.ho_ten || (!editUser && !data.mat_khau)) {
      toast.error('Vui lòng điền đầy đủ mã số, họ tên và mật khẩu (khi thêm mới)');
      return;
    }
    if (data.sdt && !/^[0-9]/.test(data.sdt)) {
      toast.error('Số điện thoại phải bắt đầu bằng số');
      return;
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    try {
      if (editUser) {
        await axios.put(`http://localhost:5000/api/users/${editUser.ma_so}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cập nhật người dùng thành công');
      } else {
        await axios.post('http://localhost:5000/api/users', data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Thêm người dùng thành công');
      }
      fetchUsers();
      handleCloseModal();
    } catch (err) {
      console.error('Lỗi xử lý người dùng:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Lỗi xử lý người dùng');
    }
  };

  const handleDelete = async (ma_so) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${ma_so}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Xóa người dùng thành công');
      fetchUsers();
    } catch (err) {
      console.error('Lỗi xóa người dùng:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Lỗi xóa người dùng');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderAdditionalFields = () => {
    switch (formData.vai_tro) {
      case 'sinh_vien':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Lớp</Form.Label>
              <Form.Control
                type="text"
                name="lop"
                value={formData.lop}
                onChange={handleInputChange}
                placeholder="Nhập lớp (VD: CNTT01)"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Khoa</Form.Label>
              <Form.Control
                type="text"
                name="khoa"
                value={formData.khoa}
                onChange={handleInputChange}
                placeholder="Nhập khoa (VD: Công nghệ thông tin)"
              />
            </Form.Group>
          </>
        );
      case 'giang_vien':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Bộ môn</Form.Label>
              <Form.Control
                type="text"
                name="bo_mon"
                value={formData.bo_mon}
                onChange={handleInputChange}
                placeholder="Nhập bộ môn (VD: Công nghệ phần mềm)"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Trình độ</Form.Label>
              <Form.Control
                type="text"
                name="trinh_do"
                value={formData.trinh_do}
                onChange={handleInputChange}
                placeholder="Nhập trình độ (VD: Thạc sĩ)"
              />
            </Form.Group>
          </>
        );
      case 'quan_ly':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Vai trò quản lý</Form.Label>
              <Form.Control
                type="text"
                name="vai_tro_quan_ly"
                value={formData.vai_tro_quan_ly}
                onChange={handleInputChange}
                placeholder="Nhập vai trò quản lý (VD: Quản lý đề tài)"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Lĩnh vực quản lý</Form.Label>
              <Form.Control
                type="text"
                name="linh_vuc_quan_ly"
                value={formData.linh_vuc_quan_ly}
                onChange={handleInputChange}
                placeholder="Nhập lĩnh vực quản lý (VD: Khoa học máy tính)"
              />
            </Form.Group>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Container className="user-management my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Người Dùng</h2>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <FormControl
                  type="text"
                  placeholder="Tìm kiếm theo mã số hoặc họ tên..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-25"
                />
                <Button variant="primary" onClick={() => handleShowModal()}>
                  Thêm Người Dùng
                </Button>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <Table responsive striped bordered hover>
                <thead>
                  <tr>
                    <th>Mã số</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>SĐT</th>
                    <th>Vai trò</th>
                    <th>Thông tin bổ sung</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.ma_so}>
                        <td>{user.ma_so}</td>
                        <td>{user.ho_ten}</td>
                        <td>{user.email || 'Chưa có'}</td>
                        <td>{user.sdt || 'Chưa có'}</td>
                        <td>{user.vai_tro}</td>
                        <td>
                          {user.vai_tro === 'sinh_vien' && `Lớp: ${user.lop || 'Chưa có'}, Khoa: ${user.khoa || 'Chưa có'}`}
                          {user.vai_tro === 'giang_vien' && `Bộ môn: ${user.bo_mon || 'Chưa có'}, Trình độ: ${user.trinh_do || 'Chưa có'}`}
                          {user.vai_tro === 'quan_ly' && `Vai trò: ${user.vai_tro_quan_ly || 'Chưa có'}, Lĩnh vực: ${user.linh_vuc_quan_ly || 'Chưa có'}`}
                        </td>
                        <td>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(user)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(user.ma_so)}
                          >
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">
                        Không có người dùng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <Pagination className="justify-content-center">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
              </Pagination>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false} dialogClassName="modal-user">
        <Modal.Header closeButton>
          <Modal.Title>{editUser ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mã số</Form.Label>
              <Form.Control
                type="text"
                name="ma_so"
                value={formData.ma_so}
                onChange={handleInputChange}
                placeholder="Nhập mã số"
                disabled={!!editUser}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Họ tên</Form.Label>
              <Form.Control
                type="text"
                name="ho_ten"
                value={formData.ho_ten}
                onChange={handleInputChange}
                placeholder="Nhập họ tên"
                required
              />
            </Form.Group>
            {!editUser && (
              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  name="mat_khau"
                  value={formData.mat_khau}
                  onChange={handleInputChange}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select
                name="vai_tro"
                value={formData.vai_tro}
                onChange={handleInputChange}
              >
                <option value="sinh_vien">Sinh viên</option>
                <option value="giang_vien">Giảng viên</option>
                <option value="quan_ly">Quản lý</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Nhập email"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Số điện thoại</Form.Label>
              <Form.Control
                type="text"
                name="sdt"
                value={formData.sdt}
                onChange={handleInputChange}
                placeholder="Nhập số điện thoại"
              />
            </Form.Group>
            {renderAdditionalFields()}
            <Button
              variant="primary"
              type="submit"
              onClick={() => console.log('Submit user button clicked')}
            >
              {editUser ? 'Cập nhật' : 'Thêm'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { console.log('Cancel user button clicked'); handleCloseModal(); }}
              className="ms-2"
            >
              Hủy
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default UserManagement;