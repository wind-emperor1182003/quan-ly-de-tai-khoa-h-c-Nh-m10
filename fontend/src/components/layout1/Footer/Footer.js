// D:\2025\CNPM\Doan\frontend\qldt\src\components\layout1\Footer\Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer container-fluid text-white py-5 px-sm-3 px-md-5">
      <div className="row pt-5">
        {/* About Section */}
        <div className="col-lg-4 col-md-6 mb-5 animate__animated animate__fadeInUp">
          <Link to="/" className="navbar-brand font-weight-bold m-0 mb-4 p-0">
            <h2 className="gradient-text mb-4">Hệ Thống Quản Lý Đề Tài</h2>
          </Link>
          <p>
            Nền tảng hỗ trợ sinh viên và giảng viên đăng ký, quản lý và theo dõi đề tài nghiên cứu khoa học, thúc đẩy sáng tạo và phát triển học thuật tại Việt Nam.
          </p>
          <div className="d-flex justify-content-start mt-4">
            {[
              { href: 'https://twitter.com/qldt', icon: 'fab fa-twitter', label: 'Twitter' },
              { href: 'https://facebook.com/qldt', icon: 'fab fa-facebook-f', label: 'Facebook' },
              { href: 'https://linkedin.com/company/qldt', icon: 'fab fa-linkedin-in', label: 'LinkedIn' },
              { href: 'https://instagram.com/qldt', icon: 'fab fa-instagram', label: 'Instagram' },
            ].map((social, index) => (
              <a
                key={index}
                className="btn btn-outline-gradient rounded-circle text-center mr-2 px-0"
                href={social.href}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className={social.icon}></i>
              </a>
            ))}
          </div>
        </div>

        {/* Navigation Links Section */}
        <div className="col-lg-4 col-md-6 mb-5 animate__animated animate__fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="row">
            <div className="col-6">
              <h3 className="gradient-text mb-4">Hệ thống</h3>
              <div className="d-flex flex-column justify-content-start">
                {[
                  { to: '/', text: 'Trang Chủ' },
                  { to: '/register-topic', text: 'Đăng Ký Đề Tài' },
                  { to: '/track-progress', text: 'Theo Dõi Tiến Độ' },
                  { to: '/news', text: 'Tin Tức' },
                ].map((link, index) => (
                  <Link key={index} className="text-white mb-2 gradient-link" to={link.to}>
                    <i className="fas fa-angle-right mr-2"></i>{link.text}
                  </Link>
                ))}
              </div>
            </div>
            <div className="col-6">
              <h3 className="gradient-text mb-4">Tài nguyên</h3>
              <div className="d-flex flex-column justify-content-start">
                {[
                  { to: '/guidelines', text: 'Hướng Dẫn Đăng Ký' },
                  { to: '/templates', text: 'Mẫu Báo Cáo' },
                  { to: '/resources', text: 'Tài Liệu' },
                  { to: '/faq', text: 'Câu Hỏi Thường Gặp' },
                ].map((link, index) => (
                  <Link key={index} className="text-white mb-2 gradient-link" to={link.to}>
                    <i className="fas fa-angle-right mr-2"></i>{link.text}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="col-lg-4 col-md-12 mb-5 animate__animated animate__fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3 className="gradient-text mb-4">Liên Hệ</h3>
          {[
            { icon: 'fas fa-map-marker-alt', title: 'Địa chỉ', content: '123 Nguyễn Văn Linh, Đà Nẵng' },
            { icon: 'fas fa-envelope', title: 'Email', content: 'support@qldt.edu.vn' },
            { icon: 'fas fa-phone-alt', title: 'Điện thoại', content: '0123 456 789' },
          ].map((contact, index) => (
            <div key={index} className="d-flex mb-3">
              <h4 className={`${contact.icon} gradient-icon`} aria-hidden="true"></h4>
              <div className="pl-3">
                <h5 className="text-white">{contact.title}</h5>
                <p>{contact.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
   <div className="container-fluid pt-5 bottom-bar" style={{ borderTop: '1px solid #ccc' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
          <p className="m-0 text-white">
            © <Link className="gradient-text font-weight-bold" to="/">Hệ Thống Quản Lý Đề Tài</Link>. All Rights Reserved.
          </p>
          <div className="d-flex mt-3 mt-md-0">
            {[
              { to: '/privacy-policy', text: 'Chính Sách Bảo Mật' },
              { to: '/terms-of-service', text: 'Điều Khoản Dịch Vụ' },
            ].map((link, index) => (
              <Link key={index} className="text-white ml-3 gradient-link" to={link.to}>
                {link.text}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;