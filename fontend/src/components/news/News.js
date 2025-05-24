import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout1/head/Header';
import Footer from '../layout1/Footer/Footer';
import './News.scss';

const News = () => {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Mock news data
  const newsItems = [
    {
      id: 1,
      title: 'Thông báo mở đăng ký đề tài',
      content: 'Đợt đăng ký đề tài mới sẽ bắt đầu từ ngày 01/06/2025. Sinh viên và giảng viên vui lòng chuẩn bị hồ sơ theo hướng dẫn.',
      date: '20/05/2025',
      category: 'announcements',
    },
    {
      id: 2,
      title: 'Hội thảo khoa học 2025',
      content: 'Hội thảo sẽ được tổ chức vào ngày 15/07/2025 tại Hội trường A. Đăng ký tham gia trước ngày 30/06/2025.',
      date: '15/05/2025',
      category: 'events',
    },
    {
      id: 3,
      title: 'Cập nhật quy trình đánh giá đề tài',
      content: 'Quy trình đánh giá đề tài mới đã được cập nhật, áp dụng từ tháng 06/2025.',
      date: '10/05/2025',
      category: 'announcements',
    },
    {
      id: 4,
      title: 'Lễ trao giải nghiên cứu khoa học',
      content: 'Lễ trao giải sẽ diễn ra vào ngày 20/08/2025 tại Trung tâm Hội nghị.',
      date: '05/05/2025',
      category: 'events',
    },
    {
      id: 5,
      title: 'Khóa học kỹ năng nghiên cứu',
      content: 'Khóa học miễn phí dành cho sinh viên sẽ bắt đầu từ ngày 10/06/2025.',
      date: '01/05/2025',
      category: 'events',
    },
    {
      id: 6,
      title: 'Thông báo nghỉ lễ',
      content: 'Hệ thống sẽ tạm ngừng hoạt động từ ngày 30/04/2025 đến 02/05/2025.',
      date: '25/04/2025',
      category: 'announcements',
    },
  ];

  // Filter news based on category
  const filteredNews = filter === 'all' ? newsItems : newsItems.filter(item => item.category === filter);

  // Pagination logic
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="news-page">
      <main className="news-container">
        <h2 className="section-title animate__animated animate__slideInDown">Tin Tức</h2>
        <div className="filter-bar animate__animated animate__fadeIn">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'announcements', label: 'Thông báo' },
            { value: 'events', label: 'Sự kiện' },
          ].map((option, index) => (
            <button
              key={index}
              className={`filter-button ${filter === option.value ? 'active' : ''}`}
              onClick={() => {
                setFilter(option.value);
                setCurrentPage(1);
              }}
              aria-label={`Lọc tin tức theo ${option.label}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="news-grid">
          {paginatedNews.length > 0 ? (
            paginatedNews.map((item, index) => (
              <div
                key={item.id}
                className="news-item animate__animated animate__fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="news-card">
                  <span className={`category-tag ${item.category}`}>{item.category === 'announcements' ? 'Thông báo' : 'Sự kiện'}</span>
                  <h3>{item.title}</h3>
                  <p className="news-date">{item.date}</p>
                  <p className="news-content">{item.content}</p>
                  <Link to={`/news/${item.id}`} className="read-more btn btn-gradient" aria-label={`Đọc thêm về ${item.title}`}>
                    Đọc thêm
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="no-results">Không có tin tức nào trong danh mục này.</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="pagination animate__animated animate__fadeIn">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Trang trước"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            {[...Array(totalPages).keys()].map(page => (
              <button
                key={page + 1}
                className={`pagination-button ${currentPage === page + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(page + 1)}
                aria-label={`Trang ${page + 1}`}
              >
                {page + 1}
              </button>
            ))}
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Trang sau"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default News;