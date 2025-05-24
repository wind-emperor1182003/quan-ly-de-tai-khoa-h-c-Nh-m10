import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, FormControl, Alert, Pagination, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import './QLthongbao.scss';

const QLthongbao = () => {
  const [activeTab, setActiveTab] = useState('thongbao');
  const [data, setData] = useState({ thongbao: [], loimoinhom: [], loixinnhom: [] });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState({ thongbao: 1, loimoinhom: 1, loixinnhom: 1 });
  const [totalPages, setTotalPages] = useState({ thongbao: 1, loimoinhom: 1, loixinnhom: 1 });
  const [searchTerm, setSearchTerm] = useState({ thongbao: '', loimoinhom: '', loixinnhom: '' });
  const [showDeleteModal, setShowDeleteModal] = useState({ show: false, type: '', id: null });
  const [showDeleteAllModal, setShowDeleteAllModal] = useState({ show: false, type: '' });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, currentPage[activeTab], searchTerm[activeTab]]);

  const fetchData = async (tab) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `http://localhost:5000/api/thong-bao/admin/list/${tab}`;
      console.log(`Đang lấy dữ liệu cho ${tab} từ ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage[tab], limit: itemsPerPage, search: searchTerm[tab] },
        timeout: 10000,
      });
      setData((prev) => ({ ...prev, [tab]: response.data.items || [] }));
      setTotalPages((prev) => ({ ...prev, [tab]: response.data.totalPages || 1 }));
      setError('');
    } catch (err) {
      const message = err.response?.data?.message || `Không thể lấy danh sách ${tab}`;
      console.error(`Lỗi lấy dữ liệu ${tab}:`, err.response?.data || err);
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    const { type, id } = showDeleteModal;
    const parsedId = parseInt(id, 10);
    if (!id || isNaN(parsedId)) {
      console.error(`ID không hợp lệ cho ${type}: ${id}, cần là số nguyên`);
      toast.error(`ID không hợp lệ cho ${type}, phải là số nguyên`);
      setShowDeleteModal({ show: false, type: '', id: null });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const endpoint = `http://localhost:5000/api/thong-bao/admin/${type}/${parsedId}`;
      console.log(`Gửi yêu cầu DELETE cho ${type} với id: ${parsedId} tới ${endpoint}`);
      const response = await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      toast.success(response.data.message);
      fetchData(type);
      setShowDeleteModal({ show: false, type: '', id: null });
    } catch (err) {
      const message = err.response?.data?.message || `Lỗi khi xóa bản ghi ${type}`;
      console.error(`Lỗi xóa ${type} id ${id}:`, err.response?.data || err);
      toast.error(message);
    }
  };

  const handleDeleteAll = async () => {
    const { type } = showDeleteAllModal;
    try {
      const token = localStorage.getItem('token');
      const endpoint = `http://localhost:5000/api/thong-bao/admin/${type}/delete-all`;
      console.log(`Gửi yêu cầu DELETE ALL tới: ${endpoint}`);
      const response = await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      toast.success(response.data.message);
      fetchData(type);
      setShowDeleteAllModal({ show: false, type: '' });
    } catch (err) {
      const message = err.response?.data?.message || `Lỗi khi xóa tất cả bản ghi ${type}`;
      console.error(`Lỗi xóa toàn bộ ${type}:`, err.response?.data || err);
      toast.error(message);
    }
  };

  const handleSearch = (tab) => (e) => {
    setSearchTerm((prev) => ({ ...prev, [tab]: e.target.value }));
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
  };

  const handlePageChange = (tab) => (page) => {
    setCurrentPage((prev) => ({ ...prev, [tab]: page }));
  };

  const getStatusText = (table, status) => {
    const statusMap = {
      thongbao: { chua_xem: 'Chưa xem', da_xem: 'Đã xem' },
      loimoinhom: { cho_xac_nhan: 'Chờ xác nhận', dong_y: 'Đồng ý', tu_choi: 'Từ chối' },
      loixinnhom: { cho_duyet: 'Chờ duyệt', duyet: 'Duyệt', tu_choi: 'Từ chối' },
    };
    return statusMap[table][status] || status;
  };

  const renderTable = (tableKey, columns, dataKey, idField) => (
    <>
      <div className="d-flex justify-content-between mb-3">
        <FormControl
          type="text"
          placeholder={`Tìm kiếm theo ${columns.map((c) => c.label.toLowerCase()).join(', ')}...`}
          value={searchTerm[tableKey]}
          onChange={handleSearch(tableKey)}
          className="w-25"
        />
        <Button
          variant="danger"
          onClick={() => {
            console.log(`Mở modal xóa tất cả cho ${tableKey}`);
            setShowDeleteAllModal({ show: true, type: tableKey });
            setShowDeleteModal({ show: false, type: '', id: null });
          }}
          disabled={data[tableKey].length === 0}
        >
          Xóa Tất Cả
        </Button>
      </div>
      {error && activeTab === tableKey && <Alert variant="danger">{error}</Alert>}
      <Table responsive striped bordered hover>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>{col.label}</th>
            ))}
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {data[tableKey].length > 0 ? (
            data[tableKey].map((item) => (
              <tr key={item[idField]}>
                {columns.map((col, idx) => (
                  <td key={idx} className={col.status ? `status-${item[col.field]}` : ''}>
                    {col.date
                      ? new Date(item[col.field]).toLocaleDateString('vi-VN')
                      : col.status
                      ? getStatusText(tableKey, item[col.field])
                      : item[col.field]}
                  </td>
                ))}
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const parsedId = parseInt(item[idField], 10);
                      console.log(`Mở modal xóa bản ghi cho ${tableKey} với id: ${parsedId}`);
                      setShowDeleteModal({ show: true, type: tableKey, id: parsedId });
                      setShowDeleteAllModal({ show: false, type: '' });
                    }}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} className="text-center">
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <Pagination className="justify-content-center mt-3">
        {Array.from({ length: totalPages[tableKey] }, (_, i) => (
          <Pagination.Item
            key={i + 1}
            active={i + 1 === currentPage[tableKey]}
            onClick={() => handlePageChange(tableKey)(i + 1)}
          >
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>
    </>
  );

  const tableConfigs = {
    thongbao: {
      columns: [
        { label: 'Mã Thông Báo', field: 'ma_thong_bao' },
        { label: 'Mã Sinh Viên', field: 'ma_so_sinh_vien' },
        { label: 'Nội Dung', field: 'noi_dung' },
        { label: 'Ngày Gửi', field: 'ngay_gui', date: true },
        { label: 'Trạng Thái', field: 'trang_thai', status: true },
      ],
      idField: 'ma_thong_bao',
    },
    loimoinhom: {
      columns: [
        { label: 'Mã Lời Mời', field: 'ma_loi_moi' },
        { label: 'Mã Nhóm', field: 'ma_nhom' },
        { label: 'Mã Sinh Viên', field: 'ma_so_sinh_vien' },
        { label: 'Ngày Gửi', field: 'ngay_gui', date: true },
        { label: 'Trạng Thái', field: 'trang_thai_loi_moi', status: true },
      ],
      idField: 'ma_loi_moi',
    },
    loixinnhom: {
      columns: [
        { label: 'Mã Lời Xin', field: 'ma_loi_xin' },
        { label: 'Mã Nhóm', field: 'ma_nhom' },
        { label: 'Mã Sinh Viên', field: 'ma_so_sinh_vien' },
        { label: 'Ngày Xin', field: 'ngay_gui', date: true },
        { label: 'Trạng Thái', field: 'trang_thai', status: true },
      ],
      idField: 'ma_loi_xin',
    },
  };

  return (
    <Container className="ql-thong-bao my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Quản Lý Thông Báo và Lời Mời</h2>
          <Card className="shadow-sm">
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="thongbao" title="Thông Báo">
                  {renderTable('thongbao', tableConfigs.thongbao.columns, 'thongbao', tableConfigs.thongbao.idField)}
                </Tab>
                <Tab eventKey="loimoinhom" title="Lời Mời Nhóm">
                  {renderTable('loimoinhom', tableConfigs.loimoinhom.columns, 'loimoinhom', tableConfigs.loimoinhom.idField)}
                </Tab>
                <Tab eventKey="loixinnhom" title="Lời Xin Nhóm">
                  {renderTable('loixinnhom', tableConfigs.loixinnhom.columns, 'loixinnhom', tableConfigs.loixinnhom.idField)}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showDeleteModal.show}
        onHide={() => setShowDeleteModal({ show: false, type: '', id: null })}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Xác Nhận Xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Bạn có chắc chắn muốn xóa bản ghi <strong>{showDeleteModal.id}</strong> trong {showDeleteModal.type === 'thongbao' ? 'Thông Báo' : showDeleteModal.type === 'loimoinhom' ? 'Lời Mời Nhóm' : 'Lời Xin Nhóm'}?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal({ show: false, type: '', id: null })}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Xóa
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showDeleteAllModal.show}
        onHide={() => setShowDeleteAllModal({ show: false, type: '' })}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Xác Nhận Xóa Tất Cả</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trong {showDeleteAllModal.type === 'thongbao' ? 'Thông Báo' : showDeleteAllModal.type === 'loimoinhom' ? 'Lời Mời Nhóm' : 'Lời Xin Nhóm'}?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteAllModal({ show: false, type: '' })}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteAll}>
            Xóa Tất Cả
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QLthongbao;