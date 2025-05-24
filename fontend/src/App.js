// D:\2025\CNPM\Doan\frontend\qldt\src\App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './components/login/login';
import StudentDashboard from './components/sinhvien/StudentDashboard';
import TeacherDashboard from './components/giangvien/TeacherDashboard';
import QLnguoidung from './components/admin/nguoidung/QLnguoidung';
import QLdetai from './components/admin/detai/QLdetai';
import RegisterDeTai from './components/sinhvien/Dangky/RegisterDeTai';
import Home from './components/home/Home';
import News from './components/news/News';
import Header from './components/layout1/head/Header';
import Footer from './components/layout1/Footer/Footer';
import DangKyGiangVien from './components/sinhvien/DangkyGiangvien/DangKyGiangVien';
import Sinhvienbaocao from './components/sinhvien/baocao/Sinhvienbaocao';
import Giangvienbaocao from './components/giangvien/baocao/Giangvienbaocao';
import QLKhoaLopBoMon from './components/admin/bomon/QLKhoaLopBoMon';
import QLLichBaoVe from './components/admin/lichbaove/QLLichBaoVe';
import LichBaoVeSinhVien from './components/sinhvien/lichbaoveSV/LichBaoVeSinhVien';
import QLbaocao from './components/admin/baocao/QLbaocao';
import QLnhom from './components/admin/nhom/QLnhom';
import HoidongGV from './components/giangvien/hoidong/HoidongGV';
import DeTaiChiTiet from './components/giangvien/hoidong/chitiet/DeTaiChiTiet';
import QLDiem from './components/admin/diem/QLDiem';
import QLDKgiangvien from './components/admin/dKgiangvien/QLDKgiangvien';
import QLthongbao from './components/admin/thongbao/QLthongbao'; // Import new component

const App = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <div className="app">
      {!isLoginPage && <Header />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/registerdetai" element={<RegisterDeTai />} />
        <Route path="/student/dang-ky-giang-vien" element={<DangKyGiangVien />} />
        <Route path="/student/baocao" element={<Sinhvienbaocao />} />
        <Route path="/student/lich-bao-ve" element={<LichBaoVeSinhVien />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/giangvien/baocao" element={<Giangvienbaocao />} />
        <Route path="/giangvien/hoidong" element={<HoidongGV />} />
        <Route path="/giangvien/detai/:ma_de_tai" element={<DeTaiChiTiet />} />
        <Route path="/admin/users" element={<QLnguoidung />} />
        <Route path="/admin/detai" element={<QLdetai />} />
        <Route path="/admin/khoa-lop-bomon" element={<QLKhoaLopBoMon />} />
        <Route path="/admin/lich-bao-ve" element={<QLLichBaoVe />} />
        <Route path="/admin/baocao" element={<QLbaocao />} />
        <Route path="/admin/nhom" element={<QLnhom />} />
        <Route path="/admin/diem" element={<QLDiem />} />
        <Route path="/admin/dk-giang-vien" element={<QLDKgiangvien />} />
        <Route path="/admin/thong-bao" element={<QLthongbao />} /> {/* New route */}
        <Route path="/debug" element={<div style={{ padding: '20px' }}>Debug: Ứng dụng đang chạy</div>} />
      </Routes>
      <Footer />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;