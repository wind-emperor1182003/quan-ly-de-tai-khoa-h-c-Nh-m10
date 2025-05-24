// D:\2025\CNPM\Doan\frontend\qldt\src\components\admin\diem\QLDiem.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl,
  Alert, FormCheck, Spinner,
} from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import './QLDiem.scss';

const QLDiem = () => {
  const [diemBaoVe, setDiemBaoVe] = useState([]);
  const [deTaiList, setDeTaiList] = useState([]);
  const [giangVienList, setGiangVienList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [editForm, setEditForm] = useState({ diem: '', nhanXet: '' });
  const [addForm, setAddForm] = useState({ ma_de_tai: '', ma_so_giang_vien: '', diem_bao_ve: '', nhan_xet: '' });
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, currentPage, searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const userResponse = await axios.get('http://localhost:5000/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      if (userResponse.data.vai_tro !== 'quan_ly') {
        setError('Chỉ quản lý được phép truy cập trang này');
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/admin/diem-bao-ve', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm },
        timeout: 5000,
      });

      setDiemBaoVe(response.data.diemBaoVe || []);
      setTotalPages(response.data.totalPages || 1);

      const deTaiResponse = await axios.get('http://localhost:5000/api/de-tai', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setDeTaiList(deTaiResponse.data.deTai || []);

      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/login');
        return;
      }
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập trang này');
        navigate('/login');
        return;
      }
      const message = err.response?.data?.message || 'Không thể tải dữ liệu';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGiangVienByDeTai = async (ma_de_tai) => {
    if (!ma_de_tai) {
      setGiangVienList([]);
      return;
    }
    const token = localStorage.getItem('token');
    console.log(`Fetch giảng viên cho ma_de_tai: ${ma_de_tai}`);
    try {
      const response = await axios.get(`http://localhost:5000/api/giang-vien-hoi-dong/${ma_de_tai}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setGiangVienList(response.data.giangVien || []);
      console.log(`Giảng viên: ${JSON.stringify(response.data.giangVien)}`);
      if (response.data.giangVien.length === 0) {
        toast.warn('Không tìm thấy giảng viên chủ tịch hội đồng cho đề tài này');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi tải danh sách giảng viên';
      console.error(`Lỗi fetch giảng viên: ${message}`);
      toast.error(message);
      setGiangVienList([]);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditForm({
      diem: item.diem_bao_ve ?? '',
      nhanXet: item.nhan_xet || '',
    });
    fetchGiangVienByDeTai(item.ma_de_tai);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const { diem, nhanXet } = editForm;

    if (diem !== '' && (isNaN(diem) || diem < 0 || diem > 100)) {
      toast.error('Điểm phải là số từ 0 đến 100');
      return;
    }

    const payload = {
      diem_bao_ve: diem ? parseFloat(diem) : null,
      nhan_xet: nhanXet || null,
      ma_so_giang_vien: editingItem.ma_so_giang_vien,
      ma_de_tai: editingItem.ma_de_tai,
    };
    console.log(`PUT payload: ${JSON.stringify(payload)}`);

    try {
      await axios.put(`http://localhost:5000/api/admin/diem-bao-ve/${editingItem.ma_cham}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      setDiemBaoVe(diemBaoVe.map((db) =>
        db.ma_cham === editingItem.ma_cham
          ? { ...db, diem_bao_ve: diem ? parseFloat(diem) : null, nhan_xet: nhanXet }
          : db
      ));
      toast.success('Cập nhật điểm thành công');
      setShowEditModal(false);
      setEditingItem(null);
      setEditForm({ diem: '', nhanXet: '' });
      setGiangVienList([]);
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi cập nhật điểm';
      console.error(`Lỗi PUT: ${message}`);
      toast.error(message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const { ma_de_tai, ma_so_giang_vien, diem_bao_ve, nhan_xet } = addForm;

    if (!ma_de_tai || !ma_so_giang_vien) {
      toast.error('Vui lòng chọn đề tài và giảng viên');
      return;
    }
    if (diem_bao_ve !== '' && (isNaN(diem_bao_ve) || diem_bao_ve < 0 || diem_bao_ve > 100)) {
      toast.error('Điểm bảo vệ phải là số từ 0 đến 100');
      return;
    }

    const payload = {
      ma_de_tai,
      ma_so_giang_vien,
      diem_bao_ve: diem_bao_ve ? parseFloat(diem_bao_ve) : null,
      nhan_xet: nhan_xet || null,
    };
    console.log(`POST payload: ${JSON.stringify(payload)}`);

    try {
      const response = await axios.post('http://localhost:5000/api/admin/diem-bao-ve', payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      setDiemBaoVe([...diemBaoVe, {
        ma_cham: response.data.ma_cham,
        ma_de_tai,
        ten_de_tai: deTaiList.find((dt) => dt.ma_de_tai === ma_de_tai)?.ten_de_tai || 'Chưa có',
        ma_nhom: deTaiList.find((dt) => dt.ma_de_tai === ma_de_tai)?.ma_nhom || 'Chưa có',
        ten_nhom: deTaiList.find((dt) => dt.ma_de_tai === ma_de_tai)?.ten_nhom || 'Chưa có',
        ma_so_giang_vien,
        ten_giang_vien: giangVienList.find((gv) => gv.ma_giang_vien === ma_so_giang_vien)?.ho_ten || 'Chưa có',
        diem_bao_ve: diem_bao_ve ? parseFloat(diem_bao_ve) : null,
        nhan_xet: nhan_xet || null,
        ngay_cham: new Date().toISOString(),
      }]);
      toast.success('Thêm điểm bảo vệ thành công');
      setShowAddModal(false);
      setAddForm({ ma_de_tai: '', ma_so_giang_vien: '', diem_bao_ve: '', nhan_xet: '' });
      setGiangVienList([]);
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi thêm điểm bảo vệ';
      console.error(`Lỗi POST: ${message}`);
      toast.error(message);
    }
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/diem-bao-ve/${deletingItem.ma_cham}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      setDiemBaoVe(diemBaoVe.filter((db) => db.ma_cham !== deletingItem.ma_cham));
      toast.success('Xóa điểm bảo vệ thành công');
      setShowDeleteModal(false);
      setDeletingItem(null);
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi xóa điểm bảo vệ';
      console.error(`Lỗi DELETE: ${message}`);
      toast.error(message);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <Container fluid className={`ql-diem ${isDarkMode ? 'dark-mode' : ''}`}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Row className="header-card sticky-top">
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <h2 className="gradient-text mb-0">Quản Lý Điểm Bảo Vệ</h2>
              <div className="d-flex align-items-center">
                <FormCheck
                  type="switch"
                  id="dark-mode-switch"
                  label="Chế độ tối"
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="me-3"
                />
                <FormControl
                  type="text"
                  placeholder="Tìm kiếm nhóm, đề tài..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="search-input"
                />
                <Button
                  variant="primary"
                  className="ms-3"
                  onClick={() => setShowAddModal(true)}
                >
                  <FaPlus /> Thêm điểm bảo vệ
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}

              {isLoading ? (
                <div className="text-center">
                  <Spinner animation="border" />
                </div>
              ) : (
                <>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Mã chấm</th>
                        <th>Đề tài</th>
                        <th>Nhóm</th>
                        <th>Giảng viên chấm</th>
                        <th>Điểm</th>
                        <th>Nhận xét</th>
                        <th>Ngày chấm</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diemBaoVe.map((item) => (
                        <tr key={item.ma_cham}>
                          <td>{item.ma_cham}</td>
                          <td>{item.ten_de_tai}</td>
                          <td>{item.ten_nhom}</td>
                          <td>{item.ten_giang_vien}</td>
                          <td>{item.diem_bao_ve ?? 'Chưa chấm'}</td>
                          <td>{item.nhan_xet || 'Chưa có'}</td>
                          <td>{new Date(item.ngay_cham).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <Button
                              variant="warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditClick(item)}
                            >
                              <FaEdit /> Sửa
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <FaTrash /> Xóa
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  <Pagination>
                    <Pagination.Prev
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    />
                    {[...Array(totalPages).keys()].map((page) => (
                      <Pagination.Item
                        key={page + 1}
                        active={page + 1 === currentPage}
                        onClick={() => setCurrentPage(page + 1)}
                      >
                        {page + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    />
                  </Pagination>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setGiangVienList([]); }}>
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh sửa điểm bảo vệ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Đề tài</Form.Label>
              <Form.Control
                type="text"
                value={editingItem?.ten_de_tai || ''}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Giảng viên chấm</Form.Label>
              <Form.Select
                value={editingItem?.ma_so_giang_vien || ''}
                onChange={(e) => setEditingItem({ ...editingItem, ma_so_giang_vien: e.target.value })}
              >
                <option value="">Chọn giảng viên</option>
                {giangVienList.map((gv) => (
                  <option key={gv.ma_giang_vien} value={gv.ma_giang_vien}>
                    {gv.ho_ten}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Điểm</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editForm.diem}
                onChange={(e) => setEditForm({ ...editForm, diem: e.target.value })}
                placeholder="Nhập điểm (0-100)"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nhận xét</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.nhanXet}
                onChange={(e) => setEditForm({ ...editForm, nhanXet: e.target.value })}
                placeholder="Nhập nhận xét"
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Lưu
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setGiangVienList([]); }}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm điểm bảo vệ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Đề tài</Form.Label>
              <Form.Select
                value={addForm.ma_de_tai}
                onChange={(e) => {
                  const ma_de_tai = e.target.value;
                  setAddForm({ ...addForm, ma_de_tai, ma_so_giang_vien: '' });
                  fetchGiangVienByDeTai(ma_de_tai);
                }}
              >
                <option value="">Chọn đề tài</option>
                {deTaiList.map((dt) => (
                  <option key={dt.ma_de_tai} value={dt.ma_de_tai}>
                    {dt.ten_de_tai}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Giảng viên chấm</Form.Label>
              <Form.Select
                value={addForm.ma_so_giang_vien}
                onChange={(e) => setAddForm({ ...addForm, ma_so_giang_vien: e.target.value })}
                disabled={!addForm.ma_de_tai}
              >
                <option value="">Chọn giảng viên</option>
                {giangVienList.map((gv) => (
                  <option key={gv.ma_giang_vien} value={gv.ma_giang_vien}>
                    {gv.ho_ten}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Điểm</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={addForm.diem_bao_ve}
                onChange={(e) => setAddForm({ ...addForm, diem_bao_ve: e.target.value })}
                placeholder="Nhập điểm (0-100)"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nhận xét</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={addForm.nhan_xet}
                onChange={(e) => setAddForm({ ...addForm, nhan_xet: e.target.value })}
                placeholder="Nhập nhận xét"
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Thêm
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xóa điểm bảo vệ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn xóa điểm bảo vệ cho đề tài <strong>{deletingItem?.ten_de_tai}</strong> của nhóm <strong>{deletingItem?.ten_nhom}</strong> không?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteSubmit}>
            Xóa
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QLDiem;