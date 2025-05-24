
// D:\2025\CNPM\Doan\frontend\qldt\src\components\admin\bomon\QLKhoaLopBoMon.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Tabs, Tab, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './QLKhoaLopBoMon.scss';

const QLKhoaLopBoMon = () => {
  const [khoaList, setKhoaList] = useState([]);
  const [lopList, setLopList] = useState([]);
  const [boMonList, setBoMonList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('khoa'); // 'khoa', 'lop', 'boMon'
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    ma_khoa: '',
    ten_khoa: '',
    ma_lop: '',
    ten_lop: '',
    ma_bo_mon: '',
    ten_bo_mon: '',
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState({ khoa: 1, lop: 1, boMon: 1 });
  const [totalPages, setTotalPages] = useState({ khoa: 1, lop: 1, boMon: 1 });
  const [searchTerm, setSearchTerm] = useState({ khoa: '', lop: '', boMon: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchKhoa();
    fetchLop();
    fetchBoMon();
  }, [currentPage.khoa, currentPage.lop, currentPage.boMon, searchTerm.khoa, searchTerm.lop, searchTerm.boMon]);

  const fetchKhoa = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/khoa', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage.khoa,
          limit: itemsPerPage,
          search: searchTerm.khoa,
        },
      });
      setKhoaList(response.data.khoa || response.data);
      setTotalPages((prev) => ({ ...prev, khoa: response.data.totalPages || 1 }));
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách khoa:', err);
      setError('Không thể lấy danh sách khoa');
      toast.error('Lỗi lấy danh sách khoa');
    } finally {
      setLoading(false);
    }
  };

  const fetchLop = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/lop', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage.lop,
          limit: itemsPerPage,
          search: searchTerm.lop,
        },
      });
      setLopList(response.data.lop || response.data);
      setTotalPages((prev) => ({ ...prev, lop: response.data.totalPages || 1 }));
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách lớp:', err);
      setError('Không thể lấy danh sách lớp');
      toast.error('Lỗi lấy danh sách lớp');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoMon = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bo-mon', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage.boMon,
          limit: itemsPerPage,
          search: searchTerm.boMon,
        },
      });
      setBoMonList(response.data.boMon || response.data);
      setTotalPages((prev) => ({ ...prev, boMon: response.data.totalPages || 1 }));
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách bộ môn:', err);
      setError('Không thể lấy danh sách bộ môn');
      toast.error('Lỗi lấy danh sách bộ môn');
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (type, item = null) => {
    setModalType(type);
    setEditItem(item);
    setFormData(
      item
        ? {
            ma_khoa: item.ma_khoa || '',
            ten_khoa: item.ten_khoa || '',
            ma_lop: item.ma_lop || '',
            ten_lop: item.ten_lop || '',
            ma_bo_mon: item.ma_bo_mon || '',
            ten_bo_mon: item.ten_bo_mon || '',
          }
        : {
            ma_khoa: '',
            ten_khoa: '',
            ma_lop: '',
            ten_lop: '',
            ma_bo_mon: '',
            ten_bo_mon: '',
          }
    );
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
    setModalType('khoa');
    setFormData({
      ma_khoa: '',
      ten_khoa: '',
      ma_lop: '',
      ten_lop: '',
      ma_bo_mon: '',
      ten_bo_mon: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (modalType === 'khoa') {
        if (!formData.ma_khoa || !formData.ten_khoa) {
          toast.error('Vui lòng điền đầy đủ mã khoa và tên khoa');
          return;
        }
        if (editItem) {
          await axios.put(
            `http://localhost:5000/api/khoa/${editItem.ma_khoa}`,
            { ten_khoa: formData.ten_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Cập nhật khoa thành công');
        } else {
          await axios.post(
            'http://localhost:5000/api/khoa',
            { ma_khoa: formData.ma_khoa, ten_khoa: formData.ten_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Thêm khoa thành công');
        }
        fetchKhoa();
      } else if (modalType === 'lop') {
        if (!formData.ma_lop || !formData.ten_lop || !formData.ma_khoa) {
          toast.error('Vui lòng điền đầy đủ mã lớp, tên lớp và chọn khoa');
          return;
        }
        if (editItem) {
          await axios.put(
            `http://localhost:5000/api/lop/${editItem.ma_lop}`,
            { ten_lop: formData.ten_lop, ma_khoa: formData.ma_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Cập nhật lớp thành công');
        } else {
          await axios.post(
            'http://localhost:5000/api/lop',
            { ma_lop: formData.ma_lop, ten_lop: formData.ten_lop, ma_khoa: formData.ma_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Thêm lớp thành công');
        }
        fetchLop();
      } else if (modalType === 'boMon') {
        if (!formData.ma_bo_mon || !formData.ten_bo_mon || !formData.ma_khoa) {
          toast.error('Vui lòng điền đầy đủ mã bộ môn, tên bộ môn và chọn khoa');
          return;
        }
        if (editItem) {
          await axios.put(
            `http://localhost:5000/api/bo-mon/${editItem.ma_bo_mon}`,
            { ten_bo_mon: formData.ten_bo_mon, ma_khoa: formData.ma_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Cập nhật bộ môn thành công');
        } else {
          await axios.post(
            'http://localhost:5000/api/bo-mon',
            { ma_bo_mon: formData.ma_bo_mon, ten_bo_mon: formData.ten_bo_mon, ma_khoa: formData.ma_khoa },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Thêm bộ môn thành công');
        }
        fetchBoMon();
      }
      // Trigger refetch in QLnguoidung by updating refetchLists
      localStorage.setItem('refetchLists', Date.now());
      handleCloseModal();
    } catch (err) {
      console.error(`Lỗi xử lý ${modalType}:`, err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || `Lỗi xử lý ${modalType}`);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${type} này?`)) return;
    try {
      const token = localStorage.getItem('token');
      if (type === 'khoa') {
        await axios.delete(`http://localhost:5000/api/khoa/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Xóa khoa thành công');
        fetchKhoa();
      } else if (type === 'lop') {
        await axios.delete(`http://localhost:5000/api/lop/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Xóa lớp thành công');
        fetchLop();
      } else if (type === 'boMon') {
        await axios.delete(`http://localhost:5000/api/bo-mon/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Xóa bộ môn thành công');
        fetchBoMon();
      }
      // Trigger refetch in QLnguoidung
      localStorage.setItem('refetchLists', Date.now());
    } catch (err) {
      console.error(`Lỗi xóa ${type}:`, err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || `Lỗi xóa ${type}`);
    }
  };

  const handleSearch = (type, value) => {
    setSearchTerm((prev) => ({ ...prev, [type]: value }));
    setCurrentPage((prev) => ({ ...prev, [type]: 1 }));
  };

  const handlePageChange = (type, page) => {
    setCurrentPage((prev) => ({ ...prev, [type]: page }));
  };

  const renderModalContent = () => {
    if (modalType === 'khoa') {
      return (
        <>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mã khoa</Form.Label>
                <Form.Control
                  type="text"
                  name="ma_khoa"
                  value={formData.ma_khoa}
                  onChange={handleInputChange}
                  placeholder="Nhập mã khoa"
                  disabled={editItem}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên khoa</Form.Label>
                <Form.Control
                  type="text"
                  name="ten_khoa"
                  value={formData.ten_khoa}
                  onChange={handleInputChange}
                  placeholder="Nhập tên khoa"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
        </>
      );
    } else if (modalType === 'lop') {
      return (
        <>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mã lớp</Form.Label>
                <Form.Control
                  type="text"
                  name="ma_lop"
                  value={formData.ma_lop}
                  onChange={handleInputChange}
                  placeholder="Nhập mã lớp"
                  disabled={editItem}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên lớp</Form.Label>
                <Form.Control
                  type="text"
                  name="ten_lop"
                  value={formData.ten_lop}
                  onChange={handleInputChange}
                  placeholder="Nhập tên lớp"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Khoa</Form.Label>
                <Form.Select
                  name="ma_khoa"
                  value={formData.ma_khoa}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Chọn khoa</option>
                  {khoaList.map((khoa) => (
                    <option key={khoa.ma_khoa} value={khoa.ma_khoa}>
                      {khoa.ten_khoa}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </>
      );
    } else if (modalType === 'boMon') {
      return (
        <>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mã bộ môn</Form.Label>
                <Form.Control
                  type="text"
                  name="ma_bo_mon"
                  value={formData.ma_bo_mon}
                  onChange={handleInputChange}
                  placeholder="Nhập mã bộ môn"
                  disabled={editItem}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên bộ môn</Form.Label>
                <Form.Control
                  type="text"
                  name="ten_bo_mon"
                  value={formData.ten_bo_mon}
                  onChange={handleInputChange}
                  placeholder="Nhập tên bộ môn"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Khoa</Form.Label>
                <Form.Select
                  name="ma_khoa"
                  value={formData.ma_khoa}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Chọn khoa</option>
                  {khoaList.map((khoa) => (
                    <option key={khoa.ma_khoa} value={khoa.ma_khoa}>
                      {khoa.ten_khoa}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </>
      );
    }
    return null;
  };

  return (
    <Container className="ql-khoa-lop-bomon my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Khoa, Lớp, Bộ Môn</h2>
          <Card className="shadow-sm modern-card">
            <Card.Body>
              <Tabs
                defaultActiveKey="khoa"
                id="khoa-lop-bomon-tabs"
                className="mb-4 modern-tabs"
              >
                <Tab eventKey="khoa" title="Khoa">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="search-wrapper">
                      <FaSearch className="search-icon" />
                      <FormControl
                        type="text"
                        placeholder="Tìm kiếm khoa..."
                        value={searchTerm.khoa}
                        onChange={(e) => handleSearch('khoa', e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleShowModal('khoa')}
                      className="add-btn"
                    >
                      <FaPlus className="me-2" /> Thêm Khoa
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
                          <th>Mã khoa</th>
                          <th>Tên khoa</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {khoaList.length > 0 ? (
                          khoaList.map((khoa) => (
                            <tr key={khoa.ma_khoa}>
                              <td>{khoa.ma_khoa}</td>
                              <td>{khoa.ten_khoa}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => handleShowModal('khoa', khoa)}
                                    className="action-btn"
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete('khoa', khoa.ma_khoa)}
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
                            <td colSpan="3" className="text-center">
                              Không có khoa nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                  <Pagination className="justify-content-center mt-4 modern-pagination">
                    {Array.from({ length: totalPages.khoa }, (_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage.khoa}
                        onClick={() => handlePageChange('khoa', i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                  </Pagination>
                </Tab>
                <Tab eventKey="lop" title="Lớp">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="search-wrapper">
                      <FaSearch className="search-icon" />
                      <FormControl
                        type="text"
                        placeholder="Tìm kiếm lớp..."
                        value={searchTerm.lop}
                        onChange={(e) => handleSearch('lop', e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleShowModal('lop')}
                      className="add-btn"
                    >
                      <FaPlus className="me-2" /> Thêm Lớp
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
                          <th>Mã lớp</th>
                          <th>Tên lớp</th>
                          <th>Khoa</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lopList.length > 0 ? (
                          lopList.map((lop) => (
                            <tr key={lop.ma_lop}>
                              <td>{lop.ma_lop}</td>
                              <td>{lop.ten_lop}</td>
                              <td>{lop.ten_khoa || 'Chưa có'}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => handleShowModal('lop', lop)}
                                    className="action-btn"
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete('lop', lop.ma_lop)}
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
                            <td colSpan="4" className="text-center">
                              Không có lớp nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                  <Pagination className="justify-content-center mt-4 modern-pagination">
                    {Array.from({ length: totalPages.lop }, (_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage.lop}
                        onClick={() => handlePageChange('lop', i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                  </Pagination>
                </Tab>
                <Tab eventKey="boMon" title="Bộ Môn">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="search-wrapper">
                      <FaSearch className="search-icon" />
                      <FormControl
                        type="text"
                        placeholder="Tìm kiếm bộ môn..."
                        value={searchTerm.boMon}
                        onChange={(e) => handleSearch('boMon', e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleShowModal('boMon')}
                      className="add-btn"
                    >
                      <FaPlus className="me-2" /> Thêm Bộ Môn
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
                          <th>Mã bộ môn</th>
                          <th>Tên bộ môn</th>
                          <th>Khoa</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boMonList.length > 0 ? (
                          boMonList.map((boMon) => (
                            <tr key={boMon.ma_bo_mon}>
                              <td>{boMon.ma_bo_mon}</td>
                              <td>{boMon.ten_bo_mon}</td>
                              <td>{boMon.ten_khoa || 'Chưa có'}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => handleShowModal('boMon', boMon)}
                                    className="action-btn"
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete('boMon', boMon.ma_bo_mon)}
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
                            <td colSpan="4" className="text-center">
                              Không có bộ môn nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                  <Pagination className="justify-content-center mt-4 modern-pagination">
                    {Array.from({ length: totalPages.boMon }, (_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage.boMon}
                        onClick={() => handlePageChange('boMon', i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                  </Pagination>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        dialogClassName="modal-ql-khoa-lop-bomon"
        centered
        animation
      >
        <Modal.Header closeButton className="modal-header-modern">
          <Modal.Title>
            {editItem
              ? `Sửa ${modalType === 'khoa' ? 'Khoa' : modalType === 'lop' ? 'Lớp' : 'Bộ Môn'}`
              : `Thêm ${modalType === 'khoa' ? 'Khoa' : modalType === 'lop' ? 'Lớp' : 'Bộ Môn'}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingLists ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              {renderModalContent()}
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
                  {editItem ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLKhoaLopBoMon;
