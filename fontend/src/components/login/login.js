//D:\2025\CNPM\Doan\fontend\qldt\login\login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import Header from '../layout1/head/Header';
import Footer from '../layout1/Footer/Footer';
import './login.scss';

const Login = () => {
  const [maSo, setMaSo] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log('Token found, decoded:', decoded);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.log('Token expired');
          localStorage.removeItem('token');
          localStorage.removeItem('vai_tro');
          localStorage.removeItem('ho_ten');
          toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', { autoClose: 3000 });
          return;
        }
        const vaiTro = decoded.vai_tro;
        console.log('Redirecting to role:', vaiTro);
        setTimeout(() => {
          switch (vaiTro) {
            case 'sinh_vien':
              navigate('/student', { replace: true });
              break;
            case 'giang_vien':
              navigate('/teacher', { replace: true });
              break;
            case 'quan_ly':
              navigate('/admin', { replace: true });
              break;
            default:
              navigate('/home', { replace: true });
          }
        }, 100);
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('vai_tro');
        localStorage.removeItem('ho_ten');
        toast.error('Token không hợp lệ, vui lòng đăng nhập lại', { autoClose: 3000 });
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const trimmedMaSo = maSo.trim();
    const trimmedMatKhau = matKhau.trim();
    if (!trimmedMaSo || !trimmedMatKhau) {
      toast.error('Vui lòng nhập đầy đủ mã số và mật khẩu', { autoClose: 3000 });
      setLoading(false);
      return;
    }

    try {
      console.log('Sending login request:', { ma_so: trimmedMaSo, mat_khau: trimmedMatKhau });
      const response = await axios.post('http://localhost:5000/api/login', {
        ma_so: trimmedMaSo,
        mat_khau: trimmedMatKhau,
      }, {
        timeout: 5000,
      });
      console.log('API response:', response.data);
      const { token, vai_tro, ho_ten } = response.data;
      console.log('Login successful, token:', token, 'vai_tro:', vai_tro, 'ho_ten:', ho_ten);

      localStorage.setItem('token', token);
      localStorage.setItem('vai_tro', vai_tro);
      localStorage.setItem('ho_ten', ho_ten);

      toast.success('Đăng nhập thành công!', { autoClose: 1000 });

      // Kiểm tra token với /api/user/me
      try {
        const userResponse = await axios.get('http://localhost:5000/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        console.log('User data verified:', userResponse.data);
      } catch (err) {
        console.error('User verification failed:', err.response?.data || err.message);
        toast.error('Không thể xác minh người dùng, vui lòng đăng nhập lại', { autoClose: 3000 });
        localStorage.removeItem('token');
        localStorage.removeItem('vai_tro');
        localStorage.removeItem('ho_ten');
        setLoading(false);
        return;
      }

      // Trì hoãn chuyển hướng để tránh xung đột với Header.js
      setTimeout(() => {
        switch (vai_tro) {
          case 'sinh_vien':
            navigate('/student', { replace: true });
            break;
          case 'giang_vien':
            navigate('/teacher', { replace: true });
            break;
          case 'quan_ly':
            navigate('/admin', { replace: true });
            break;
          default:
            navigate('/home', { replace: true });
        }
      }, 500); // Tăng delay lên 500ms
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      const message = err.response?.data?.message || 'Đăng nhập thất bại! Vui lòng kiểm tra kết nối hoặc thử lại.';
      toast.error(message, { autoClose: 3000 });
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Header isLoginPage={true} />
      <main className="login-container">
        <div className="login-box">
          <h2 className="gradient-text">Đăng Nhập</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="maSo">Mã số</label>
              <input
                type="text"
                id="maSo"
                className="form-control"
                value={maSo}
                onChange={(e) => setMaSo(e.target.value)}
                placeholder="Nhập mã số"
                required
                disabled={loading}
                aria-label="Mã số"
              />
            </div>
            <div className="form-group">
              <label htmlFor="matKhau">Mật khẩu</label>
              <input
                type="password"
                id="matKhau"
                className="form-control"
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                disabled={loading}
                aria-label="Mật khẩu"
              />
            </div>
            <button
              type="submit"
              className="btn btn-gradient"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;