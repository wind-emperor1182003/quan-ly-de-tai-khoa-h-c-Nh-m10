
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import '../nguoidung/QLnguoidung.scss'; // Reuse styles from QLnguoidung.scss

const QLLichBaoVe = () => {
  const [lichBaoVe, setLichBaoVe] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editLich, setEditLich] = useState(null);
  const [formData, setFormData] = useState({
    ma_de_tai: '',
    dia_diem: '',
    thoi_gian: '',
    trang_thai: 'Chưa xác nhận',
    hoi_dong: [],
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [deTaiList, setDeTaiList] = useState([]);
  const [giangVienList, setGiangVienList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const itemsPerPage = 10;

  // Danh sách vai trò hội đồng cố định
  const vaiTroHoiDongOptions = [
    'Chủ tịch',
    'Thư ký',
    'Ủy viên',
    'Phản biện',
  ];

  useEffect(() => {
    fetchLichBaoVe();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (showModal) {
      setLoadingLists(true);
      Promise.all([fetchDeTai(), fetchGiangVien()]).finally(() => setLoadingLists(false));
    }
  }, [showModal]);

  const fetchLichBaoVe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/lich-bao-ve', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm },
      });
      setLichBaoVe(response.data.lichBaoVe || []);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách lịch bảo vệ:', err);
      setError('Không thể lấy danh sách lịch bảo vệ');
      toast.error('Lỗi lấy danh sách lịch bảo vệ');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeTai = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/de-tai', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100, search: '' },
      });
      setDeTaiList(response.data.deTai || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đề tài:', err);
      toast.error('Không thể lấy danh sách đề tài');
      setDeTaiList([]);
    }
  };

  const fetchGiangVien = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/giang-vien', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100, search: '' },
      });
      setGiangVienList(response.data.giangVien || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách giảng viên:', err);
      toast.error('Không thể lấy danh sách giảng viên');
      setGiangVienList([]);
    }
  };

  const handleShowModal = (lich = null) => {
    if (lich) {
      setEditLich(lich);
      setFormData({
        ma_de_tai: lich.ma_de_tai,
        dia_diem: lich.dia_diem,
        thoi_gian: new Date(lich.thoi_gian).toISOString().slice(0, 16),
        trang_thai: lich.trang_thai,
        hoi_dong: [], // Will fetch hoi_dong separately
      });
      fetchHoiDong(lich.ma_lich);
    } else {
      setEditLich(null);
      setFormData({
        ma_de_tai: '',
        dia_diem: '',
        thoi_gian: '',
        trang_thai: 'Chưa xác nhận',
        hoi_dong: [],
      });
    }
    setShowModal(true);
  };

  const fetchHoiDong = async (ma_lich) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/lich-bao-ve/${ma_lich}/hoi-dong`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure vai_tro_hoi_dong is one of the allowed values
      const hoiDong = response.data.hoiDong.map(member => ({
        ...member,
        vai_tro_hoi_dong: vaiTroHoiDongOptions.includes(member.vai_tro_hoi_dong) 
          ? member.vai_tro_hoi_dong 
          : 'Ủy viên', // Default to 'Ủy viên' if invalid
      }));
      setFormData((prev) => ({ ...prev, hoi_dong: hoiDong }));
    } catch (err) {
      console.error('Lỗi lấy hội đồng bảo vệ:', err);
      toast.error('Không thể lấy hội đồng bảo vệ');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditLich(null);
    setFormData({
      ma_de_tai: '',
      dia_diem: '',
      thoi_gian: '',
      trang_thai: 'Chưa xác nhận',
      hoi_dong: [],
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHoiDongChange = (index, field, value) => {
    setFormData((prev) => {
      const newHoiDong = [...prev.hoi_dong];
      newHoiDong[index] = { ...newHoiDong[index], [field]: value };
      return { ...prev, hoi_dong: newHoiDong };
    });
  };

  const addHoiDongMember = () => {
    setFormData((prev) => ({
      ...prev,
      hoi_dong: [...prev.hoi_dong, { ma_giang_vien: '', vai_tro_hoi_dong: 'Ủy viên' }],
    }));
  };

  const removeHoiDongMember = (index) => {
    setFormData((prev) => ({
      ...prev,
      hoi_dong: prev.hoi_dong.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!formData.ma_de_tai || !formData.dia_diem || !formData.thoi_gian) {
      toast.error('Vui lòng điền đầy đủ thông tin lịch bảo vệ');
      return;
    }
    // Kiểm tra hội đồng
    if (formData.hoi_dong.length === 0) {
      toast.error('Phải có ít nhất một thành viên hội đồng');
      return;
    }
    for (const member of formData.hoi_dong) {
      if (!member.ma_giang_vien || !member.vai_tro_hoi_dong) {
        toast.error('Vui lòng chọn giảng viên và vai trò cho tất cả thành viên hội đồng');
        return;
      }
      if (!vaiTroHoiDongOptions.includes(member.vai_tro_hoi_dong)) {
        toast.error(`Vai trò hội đồng "${member.vai_tro_hoi_dong}" không hợp lệ`);
        return;
      }
    }
    try {
      if (editLich) {
        await axios.put(`http://localhost:5000/api/lich-bao-ve/${editLich.ma_lich}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cập nhật lịch bảo vệ thành công');
      } else {
        await axios.post('http://localhost:5000/api/lich-bao-ve', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Tạo lịch bảo vệ thành công');
      }
      fetchLichBaoVe();
      handleCloseModal();
    } catch (err) {
      console.error('Lỗi xử lý lịch bảo vệ:', err);
      toast.error(err.response?.data?.message || 'Lỗi xử lý lịch bảo vệ');
    }
  };

  const handleDelete = async (ma_lich) => {
    if (!window.confirm('Bạn có chắc muốn xóa lịch bảo vệ này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/lich-bao-ve/${ma_lich}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Xóa lịch bảo vệ thành công');
      fetchLichBaoVe();
    } catch (err) {
      console.error('Lỗi xóa lịch bảo vệ:', err);
      toast.error(err.response?.data?.message || 'Lỗi xóa lịch bảo vệ');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <Container className="ql-nguoidung my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Lịch Bảo Vệ</h2>
          <Card className="shadow-sm modern-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <FormControl
                    type="text"
                    placeholder="Tìm kiếm theo tên đề tài..."
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
                  <FaPlus className="me-2" /> Thêm Lịch Bảo Vệ
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
                      <th>Mã lịch</th>
                      <th>Tên đề tài</th>
                      <th>Khoa</th>
                      <th>Địa điểm</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lichBaoVe.length > 0 ? (
                      lichBaoVe.map((lich) => (
                        <tr key={lich.ma_lich}>
                          <td>{lich.ma_lich}</td>
                          <td>{lich.ten_de_tai}</td>
                          <td>{lich.ten_khoa}</td>
                          <td>{lich.dia_diem}</td>
                          <td>{new Date(lich.thoi_gian).toLocaleString()}</td>
                          <td>{lich.trang_thai}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleShowModal(lich)}
                                className="action-btn"
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(lich.ma_lich)}
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
                          Không có lịch bảo vệ nào
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
          <Modal.Title>{editLich ? 'Sửa Lịch Bảo Vệ' : 'Thêm Lịch Bảo Vệ'}</Modal.Title>
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
                    <Form.Label>Đề tài</Form.Label>
                    <Form.Select
                      name="ma_de_tai"
                      value={formData.ma_de_tai}
                      onChange={handleInputChange}
                      required
                      disabled={editLich}
                    >
                      <option value="">Chọn đề tài</option>
                      {deTaiList.map((deTai) => (
                        <option key={deTai.ma_de_tai} value={deTai.ma_de_tai}>
                          {deTai.ten_de_tai}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Địa điểm</Form.Label>
                    <Form.Control
                      type="text"
                      name="dia_diem"
                      value={formData.dia_diem}
                      onChange={handleInputChange}
                      placeholder="Nhập địa điểm"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Thời gian</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="thoi_gian"
                      value={formData.thoi_gian}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Trạng thái</Form.Label>
                    <Form.Select
                      name="trang_thai"
                      value={formData.trang_thai}
                      onChange={handleInputChange}
                    >
                      <option value="Chưa xác nhận">Chưa xác nhận</option>
                      <option value="Đã xác nhận">Đã xác nhận</option>
                      <option value="Hủy">Hủy</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Hội đồng bảo vệ</Form.Label>
                    {formData.hoi_dong.map((member, index) => (
                      <Row key={index} className="mb-2 align-items-center">
                        <Col md={5}>
                          <Form.Select
                            value={member.ma_giang_vien}
                            onChange={(e) => handleHoiDongChange(index, 'ma_giang_vien', e.target.value)}
                            required
                          >
                            <option value="">Chọn giảng viên</option>
                            {giangVienList.map((gv) => (
                              <option key={gv.ma_so} value={gv.ma_so}>
                                {gv.ho_ten}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={5}>
                          <Form.Select
                            value={member.vai_tro_hoi_dong}
                            onChange={(e) => handleHoiDongChange(index, 'vai_tro_hoi_dong', e.target.value)}
                            required
                          >
                            <option value="">Chọn vai trò</option>
                            {vaiTroHoiDongOptions.map((vaiTro) => (
                              <option key={vaiTro} value={vaiTro}>
                                {vaiTro}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={2}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeHoiDongMember(index)}
                          >
                            Xóa
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addHoiDongMember}
                      className="mt-2"
                    >
                      Thêm thành viên
                    </Button>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={handleCloseModal}
                  className="cancel-btn"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="submit-btn"
                >
                  {editLich ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLLichBaoVe;
