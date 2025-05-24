import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, FormControl, Dropdown, Overlay, Tooltip, Popover, OverlayTrigger, FormCheck } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCheck, FaEdit, FaFileAlt, FaTrash, FaTimes } from 'react-icons/fa';
import './QLbaocao.scss';

const QLbaocao = () => {
  const [reports, setReports] = useState([]);
  const [deTaiList, setDeTaiList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [formData, setFormData] = useState({
    trang_thai_duyet: 'cho_duyet',
    diem_tien_do: '',
    ly_do: '',
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [loadingAction, setLoadingAction] = useState({});
  const [showTooltip, setShowTooltip] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const targetRefs = useRef({});
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, filterStatus, filterApproval]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
      }
      const [reportResponse, deTaiResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/reports', {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            page: currentPage, 
            limit: itemsPerPage, 
            search: searchTerm,
            trang_thai: filterStatus,
            trang_thai_duyet: filterApproval,
          },
        }),
        axios.get('http://localhost:5000/api/admin/reports/detai', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setReports(reportResponse.data.reports || []);
      setTotalPages(reportResponse.data.totalPages || 1);
      setDeTaiList(deTaiResponse.data || []);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy dữ liệu:', err.response?.status, err.response?.data);
      const message = err.response?.data?.message || err.message || 'Không thể lấy dữ liệu báo cáo';
      setError(message);
      toast.error(message);
      if (err.response?.status === 403) {
        try {
          const loginResponse = await axios.post('http://localhost:5000/api/login', {
            ma_so: 'QL001', // Thay bằng cơ chế lưu thông tin đăng nhập
            mat_khau: 'your_password',
          });
          localStorage.setItem('token', loginResponse.data.token);
          fetchData();
        } catch (loginErr) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    } finally {
      setTimeout(() => setIsLoading(false), 500); // Giả lập delay cho skeleton
    }
  };

  const handleShowModal = (report) => {
    setEditReport(report);
    setFormData({
      trang_thai_duyet: report.trang_thai_duyet || 'cho_duyet',
      diem_tien_do: report.diem_tien_do || '',
      ly_do: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditReport(null);
    setFormData({
      trang_thai_duyet: 'cho_duyet',
      diem_tien_do: '',
      ly_do: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const data = { ...formData };

    if (!data.trang_thai_duyet) {
      toast.error('Vui lòng chọn trạng thái duyệt');
      return;
    }
    if (data.trang_thai_duyet === 'tu_choi' && !data.ly_do) {
      toast.error('Vui lòng nhập lý do khi từ chối');
      return;
    }
    if (data.diem_tien_do && (data.diem_tien_do < 0 || data.diem_tien_do > 100)) {
      toast.error('Điểm tiến độ phải từ 0 đến 100');
      return;
    }

    setLoadingAction((prev) => ({ ...prev, [editReport.ma_bao_cao]: 'submit' }));
    try {
      await axios.put(`http://localhost:5000/api/admin/reports/${editReport.ma_bao_cao}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Cập nhật báo cáo thành công');
      fetchData();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật báo cáo');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [editReport.ma_bao_cao]: null }));
    }
  };

  const handleApprove = async (ma_bao_cao) => {
    if (!window.confirm('Bạn có chắc muốn duyệt báo cáo này?')) return;
    setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: 'approve' }));
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/admin/reports/${ma_bao_cao}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Duyệt báo cáo thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt báo cáo');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: null }));
    }
  };

  const handleDelete = async (ma_bao_cao) => {
    if (!window.confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: 'delete' }));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/reports/${ma_bao_cao}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Xóa báo cáo thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa báo cáo');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: null }));
    }
  };

  const handleRequestReplace = async (ma_bao_cao) => {
    const ly_do = prompt('Nhập lý do yêu cầu thay thế tệp:');
    if (!ly_do) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn yêu cầu thay thế tệp?')) return;
    setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: 'replace' }));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/admin/reports/${ma_bao_cao}/request-replace`, { ly_do }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Yêu cầu thay thế tệp thành công');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi yêu cầu thay thế');
    } finally {
      setLoadingAction((prev) => ({ ...prev, [ma_bao_cao]: null }));
    }
  };

  const handleDownload = async (filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/admin/reports/file/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Lỗi tải tệp báo cáo');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterStatus = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleFilterApproval = (approval) => {
    setFilterApproval(approval);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getStatusText = (trang_thai) => {
    switch (trang_thai) {
      case 'chua_nop': return 'Chưa nộp';
      case 'da_nop': return 'Đã nộp';
      case 'tre': return 'Trễ';
      default: return trang_thai;
    }
  };

  const getApprovalStatusText = (trang_thai_duyet) => {
    switch (trang_thai_duyet) {
      case 'cho_duyet': return 'Chờ duyệt';
      case 'da_duyet': return 'Đã duyệt';
      case 'tu_choi': return 'Từ chối';
      default: return trang_thai_duyet;
    }
  };

  const renderPopover = (report) => (
    <Popover id={`popover-${report.ma_bao_cao}`}>
      <Popover.Header as="h3">{report.ten_de_tai}</Popover.Header>
      <Popover.Body>
        <p><strong>Mã báo cáo:</strong> {report.ma_bao_cao}</p>
        <p><strong>Nhóm:</strong> {report.ten_nhom}</p>
        <p><strong>Kỳ:</strong> {report.ky_bao_cao}</p>
        <p><strong>Tiến độ:</strong> {report.diem_tien_do || 'Chưa chấm'}</p>
      </Popover.Body>
    </Popover>
  );

  return (
    <Container fluid className={`ql-baocao ${isDarkMode ? 'dark-mode' : ''}`}>
      <Row className="header-card sticky-top">
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <h2 className="gradient-text mb-0">Quản Lý Báo Cáo Tiến Độ</h2>
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
                  placeholder="Tìm kiếm theo mã báo cáo, tên đề tài, hoặc tên nhóm..."
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
                    <Dropdown.Item onClick={() => handleFilterStatus('chua_nop')}>Chưa nộp</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterStatus('da_nop')}>Đã nộp</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterStatus('tre')}>Trễ</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Dropdown className="ms-2">
                  <Dropdown.Toggle variant="outline-secondary" id="dropdown-approval">
                    {filterApproval ? getApprovalStatusText(filterApproval) : 'Lọc duyệt'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterApproval('')}>Tất cả</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterApproval('cho_duyet')}>Chờ duyệt</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterApproval('da_duyet')}>Đã duyệt</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterApproval('tu_choi')}>Từ chối</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
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
                    <th>Mã báo cáo</th>
                    <th>Tên đề tài</th>
                    <th>Tên nhóm</th>
                    <th>Kỳ báo cáo</th>
                    <th>Hạn nộp</th>
                    <th>Trạng thái</th>
                    <th>Trạng thái duyệt</th>
                    <th>Điểm tiến độ</th>
                    <th>Tệp đính kèm</th>
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
                        <td><div className="skeleton"></div></td>
                        <td><div className="skeleton"></div></td>
                      </tr>
                    ))
                  ) : reports.length > 0 ? (
                    reports.map((report, index) => (
                      <tr key={report.ma_bao_cao} className={`slide-in`} style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>{report.ma_bao_cao}</td>
                        <td>
                          <OverlayTrigger
                            trigger={['hover', 'focus']}
                            placement="top"
                            overlay={renderPopover(report)}
                          >
                            <span className="popover-trigger">{report.ten_de_tai}</span>
                          </OverlayTrigger>
                        </td>
                        <td>{report.ten_nhom}</td>
                        <td>{report.ky_bao_cao}</td>
                        <td>{new Date(report.han_nop).toLocaleDateString('vi-VN')}</td>
                        <td className={`status-${report.trang_thai}`}>{getStatusText(report.trang_thai)}</td>
                        <td className={`status-${report.trang_thai_duyet}`}>{getApprovalStatusText(report.trang_thai_duyet)}</td>
                        <td>{report.diem_tien_do || 'Chưa chấm'}</td>
                        <td>
                          {report.tep_dinh_kem ? (
                            <Button variant="link" onClick={() => handleDownload(report.tep_dinh_kem)} className="download-link">
                              Tải tệp
                            </Button>
                          ) : 'Không có'}
                        </td>
                        <td>
                          <Dropdown
                            onMouseEnter={() => setShowTooltip({ ...showTooltip, [report.ma_bao_cao]: true })}
                            onMouseLeave={() => setShowTooltip({ ...showTooltip, [report.ma_bao_cao]: false })}
                          >
                            <Dropdown.Toggle
                              variant="outline-primary"
                              id={`dropdown-action-${report.ma_bao_cao}`}
                              size="sm"
                              ref={(el) => (targetRefs.current[report.ma_bao_cao] = el)}
                              disabled={loadingAction[report.ma_bao_cao]}
                              className="action-toggle"
                            >
                              {loadingAction[report.ma_bao_cao] ? (
                                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                              ) : (
                                'Hành động'
                              )}
                            </Dropdown.Toggle>
                            <Overlay
                              target={targetRefs.current[report.ma_bao_cao]}
                              show={showTooltip[report.ma_bao_cao]}
                              placement="top"
                            >
                              {(props) => (
                                <Tooltip id={`tooltip-${report.ma_bao_cao}`} {...props} className="modern-tooltip">
                                  Chọn hành động cho báo cáo
                                </Tooltip>
                              )}
                            </Overlay>
                            <Dropdown.Menu className="action-menu">
                              <Dropdown.Item
                                onClick={() => handleApprove(report.ma_bao_cao)}
                                disabled={report.trang_thai_duyet === 'da_duyet'}
                                className="action-approve"
                              >
                                <FaCheck className="me-2" /> Duyệt
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleShowModal(report)} className="action-edit">
                                <FaEdit className="me-2" /> Sửa
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleRequestReplace(report.ma_bao_cao)} className="action-replace">
                                <FaFileAlt className="me-2" /> Yêu cầu thay thế
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleDelete(report.ma_bao_cao)} className="action-delete">
                                <FaTrash className="me-2" /> Xóa
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center">
                        Không có báo cáo nào
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

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        dialogClassName="modal-ql-baocao modern-modal"
        animation={true}
      >
        <Modal.Header className="position-relative">
          <Modal.Title>Chỉnh Sửa Báo Cáo</Modal.Title>
          <Button variant="link" onClick={handleCloseModal} className="close-icon">
            <FaTimes />
          </Button>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={5} className="report-info">
              {editReport && (
                <div>
                  <h6 className="info-title">Thông tin báo cáo</h6>
                  <p><strong>Mã báo cáo:</strong> {editReport.ma_bao_cao}</p>
                  <p><strong>Tên đề tài:</strong> {editReport.ten_de_tai}</p>
                  <p><strong>Tên nhóm:</strong> {editReport.ten_nhom}</p>
                  <p><strong>Kỳ:</strong> {editReport.ky_bao_cao}</p>
                </div>
              )}
            </Col>
            <Col md={7}>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái duyệt</Form.Label>
                  <Form.Select
                    name="trang_thai_duyet"
                    value={formData.trang_thai_duyet}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="cho_duyet">Chờ duyệt</option>
                    <option value="da_duyet">Đã duyệt</option>
                    <option value="tu_choi">Từ chối</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Điểm tiến độ</Form.Label>
                  <Form.Control
                    type="number"
                    name="diem_tien_do"
                    value={formData.diem_tien_do}
                    onChange={handleInputChange}
                    placeholder="Nhập điểm tiến độ (0-100)"
                    min="0"
                    max="100"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Lý do (nếu từ chối hoặc yêu cầu chỉnh sửa)</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="ly_do"
                    value={formData.ly_do}
                    onChange={handleInputChange}
                    placeholder="Nhập lý do"
                  />
                </Form.Group>
                <div className="d-flex">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loadingAction[editReport?.ma_bao_cao] === 'submit'}
                    className="modern-btn"
                  >
                    {loadingAction[editReport?.ma_bao_cao] === 'submit' ? (
                      <>
                        <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật'
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModal}
                    className="ms-2 modern-btn"
                    disabled={loadingAction[editReport?.ma_bao_cao] === 'submit'}
                  >
                    Hủy
                  </Button>
                </div>
              </Form>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QLbaocao;