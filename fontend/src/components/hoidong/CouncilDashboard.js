import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';


const CouncilDashboard = () => {
  const [user, setUser] = useState(null);
  const [lichBaoVe, setLichBaoVe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login'); // Debug
      navigate('/');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        console.log('Token expired, redirecting to login'); // Debug
        localStorage.removeItem('token');
        navigate('/');
        return;
      }
    } catch (err) {
      console.error('Invalid token:', err); // Debug
      localStorage.removeItem('token');
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        console.log('Fetching user data with token:', token); // Debug
        const userResponse = await axios.get('http://localhost:5000/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userResponse.data);

        console.log('Fetching lichbaove data'); // Debug
        const lichResponse = await axios.get('http://localhost:5000/api/hoi_dong/lichbaove', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLichBaoVe(lichResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message); // Debug
        setError(err.response?.data?.message || 'Không thể tải dữ liệu');
        setLoading(false);
        if (err.response?.status === 401) {
          console.log('Unauthorized, redirecting to login'); // Debug
          localStorage.removeItem('token');
          navigate('/');
        }
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="council-container">
      <div className="header">
        <h2>Chào mừng, {user.ho_ten} (Hội đồng)</h2>
        <button onClick={handleLogout} className="logout-button">Đăng Xuất</button>
      </div>
      {loading && <p className="loading">Đang tải...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="content">
          <h3>Lịch bảo vệ</h3>
          {lichBaoVe.length === 0 ? (
            <p>Chưa có lịch bảo vệ.</p>
          ) : (
            <ul>
              {lichBaoVe.map((lich) => (
                <li key={lich.id_lich_bao_ve}>
                  <strong>Đề tài: {lich.ten_de_tai}</strong>
                  <p>Thời gian: {new Date(lich.thoi_gian).toLocaleString()}</p>
                  <p>Địa điểm: {lich.dia_diem}</p>
                  <p>Trạng thái: {lich.trang_thai_lich}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CouncilDashboard;