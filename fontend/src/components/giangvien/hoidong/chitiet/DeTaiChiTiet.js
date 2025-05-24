import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Alert, Button, ListGroup, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import './DeTaiChiTiet.scss';

const DeTaiChiTiet = () => {
  const { ma_de_tai } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grading, setGrading] = useState({ diem_bao_ve: '', nhan_xet: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập');
      navigate('/');
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.vai_tro !== 'giang_vien') {
      setError('Chỉ giảng viên được phép truy cập');
      navigate('/');
      return;
    }

    const fetchDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/giangvien/detai/${ma_de_tai}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(response.data);
        const existingScore = response.data.scores.find(
          (score) => score.ma_so_giang_vien === decoded.ma_so
        );
        if (existingScore) {
          setGrading({
            diem_bao_ve: existingScore.diem_bao_ve,
            nhan_xet: existingScore.nhan_xet || '',
          });
          setIsEditing(false); // Ẩn form nếu đã chấm điểm
        } else {
          setIsEditing(true); // Hiện form nếu chưa chấm
        }
        setLoading(false);
      } catch (err) {
        const message = err.response?.data?.message || 'Lỗi tải dữ liệu đề tài';
        setError(message);
        setLoading(false);
        toast.error(message);
      }
    };

    fetchDetails();
  }, [ma_de_tai, navigate]);

  const handleGradingSubmit = async (e) => {
    e.preventDefault();
    if (!grading.diem_bao_ve || grading.diem_bao_ve < 0 || grading.diem_bao_ve > 100) {
      toast.error('Điểm phải từ 0 đến 100');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn ${isEditing && data.scores.find(s => s.ma_so_giang_vien === jwtDecode(localStorage.getItem('token')).ma_so) ? 'cập nhật' : 'gửi'} điểm này?`)) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/giangvien/detai/${ma_de_tai}/cham`,
        grading,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(isEditing && data.scores.find(s => s.ma_so_giang_vien === jwtDecode(token).ma_so) ? 'Cập nhật điểm thành công' : 'Chấm điểm thành công');
      const response = await axios.get(`http://localhost:5000/api/giangvien/detai/${ma_de_tai}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
      const existingScore = response.data.scores.find(
        (score) => score.ma_so_giang_vien === jwtDecode(token).ma_so
      );
      if (existingScore) {
        setGrading({
          diem_bao_ve: existingScore.diem_bao_ve,
          nhan_xet: existingScore.nhan_xet || '',
        });
        setIsEditing(false); // Ẩn form sau khi chấm/cập nhật
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi chấm điểm';
      toast.error(message);
      if (err.response?.status === 403) {
        toast.error('Bạn không có quyền chấm điểm. Vui lòng kiểm tra vai trò hội đồng.');
      } else if (err.response?.status === 400) {
        toast.error('Lịch bảo vệ chưa được xác nhận hoặc không tồn tại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradingChange = (e) => {
    const { name, value } = e.target;
    setGrading((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true); // Hiện form khi nhấn Sửa điểm
  };

  if (loading) return <div className="text-center">Đang tải...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!data) return <Alert variant="info">Không có dữ liệu</Alert>;

  const { topic, group, members, reports, schedule, scores, council, vai_tro_hoi_dong } = data;

  return (
    <Container className="detai-chitiet-container">
      <h2>Chi Tiết Đề Tài: {topic.ten_de_tai}</h2>

      <Card className="mb-4">
        <Card.Header>Thông Tin Đề Tài</Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>Mã đề tài:</strong> {topic.ma_de_tai}</ListGroup.Item>
            <ListGroup.Item><strong>Tên đề tài:</strong> {topic.ten_de_tai}</ListGroup.Item>
            <ListGroup.Item><strong>Mô tả:</strong> {topic.mo_ta || 'Không có'}</ListGroup.Item>
            <ListGroup.Item><strong>Trạng thái:</strong> {topic.trang_thai}</ListGroup.Item>
            <ListGroup.Item><strong>Ngày tạo:</strong> {new Date(topic.ngay_tao).toLocaleDateString('vi-VN')}</ListGroup.Item>
            <ListGroup.Item><strong>Số lượng sinh viên tối đa:</strong> {topic.so_luong_sinh_vien_toi_da}</ListGroup.Item>
            <ListGroup.Item><strong>Giảng viên hướng dẫn:</strong> {topic.ten_giang_vien || 'Chưa phân công'}</ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>Thông Tin Nhóm</Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>Mã nhóm:</strong> {group.ma_nhom || 'Không có'}</ListGroup.Item>
            <ListGroup.Item><strong>Tên nhóm:</strong> {group.ten_nhom || 'Không có'}</ListGroup.Item>
            <ListGroup.Item><strong>Trưởng nhóm:</strong> {group.ten_nhom_truong || 'Không có'}</ListGroup.Item>
            <ListGroup.Item><strong>Ngày tạo:</strong> {group.ngay_tao ? new Date(group.ngay_tao).toLocaleDateString('vi-VN') : 'Không có'}</ListGroup.Item>
            <ListGroup.Item><strong>Trạng thái nhóm:</strong> {group.trang_thai_nhom || 'Không có'}</ListGroup.Item>
          </ListGroup>
          <h5 className="mt-3">Danh Sách Thành Viên</h5>
          {members.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Mã sinh viên</th>
                  <th>Họ tên</th>
                  <th>Chức vụ</th>
                  <th>Ngày tham gia</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.ma_so_sinh_vien}>
                    <td>{member.ma_so_sinh_vien}</td>
                    <td>{member.ho_ten}</td>
                    <td>{member.chuc_vu}</td>
                    <td>{new Date(member.ngay_tham_gia).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">Nhóm chưa có thành viên</Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>Báo Cáo Tiến Độ</Card.Header>
        <Card.Body>
          {reports.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Mã báo cáo</th>
                  <th>Kỳ báo cáo</th>
                  <th>Hạn nộp</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Nhận xét SV</th>
                  <th>Nhận xét GV</th>
                  <th>Tệp</th>
                  <th>Sinh viên nộp</th>
                  <th>Trễ hạn</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.ma_bao_cao}>
                    <td>{report.ma_bao_cao}</td>
                    <td>{report.ky_bao_cao}</td>
                    <td>{new Date(report.han_nop).toLocaleDateString('vi-VN')}</td>
                    <td>{report.ngay_nop ? new Date(report.ngay_nop).toLocaleDateString('vi-VN') : 'Chưa nộp'}</td>
                    <td>{report.trang_thai}</td>
                    <td>{report.diem_tien_do ?? 'Chưa đánh giá'}</td>
                    <td>{report.nhan_xet_sinh_vien || 'Không có'}</td>
                    <td>{report.nhan_xet || 'Không có'}</td>
                    <td>
                      {report.tep_dinh_kem ? (
                        <a href={`http://localhost:5000${report.tep_dinh_kem}`} target="_blank" rel="noopener noreferrer">
                          Tải tệp
                        </a>
                      ) : 'Không có'}
                    </td>
                    <td>{report.ten_sinh_vien_nop || 'Chưa nộp'}</td>
                    <td>{report.tre_han ? 'Có' : 'Không'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">Chưa có báo cáo tiến độ</Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>Lịch Bảo Vệ</Card.Header>
        <Card.Body>
          {schedule.ma_lich ? (
            <ListGroup variant="flush">
              <ListGroup.Item><strong>Mã lịch:</strong> {schedule.ma_lich}</ListGroup.Item>
              <ListGroup.Item><strong>Địa điểm:</strong> {schedule.dia_diem}</ListGroup.Item>
              <ListGroup.Item><strong>Thời gian:</strong> {new Date(schedule.thoi_gian).toLocaleString('vi-VN')}</ListGroup.Item>
              <ListGroup.Item><strong>Trạng thái:</strong> {schedule.trang_thai}</ListGroup.Item>
            </ListGroup>
          ) : (
            <Alert variant="info">Chưa có lịch bảo vệ</Alert>
          )}
        </Card.Body>
      </Card>

      {vai_tro_hoi_dong === 'Chủ tịch' && schedule.trang_thai === 'Đã xác nhận' ? (
        <Card className="mb-4">
          <Card.Header>Chấm Điểm Bảo Vệ</Card.Header>
          <Card.Body>
            {isEditing ? (
              <Form onSubmit={handleGradingSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Điểm bảo vệ (0-100)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      name="diem_bao_ve"
                      value={grading.diem_bao_ve}
                      onChange={handleGradingChange}
                      min="0"
                      max="100"
                      required
                    />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nhận xét</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="nhan_xet"
                    value={grading.nhan_xet}
                    onChange={handleGradingChange}
                    rows={4}
                  />
                </Form.Group>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : (data.scores.find(s => s.ma_so_giang_vien === jwtDecode(localStorage.getItem('token')).ma_so) ? 'Cập nhật điểm' : 'Gửi điểm')}
                </Button>
                {data.scores.find(s => s.ma_so_giang_vien === jwtDecode(localStorage.getItem('token')).ma_so) && (
                  <Button variant="secondary" className="ms-2" onClick={() => setIsEditing(false)} disabled={submitting}>
                    Hủy
                  </Button>
                )}
              </Form>
            ) : (
              <Button variant="warning" onClick={handleEditClick} disabled={submitting}>
                Sửa điểm
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : vai_tro_hoi_dong === 'Chủ tịch' ? (
        <Alert variant="info">Lịch bảo vệ chưa được xác nhận, không thể chấm điểm.</Alert>
      ) : (
        <Alert variant="info">Chỉ Chủ tịch hội đồng được phép chấm điểm.</Alert>
      )}

      <Card className="mb-4">
        <Card.Header>Điểm Bảo Vệ</Card.Header>
        <Card.Body>
          {scores.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Mã chấm</th>
                  <th>Giảng viên chấm</th>
                  <th>Điểm</th>
                  <th>Nhận xét</th>
                  <th>Ngày chấm</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.ma_cham}>
                    <td>{score.ma_cham}</td>
                    <td>{score.ten_giang_vien}</td>
                    <td>{score.diem_bao_ve}</td>
                    <td>{score.nhan_xet || 'Không có'}</td>
                    <td>{new Date(score.ngay_cham).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">Chưa có điểm bảo vệ</Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>Hội Đồng Bảo Vệ</Card.Header>
        <Card.Body>
          {council.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Giảng viên</th>
                  <th>Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {council.map((member) => (
                  <tr key={member.ma_giang_vien}>
                    <td>{member.ten_giang_vien}</td>
                    <td>{member.vai_tro_hoi_dong}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">Chưa có hội đồng bảo vệ</Alert>
          )}
        </Card.Body>
      </Card>

      <Button variant="secondary" onClick={() => navigate(-1)}>
        Quay lại
      </Button>
    </Container>
  );
};

export default DeTaiChiTiet;