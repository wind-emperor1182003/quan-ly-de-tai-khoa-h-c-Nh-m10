import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import './QLdetai.scss';

const QLdetai = () => {
  const [detai, setDetai] = useState([]);
  const [nhomList, setNhomList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDetai, setEditDetai] = useState(null);
  const [formData, setFormData] = useState({
    ten_detai: '',
    mo_ta: '',
    ma_nhom: '',
    ma_so_giang_vien: '',
    ten_giang_vien: '',
    trang_thai: 'cho_duyet',
    so_luong_sinh_vien_toi_da: 5,
  });
  const [error, setError] = useState('');
  const [giangVienError, setGiangVienError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDetai();
    fetchNhomList();
  }, [currentPage, searchTerm]);

  const fetchDetai = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
      const response = await axios.get('http://localhost:5000/api/de-tai', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm },
        timeout: 5000,
      });
      console.log('API response detai:', response.data);
      setDetai(response.data.deTai || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách đề tài:', err.response?.status, err.response?.data, err.message);
      const message = err.response?.data?.message || err.message || 'Không thể lấy danh sách đề tài';
      setError(message);
      toast.error(message);
    }
  };

  const fetchNhomList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/nhom/valid', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      console.log('API response nhom:', response.data);
      setNhomList(response.data.nhom || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách nhóm:', err.response?.status, err.response?.data, err.message);
      toast.error('Không thể lấy danh sách nhóm');
    }
  };

  const fetchGiangVien = async (ma_nhom) => {
    if (!ma_nhom) {
      setFormData((prev) => ({ ...prev, ma_so_giang_vien: '', ten_giang_vien: '' }));
      setGiangVienError('');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/giangvien/approved/${ma_nhom}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      console.log('API response giangvien:', response.data);
      if (response.data.giangVien) {
        setFormData((prev) => ({
          ...prev,
          ma_so_giang_vien: response.data.giangVien.ma_so_giang_vien,
          ten_giang_vien: response.data.giangVien.ho_ten,
        }));
        setGiangVienError('');
      } else {
        setFormData((prev) => ({ ...prev, ma_so_giang_vien: '', ten_giang_vien: '' }));
        setGiangVienError('Nhóm chưa đăng ký giảng viên hoặc đăng ký chưa được phê duyệt');
      }
    } catch (err) {
      console.error('Lỗi lấy giảng viên:', err.response?.status, err.response?.data, err.message);
      setFormData((prev) => ({ ...prev, ma_so_giang_vien: '', ten_giang_vien: '' }));
      setGiangVienError(err.response?.data?.message || 'Lỗi lấy thông tin giảng viên');
    }
  };

  const handleShowModal = (detai) => {
    console.log('Opening edit topic modal', detai);
    setEditDetai(detai);
    setFormData({
      ten_detai: detai.ten_de_tai || '',
      mo_ta: detai.mo_ta || '',
      ma_nhom: detai.ma_nhom || '',
      ma_so_giang_vien: detai.ma_so_giang_vien || '',
      ten_giang_vien: detai.ho_ten_giang_vien || '',
      trang_thai: detai.trang_thai || 'cho_duyet',
      so_luong_sinh_vien_toi_da: detai.so_luong_sinh_vien_toi_da || 5,
    });
    setGiangVienError('');
    setShowModal(true);
  };

  const handleShowAddModal = () => {
    console.log('Opening add topic modal');
    setFormData({
      ten_detai: '',
      mo_ta: '',
      ma_nhom: '',
      ma_so_giang_vien: '',
      ten_giang_vien: '',
      trang_thai: 'cho_duyet',
      so_luong_sinh_vien_toi_da: 5,
    });
    setGiangVienError('');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing topic modal');
    setShowModal(false);
    setShowAddModal(false);
    setEditDetai(null);
    setFormData({
      ten_detai: '',
      mo_ta: '',
      ma_nhom: '',
      ma_so_giang_vien: '',
      ten_giang_vien: '',
      trang_thai: 'cho_duyet',
      so_luong_sinh_vien_toi_da: 5,
    });
    setGiangVienError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'ma_nhom') {
      fetchGiangVien(value);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting add topic form:', formData);
    const token = localStorage.getItem('token');
    const data = {
      ten_detai: formData.ten_detai,
      mo_ta: formData.mo_ta,
      ma_nhom: formData.ma_nhom,
      ma_so_giang_vien: formData.ma_so_giang_vien,
      trang_thai: formData.trang_thai,
      so_luong_sinh_vien_toi_da: parseInt(formData.so_luong_sinh_vien_toi_da),
    };

    if (!data.ten_detai || !data.ma_nhom || !data.ma_so_giang_vien) {
      toast.error('Vui lòng điền đầy đủ tên đề tài, mã nhóm và giảng viên');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/de-tai', data, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      toast.success('Thêm đề tài thành công');
      fetchDetai();
      handleCloseModal();
    } catch (err) {
      console.error('Lỗi thêm đề tài:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Lỗi thêm đề tài');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting edit topic form:', formData);
    const token = localStorage.getItem('token');
    const data = {
      ten_detai: formData.ten_detai,
      mo_ta: formData.mo_ta,
      ma_nhom: formData.ma_nhom,
      ma_so_giang_vien: formData.ma_so_giang_vien,
      trang_thai: formData.trang_thai,
      so_luong_sinh_vien_toi_da: parseInt(formData.so_luong_sinh_vien_toi_da),
    };

    if (!data.ten_detai || !data.ma_nhom || !data.ma_so_giang_vien) {
      toast.error('Vui lòng điền đầy đủ tên đề tài, mã nhóm và giảng viên');
      return;
    }

    try {
      await axios.put(`http://localhost:5000/api/de-tai/${editDetai.ma_de_tai}`, data, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      toast.success('Cập nhật đề tài thành công');
      fetchDetai();
      handleCloseModal();
    } catch (err) {
      console.error('Lỗi cập nhật đề tài:', err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || 'Lỗi cập nhật đề tài');
    }
  };

  const handleDelete = async (ma_detai) => {
    if (!window.confirm('Bạn có chắc muốn xóa đề tài này?')) return;
    console.log(`Deleting topic: ma_detai = ${ma_detai}`);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/de-tai/${ma_detai}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      toast.success('Xóa đề tài thành công');
      fetchDetai();
    } catch (err) {
      console.error('Lỗi xóa đề tài:', err.response?.status, err.response?.data, err.message);
      toast.error(err.response?.data?.message || 'Lỗi xóa đề tài');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusText = (trang_thai) => {
    switch (trang_thai) {
      case 'cho_duyet':
        return 'Chờ duyệt';
      case 'da_duyet':
        return 'Đã duyệt';
      case 'dang_thuc_hien':
        return 'Đang thực hiện';
      case 'hoan_thanh':
        return 'Hoàn thành';
      case 'huy':
        return 'Hủy';
      default:
        return trang_thai || 'Không xác định';
    }
  };

  return (
    <Container className="ql-detai my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Đề Tài</h2>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <FormControl
                  type="text"
                  placeholder="Tìm kiếm theo mã đề tài, tên đề tài, hoặc tên nhóm..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-25"
                />
                <Button variant="primary" onClick={handleShowAddModal}>
                  Thêm đề tài
                </Button>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <Table responsive striped bordered hover>
                <thead>
                  <tr>
                    <th>Mã đề tài</th>
                    <th>Tên đề tài</th>
                    <th>Mô tả</th>
                    <th>Tên nhóm</th>
                    <th>Giảng viên</th>
                    <th>Trạng thái</th>
                    <th>Số lượng SV tối đa</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {detai.length > 0 ? (
                    detai.map((dt) => (
                      <tr key={dt.ma_de_tai}>
                        <td>{dt.ma_de_tai}</td>
                        <td>{dt.ten_de_tai}</td>
                        <td>{dt.mo_ta || 'Chưa có'}</td>
                        <td>{dt.ten_nhom || dt.ma_nhom || 'Chưa xác định'}</td>
                        <td>{dt.ho_ten_giang_vien || dt.ma_so_giang_vien || 'Chưa xác định'}</td>
                        <td className={`status-${dt.trang_thai || 'unknown'}`}>{getStatusText(dt.trang_thai)}</td>
                        <td>{dt.so_luong_sinh_vien_toi_da}</td>
                        <td>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(dt)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(dt.ma_de_tai)}
                          >
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center">
                        Không có đề tài nào
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

      {/* Modal chỉnh sửa đề tài */}
      <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false} dialogClassName="modal-ql-detai">
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh Sửa Đề Tài</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Tên đề tài</Form.Label>
              <Form.Control
                type="text"
                name="ten_detai"
                value={formData.ten_detai}
                onChange={handleInputChange}
                placeholder="Nhập tên đề tài"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                name="mo_ta"
                value={formData.mo_ta}
                onChange={handleInputChange}
                placeholder="Nhập mô tả"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mã nhóm</Form.Label>
              <Form.Select
                name="ma_nhom"
                value={formData.ma_nhom}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn nhóm</option>
                {nhomList.map((nhom) => (
                  <option key={nhom.ma_nhom} value={nhom.ma_nhom}>
                    {nhom.ten_nhom} ({nhom.ma_nhom})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Giảng viên</Form.Label>
              <Form.Control
                type="text"
                value={formData.ten_giang_vien || 'Chưa xác định'}
                readOnly
              />
              {giangVienError && <Alert variant="danger" className="mt-2">{giangVienError}</Alert>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select
                name="trang_thai"
                value={formData.trang_thai}
                onChange={handleInputChange}
              >
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="dang_thuc_hien">Đang thực hiện</option>
                <option value="hoan_thanh">Hoàn thành</option>
                <option value="huy">Hủy</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Số lượng sinh viên tối đa</Form.Label>
              <Form.Control
                type="number"
                name="so_luong_sinh_vien_toi_da"
                value={formData.so_luong_sinh_vien_toi_da}
                onChange={handleInputChange}
                min="1"
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Cập nhật
            </Button>
            <Button variant="secondary" onClick={handleCloseModal} className="ms-2">
              Hủy
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal thêm đề tài */}
      <Modal show={showAddModal} onHide={handleCloseModal} backdrop="static" keyboard={false} dialogClassName="modal-ql-detai">
        <Modal.Header closeButton>
          <Modal.Title>Thêm Đề Tài</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Tên đề tài</Form.Label>
              <Form.Control
                type="text"
                name="ten_detai"
                value={formData.ten_detai}
                onChange={handleInputChange}
                placeholder="Nhập tên đề tài"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                name="mo_ta"
                value={formData.mo_ta}
                onChange={handleInputChange}
                placeholder="Nhập mô tả"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mã nhóm</Form.Label>
              <Form.Select
                name="ma_nhom"
                value={formData.ma_nhom}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn nhóm</option>
                {nhomList.map((nhom) => (
                  <option key={nhom.ma_nhom} value={nhom.ma_nhom}>
                    {nhom.ten_nhom} ({nhom.ma_nhom})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Giảng viên</Form.Label>
              <Form.Control
                type="text"
                value={formData.ten_giang_vien || 'Chưa xác định'}
                readOnly
              />
              {giangVienError && <Alert variant="danger" className="mt-2">{giangVienError}</Alert>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select
                name="trang_thai"
                value={formData.trang_thai}
                onChange={handleInputChange}
              >
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="dang_thuc_hien">Đang thực hiện</option>
                <option value="hoan_thanh">Hoàn thành</option>
                <option value="huy">Hủy</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Số lượng sinh viên tối đa</Form.Label>
              <Form.Control
                type="number"
                name="so_luong_sinh_vien_toi_da"
                value={formData.so_luong_sinh_vien_toi_da}
                onChange={handleInputChange}
                min="1"
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={!!giangVienError}>
              Thêm
            </Button>
            <Button variant="secondary" onClick={handleCloseModal} className="ms-2">
              Hủy
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLdetai;