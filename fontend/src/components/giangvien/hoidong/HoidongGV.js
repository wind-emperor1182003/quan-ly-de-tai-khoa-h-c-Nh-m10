import React, { useEffect, useState } from 'react';
import { Table, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './HoidongGV.scss';

const HoidongGV = () => {
  const [hoidongList, setHoidongList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vui lòng đăng nhập');
      navigate('/');
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.vai_tro !== 'giang_vien') {
      setError('Bạn không có quyền truy cập');
      navigate('/');
      return;
    }

    const fetchHoiDong = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/giangvien/hoidong', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHoidongList(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Lỗi tải dữ liệu hội đồng');
        setLoading(false);
        toast.error(err.response?.data?.message || 'Lỗi tải dữ liệu');
      }
    };

    fetchHoiDong();
  }, [navigate]);

  const handleViewDetails = (ma_de_tai) => {
    navigate(`/giangvien/detai/${ma_de_tai}`);
  };

  if (loading) return <div className="text-center">Đang tải...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="hoidong-gv-container">
      <h2>Hội Đồng Bảo Vệ</h2>
      {hoidongList.length === 0 ? (
        <Alert variant="info">Bạn chưa được phân công vào hội đồng bảo vệ.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Mã lịch</th>
              <th>Tên đề tài</th>
              <th>Địa điểm</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th>Vai trò</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {hoidongList.map((item) => (
              <tr key={item.ma_lich}>
                <td>{item.ma_lich}</td>
                <td>{item.ten_de_tai}</td>
                <td>{item.dia_diem}</td>
                <td>{new Date(item.thoi_gian).toLocaleString('vi-VN')}</td>
                <td>{item.trang_thai}</td>
                <td>{item.vai_tro_hoi_dong}</td>
                <td>
                  <Button
                    variant="info"
                    onClick={() => handleViewDetails(item.ma_de_tai)}
                  >
                    Xem chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default HoidongGV;