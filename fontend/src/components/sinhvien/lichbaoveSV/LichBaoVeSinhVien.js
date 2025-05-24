
// D:\2025\CNPM\Doan\frontend\qldt\src\components\sinhvien\lichbaoveSV\LichBaoVeSinhVien.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Button } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import './LichBaoVeSinhVien.scss'; // Import SCSS mới

const LichBaoVeSinhVien = () => {
  const [lichBaoVe, setLichBaoVe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLichBaoVe();
  }, []);

  const fetchLichBaoVe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/lich-bao-ve', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLichBaoVe(response.data.lichBaoVe || []);
      setError('');
    } catch (err) {
      console.error('Lỗi lấy danh sách lịch bảo vệ:', err);
      setError('Không thể lấy danh sách lịch bảo vệ');
      toast.error('Lỗi lấy danh sách lịch bảo vệ');
    } finally {
      setLoading(false);
    }
  };

  const fetchHoiDong = async (ma_lich) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/lich-bao-ve/${ma_lich}/hoi-dong`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hoiDong = response.data.hoiDong;
      const hoiDongText = hoiDong.map(member => `${member.ho_ten} (${member.vai_tro_hoi_dong || 'Thành viên'})`).join(', ');
      toast.info(`Hội đồng bảo vệ: ${hoiDongText}`);
    } catch (err) {
      console.error('Lỗi lấy hội đồng bảo vệ:', err);
      toast.error('Không thể lấy hội đồng bảo vệ');
    }
  };

  return (
    <Container className="ql-lichbaove my-5">
      <Row>
        <Col>
          <h2 className="gradient-text mb-4">Lịch Bảo Vệ</h2>
          <Card className="shadow-sm modern-card">
            <Card.Body>
              {error && <p className="text-danger">{error}</p>}
              {loading ? (
                <div className="spinner-container">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <Table responsive striped bordered hover className="modern-table">
                  <thead className="modern-table-header">
                    <tr>
                      <th>Tên đề tài</th>
                      <th>Khoa</th>
                      <th>Địa điểm</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Hội đồng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lichBaoVe.length > 0 ? (
                      lichBaoVe.map((lich) => (
                        <tr key={lich.ma_lich}>
                          <td>{lich.ten_de_tai}</td>
                          <td>{lich.ten_khoa}</td>
                          <td>{lich.dia_diem}</td>
                          <td>{new Date(lich.thoi_gian).toLocaleString('vi-VN')}</td>
                          <td>{lich.trang_thai}</td>
                          <td>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => fetchHoiDong(lich.ma_lich)}
                              className="action-btn"
                            >
                              Xem hội đồng
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          Không có lịch bảo vệ nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LichBaoVeSinhVien;
