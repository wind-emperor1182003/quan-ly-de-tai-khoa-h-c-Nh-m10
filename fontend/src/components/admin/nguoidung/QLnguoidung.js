
// D:\2025\CNPM\Doan\frontend\qldt\src\components\admin\nguoidung\QLnguoidung.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './QLnguoidung.scss';

const QLnguoidung = () => {
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
    ma_lop: '',
    ma_khoa: '',
    ma_bo_mon: '',
    trinh_do: '',
    vai_tro_quan_ly: '',
    linh_vuc_quan_ly: '',
    ten_khoa: '',
    ten_lop: '',
    ten_bo_mon: '',
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [khoaList, setKhoaList] = useState([]);
  const [lopList, setLopList] = useState([]);
  const [boMonList, setBoMonList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [refetchLists, setRefetchLists] = useState(0);
  const itemsPerPage = 10;
  const trinhDoOptions = [
    { value: 'Thạc sĩ', label: 'Thạc sĩ' },
    { value: 'Tiến sĩ', label: 'Tiến sĩ' },
    { value: 'Phó Giáo sư', label: 'Phó Giáo sư' },
    { value: 'Giáo sư', label: 'Giáo sư' },
  ];

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (showModal) {
      setLoadingLists(true);
      Promise.all([
        fetchKhoa(),
        editUser && formData.ma_khoa ? fetchLop(formData.ma_khoa) : Promise.resolve(),
        editUser && formData.ma_khoa ? fetchBoMon(formData.ma_khoa) : Promise.resolve(),
      ]).finally(() => setLoadingLists(false));
      if (!editUser) {
        fetchNextMaSo(formData.vai_tro);
      }
    }
  }, [showModal, editUser, formData.ma_khoa, formData.vai_tro, refetchLists]);

  useEffect(() => {
    if (formData.ma_khoa && !editUser) {
      fetchLop(formData.ma_khoa);
      fetchBoMon(formData.ma_khoa);
    } else if (!formData.ma_khoa && !editUser) {
      setLopList([]);
      setBoMonList([]);
      setFormData((prev) => ({ ...prev, ma_lop: '', ma_bo_mon: '' }));
    }
  }, [formData.ma_khoa, editUser]);

  const fetchUsers = async () => {
    setLoading(true);
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
      setUsers(response.data.users || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách người dùng:', err.response?.status, err.response?.data);
      setError(err.response?.data?.message || 'Không thể lấy danh sách người dùng');
      toast.error(err.response?.data?.message || 'Lỗi lấy danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchKhoa = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/khoa', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100, search: '' },
      });
      setKhoaList(Array.isArray(response.data.khoa) ? response.data.khoa : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách khoa:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Không thể lấy danh sách khoa');
      setKhoaList([]);
    }
  };

  const fetchLop = async (ma_khoa) => {
    if (!ma_khoa) {
      setLopList([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/lop', {
        headers: { Authorization: `Bearer ${token}` },
        params: { ma_khoa, page: 1, limit: 100, search: '' },
      });
      setLopList(Array.isArray(response.data.lop) ? response.data.lop : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách lớp:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Không thể lấy danh sách lớp');
      setLopList([]);
    }
  };

  const fetchBoMon = async (ma_khoa) => {
    if (!ma_khoa) {
      setBoMonList([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bo-mon', {
        headers: { Authorization: `Bearer ${token}` },
        params: { ma_khoa, page: 1, limit: 100, search: '' },
      });
      setBoMonList(Array.isArray(response.data.boMon) ? response.data.boMon : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách bộ môn:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Không thể lấy danh sách bộ môn');
      setBoMonList([]);
    }
  };

  const fetchNextMaSo = async (vai_tro) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/next-ma-so', {
        headers: { Authorization: `Bearer ${token}` },
        params: { vai_tro },
      });
      setFormData((prev) => ({ ...prev, ma_so: response.data.ma_so }));
    } catch (err) {
      console.error('Lỗi lấy mã số tự động:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Không thể lấy mã số tự động');
    }
  };

  const handleShowModal = (user = null) => {
    console.log('Opening user modal', user);
    if (user) {
      setEditUser(user);
      setFormData({
        ma_so: user.ma_so,
        mat_khau: '',
        ho_ten: user.ho_ten,
        vai_tro: user.vai_tro,
        email: user.email || '',
        sdt: user.sdt || '',
        ma_lop: user.ma_lop || '',
        ma_khoa: user.ma_khoa || '',
        ma_bo_mon: user.ma_bo_mon || '',
        trinh_do: user.trinh_do || '',
        vai_tro_quan_ly: user.vai_tro_quan_ly || '',
        linh_vuc_quan_ly: user.linh_vuc_quan_ly || '',
        ten_khoa: user.ten_khoa || '',
        ten_lop: user.ten_lop || '',
        ten_bo_mon: user.ten_bo_mon || '',
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
        ma_lop: '',
        ma_khoa: '',
        ma_bo_mon: '',
        trinh_do: '',
        vai_tro_quan_ly: '',
        linh_vuc_quan_ly: '',
        ten_khoa: '',
        ten_lop: '',
        ten_bo_mon: '',
      });
    }
    setShowModal(true);
    setRefetchLists((prev) => prev + 1);
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
      ma_lop: '',
      ma_khoa: '',
      ma_bo_mon: '',
      trinh_do: '',
      vai_tro_quan_ly: '',
      linh_vuc_quan_ly: '',
      ten_khoa: '',
      ten_lop: '',
      ten_bo_mon: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'vai_tro' && !editUser) {
        fetchNextMaSo(value);
      }
      if (name === 'ma_khoa' && !editUser) {
        newData.ma_lop = '';
        newData.ma_bo_mon = '';
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting user form:', formData);
    const token = localStorage.getItem('token');

    if (!formData.ho_ten || (!editUser && !formData.mat_khau)) {
      toast.error('Vui lòng điền đầy đủ họ tên và mật khẩu (khi thêm mới)');
      return;
    }
    if (formData.sdt && !/^[0-9]/.test(formData.sdt)) {
      toast.error('Số điện thoại phải bắt đầu bằng số');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    try {
      if (editUser) {
        const updateData = {
          ho_ten: formData.ho_ten,
          email: formData.email,
          sdt: formData.sdt,
        };
        await axios.put(`http://localhost:5000/api/users/${editUser.ma_so}`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cập nhật người dùng thành công');
      } else {
        const data = { ...formData };
        if (data.vai_tro === 'sinh_vien' && (!data.ma_khoa || !data.ma_lop)) {
          toast.error('Vui lòng chọn khoa và lớp cho sinh viên');
          return;
        }
        if (data.vai_tro === 'giang_vien' && (!data.ma_khoa || !data.ma_bo_mon)) {
          toast.error('Vui lòng chọn khoa và bộ môn cho giảng viên');
          return;
        }
        const response = await axios.post('http://localhost:5000/api/users', data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success(`Thêm người dùng thành công: ${response.data.ma_so}`);
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
    if (editUser) {
      switch (formData.vai_tro) {
        case 'sinh_vien':
          return (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Khoa</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.ten_khoa || (Array.isArray(khoaList) && khoaList.find((khoa) => khoa.ma_khoa === formData.ma_khoa)?.ten_khoa) || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lớp</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.ten_lop || (Array.isArray(lopList) && lopList.find((lop) => lop.ma_lop === formData.ma_lop)?.ten_lop) || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          );
        case 'giang_vien':
          return (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Khoa</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.ten_khoa || (Array.isArray(khoaList) && khoaList.find((khoa) => khoa.ma_khoa === formData.ma_khoa)?.ten_khoa) || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bộ môn</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.ten_bo_mon || (Array.isArray(boMonList) && boMonList.find((bm) => bm.ma_bo_mon === formData.ma_bo_mon)?.ten_bo_mon) || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Trình độ</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.trinh_do || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          );
        case 'quan_ly':
          return (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vai trò quản lý</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.vai_tro_quan_ly || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lĩnh vực quản lý</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.linh_vuc_quan_ly || 'Chưa có'}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          );
        default:
          return null;
      }
    } else {
      switch (formData.vai_tro) {
        case 'sinh_vien':
          return (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Khoa</Form.Label>
                  <Form.Select
                    name="ma_khoa"
                    value={formData.ma_khoa}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn khoa</option>
                    {Array.isArray(khoaList) && khoaList.length > 0 ? (
                      khoaList.map((khoa) => (
                        <option key={khoa.ma_khoa} value={khoa.ma_khoa}>
                          {khoa.ten_khoa}
                        </option>
                      ))
                    ) : (
                      <option disabled>Không có khoa</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lớp</Form.Label>
                  <Form.Select
                    name="ma_lop"
                    value={formData.ma_lop}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.ma_khoa}
                  >
                    <option value="">Chọn lớp</option>
                    {Array.isArray(lopList) && lopList.length > 0 ? (
                      lopList.map((lop) => (
                        <option key={lop.ma_lop} value={lop.ma_lop}>
                          {lop.ten_lop}
                        </option>
                      ))
                    ) : (
                      <option disabled>Không có lớp</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          );
        case 'giang_vien':
          return (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Khoa</Form.Label>
                  <Form.Select
                    name="ma_khoa"
                    value={formData.ma_khoa}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn khoa</option>
                    {Array.isArray(khoaList) && khoaList.length > 0 ? (
                      khoaList.map((khoa) => (
                        <option key={khoa.ma_khoa} value={khoa.ma_khoa}>
                          {khoa.ten_khoa}
                        </option>
                      ))
                    ) : (
                      <option disabled>Không có khoa</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bộ môn</Form.Label>
                  <Form.Select
                    name="ma_bo_mon"
                    value={formData.ma_bo_mon}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.ma_khoa}
                  >
                    <option value="">Chọn bộ môn</option>
                    {Array.isArray(boMonList) && boMonList.length > 0 ? (
                      boMonList.map((boMon) => (
                        <option key={boMon.ma_bo_mon} value={boMon.ma_bo_mon}>
                          {boMon.ten_bo_mon}
                        </option>
                      ))
                    ) : (
                      <option disabled>Không có bộ môn</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Trình độ</Form.Label>
                  <Form.Select
                    name="trinh_do"
                    value={formData.trinh_do}
                    onChange={handleInputChange}
                  >
                    <option value="">Chọn trình độ</option>
                    {trinhDoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          );
        case 'quan_ly':
          return (
            <Row>
              <Col md={6}>
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
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
          );
        default:
          return null;
      }
    }
  };

  return (
    <Container className="ql-nguoidung my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Người Dùng</h2>
          <Card className="shadow-sm modern-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <FormControl
                    type="text"
                    placeholder="Tìm kiếm theo mã số hoặc họ tên..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleShowModal()}
                  className="add-btn"
                >
                  <FaPlus className="me-2" /> Thêm Người Dùng
                </Button>
              </div>
              {error && <p className="text-danger">{error}</p>}
              {loading ? (
                <div className="text-center my-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <Table responsive striped bordered hover className="modern-table">
                  <thead className="modern-table-header">
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
                            {user.vai_tro === 'sinh_vien' &&
                              `Lớp: ${user.ten_lop || 'Chưa có'}, Khoa: ${user.ten_khoa || 'Chưa có'}`}
                            {user.vai_tro === 'giang_vien' &&
                              `Bộ môn: ${user.ten_bo_mon || 'Chưa có'}, Khoa: ${user.ten_khoa || 'Chưa có'}, Trình độ: ${user.trinh_do || 'Chưa có'}`}
                            {user.vai_tro === 'quan_ly' &&
                              `Vai trò: ${user.vai_tro_quan_ly || 'Chưa có'}, Lĩnh vực: ${user.linh_vuc_quan_ly || 'Chưa có'}`}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleShowModal(user)}
                                className="action-btn"
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(user.ma_so)}
                                className="action-btn"
                              >
                                <FaTrash />
                              </Button>
                            </div>
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
              )}
              <Pagination className="justify-content-center mt-4 modern-pagination">
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

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        dialogClassName="modal-ql-nguoidung"
        centered
        animation
      >
        <Modal.Header closeButton className="modal-header-modern">
          <Modal.Title>{editUser ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingLists ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mã số</Form.Label>
                    <Form.Control
                      type="text"
                      name="ma_so"
                      value={formData.ma_so}
                      readOnly
                      placeholder={editUser ? 'Mã số' : 'Mã số sẽ được tạo tự động'}
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
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
                </Col>
              </Row>
              {!editUser && (
                <Row>
                  <Col md={12}>
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
                  </Col>
                </Row>
              )}
              <Row>
                <Col md={6}>
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
                </Col>
                <Col md={6}>
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
                </Col>
              </Row>
              {editUser && (
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vai trò</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.vai_tro}
                        readOnly
                        disabled
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}
              {!editUser && (
                <Row>
                  <Col md={6}>
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
                  </Col>
                </Row>
              )}
              {renderAdditionalFields()}
              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    console.log('Cancel user button clicked');
                    handleCloseModal();
                  }}
                  className="cancel-btn"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  onClick={() => console.log('Submit user button clicked')}
                  className="submit-btn"
                >
                  {editUser ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLnguoidung;
