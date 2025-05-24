// D:\2025\CNPM\Doan\frontend\qldt\src\components\admin\dKgiangvien\QLDKgiangvien.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import './QLDKgiangvien.scss';

const QLDKgiangvien = () => {
  const [dangKyList, setDangKyList] = useState([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'approve', 'reject', 'delete'
  const [selectedDangKy, setSelectedDangKy] = useState(null);
  const [formData, setFormData] = useState({ ma_nhom: '', ma_so_giang_vien: '' });
  const [options, setOptions] = useState({ nhom: [], giangVien: [] });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDangKyList();
    fetchOptions();
  }, [currentPage, searchTerm]);

  const fetchDangKyList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dang-ky-giang-vien/admin/list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm },
        timeout: 5000,
      });
      setDangKyList(response.data.dangKy || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể lấy danh sách đăng ký';
      setError(message);
      toast.error(message);
    }
  };

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dang-ky-giang-vien/admin/options', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setOptions(response.data);
    } catch (err) {
      toast.error('Không thể lấy danh sách nhóm và giảng viên');
    }
  };

  const handleShowModal = (type, dangKy = null) => {
    setModalType(type);
    setSelectedDangKy(dangKy);
    if (type === 'add') {
      setFormData({ ma_nhom: '', ma_so_giang_vien: '' });
    } else if (type === 'edit' && dangKy) {
      setFormData({ ma_nhom: dangKy.ma_nhom, ma_so_giang_vien: dangKy.ma_so_giang_vien });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedDangKy(null);
    setFormData({ ma_nhom: '', ma_so_giang_vien: '' });
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAction = async () => {
    try {
      const token = localStorage.getItem('token');
      if (modalType === 'add') {
        const response = await axios.post(
          'http://localhost:5000/api/dang-ky-giang-vien/admin',
          formData,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
        );
        toast.success(response.data.message);
      } else if (modalType === 'edit' && selectedDangKy) {
        const response = await axios.put(
          `http://localhost:5000/api/dang-ky-giang-vien/admin/${selectedDangKy.ma_dang_ky_gv}`,
          formData, // Chỉ gửi ma_nhom và ma_so_giang_vien
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
        );
        toast.success(response.data.message);
      } else if (modalType === 'approve' && selectedDangKy) {
        const response = await axios.put(
          `http://localhost:5000/api/dang-ky-giang-vien/admin/${selectedDangKy.ma_dang_ky_gv}`,
          { trang_thai_dang_ky: 'da_duyet' },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
        );
        toast.success(response.data.message);
      } else if (modalType === 'reject' && selectedDangKy) {
        const response = await axios.put(
          `http://localhost:5000/api/dang-ky-giang-vien/admin/${selectedDangKy.ma_dang_ky_gv}`,
          { trang_thai_dang_ky: 'tu_choi' },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
        );
        toast.success(response.data.message);
      } else if (modalType === 'delete' && selectedDangKy) {
        const response = await axios.delete(
          `http://localhost:5000/api/dang-ky-giang-vien/admin/${selectedDangKy.ma_dang_ky_gv}`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
        );
        toast.success(response.data.message);
      }
      fetchDangKyList();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi thực hiện hành động');
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
      case 'cho_duyet': return 'Chờ duyệt';
      case 'da_duyet': return 'Đã duyệt';
      case 'tu_choi': return 'Từ chối';
      default: return trang_thai || 'Không xác định';
    }
  };

  const getNhomStatusText = (trang_thai_nhom) => {
    return trang_thai_nhom === 'hop_le' ? 'Hợp lệ' : 'Không hợp lệ';
  };

  return (
    <Container className="ql-dk-giang-vien my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Đăng Ký Giảng Viên</h2>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <FormControl
                  type="text"
                  placeholder="Tìm kiếm theo mã đăng ký, tên nhóm, hoặc tên giảng viên..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-25"
                />
                <Button variant="primary" onClick={() => handleShowModal('add')}>
                  Thêm Đăng Ký
                </Button>
              </div>
              {error && <Alert variant="danger">{error}</Alert>}
              <Table responsive striped bordered hover>
                <thead>
                  <tr>
                    <th>Mã Đăng Ký</th>
                    <th>Tên Nhóm</th>
                    <th>Trạng Thái Nhóm</th>
                    <th>Giảng Viên</th>
                    <th>Ngày Đăng Ký</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {dangKyList.length > 0 ? (
                    dangKyList.map((dk) => (
                      <tr key={dk.ma_dang_ky_gv}>
                        <td>{dk.ma_dang_ky_gv}</td>
                        <td>{dk.ten_nhom || dk.ma_nhom}</td>
                        <td className={`status-${dk.trang_thai_nhom}`}>
                          {getNhomStatusText(dk.trang_thai_nhom)}
                        </td>
                        <td>{dk.ho_ten_giang_vien || dk.ma_so_giang_vien}</td>
                        <td>{new Date(dk.ngay_dang_ky).toLocaleDateString('vi-VN')}</td>
                        <td className={`status-${dk.trang_thai_dang_ky}`}>
                          {getStatusText(dk.trang_thai_dang_ky)}
                        </td>
                        <td>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal('edit', dk)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal('delete', dk)}
                          >
                            Xóa
                          </Button>
                          {dk.trang_thai_dang_ky === 'cho_duyet' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleShowModal('approve', dk)}
                              >
                                Duyệt
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="me-2"
                                onClick={() => handleShowModal('reject', dk)}
                              >
                                Từ chối
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">
                        Không có đăng ký nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <Pagination className="justify-content-center mt-3">
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

      {/* Modal cho thêm, sửa, duyệt, từ chối, xóa */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === 'add' && 'Thêm Đăng Ký Giảng Viên'}
            {modalType === 'edit' && 'Sửa Đăng Ký Giảng Viên'}
            {modalType === 'approve' && 'Xác Nhận Duyệt Đăng Ký'}
            {modalType === 'reject' && 'Xác Nhận Từ Chối Đăng Ký'}
            {modalType === 'delete' && 'Xác Nhận Xóa Đăng Ký'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {['add', 'edit'].includes(modalType) ? (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nhóm</Form.Label>
                <Form.Select
                  name="ma_nhom"
                  value={formData.ma_nhom}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Chọn nhóm</option>
                  {options.nhom.map((nhom) => (
                    <option key={nhom.ma_nhom} value={nhom.ma_nhom}>
                      {nhom.ten_nhom}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Giảng Viên</Form.Label>
                <Form.Select
                  name="ma_so_giang_vien"
                  value={formData.ma_so_giang_vien}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Chọn giảng viên</option>
                  {options.giangVien.map((gv) => (
                    <option key={gv.ma_so} value={gv.ma_so}>
                      {gv.ho_ten}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          ) : (
            <p>
              Bạn có chắc chắn muốn{' '}
              {modalType === 'approve' ? 'duyệt' : modalType === 'reject' ? 'từ chối' : 'xóa'}{' '}
              đăng ký giảng viên cho nhóm <strong>{selectedDangKy?.ten_nhom}</strong> với giảng viên{' '}
              <strong>{selectedDangKy?.ho_ten_giang_vien}</strong>?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Hủy
          </Button>
          <Button
            variant={
              modalType === 'approve' ? 'success' : modalType === 'reject' ? 'danger' : 'primary'
            }
            onClick={handleAction}
          >
            {modalType === 'add' && 'Thêm'}
            {modalType === 'edit' && 'Lưu'}
            {modalType === 'approve' && 'Duyệt'}
            {modalType === 'reject' && 'Từ chối'}
            {modalType === 'delete' && 'Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QLDKgiangvien;