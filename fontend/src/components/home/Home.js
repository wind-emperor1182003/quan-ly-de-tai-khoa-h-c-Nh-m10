import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout1/head/Header';
import Footer from '../layout1/Footer/Footer';
import './Home.scss';

const Home = () => {
  return (
    <div className="home-page">
      <main className="home-container">
        {/* Banner Section */}
        <section className="banner">
          <div id="bannerCarousel" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {[
                {
                  img: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1920&auto=format&fit=crop',
                  title: 'Hệ thống Quản lý Đề tài',
                  subtitle: 'Đăng ký và quản lý đề tài dễ dàng',
                  description:
                    'Hỗ trợ sinh viên và giảng viên trong việc đăng ký, quản lý và theo dõi tiến độ các đề tài nghiên cứu khoa học.',
                  buttonText: 'Đăng ký ngay',
                  buttonLink: '/register-topic',
                },
                {
                  img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1920&auto=format&fit=crop',
                  title: 'Theo dõi tiến độ',
                  subtitle: 'Cập nhật trạng thái đề tài mọi lúc',
                  description:
                    'Kiểm tra tiến độ đề tài, nhận thông báo và nộp báo cáo trực tuyến nhanh chóng.',
                  buttonText: 'Xem tiến độ',
                  buttonLink: '/track-progress',
                },
                {
                  img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1920&auto=format&fit=crop',
                  title: 'Hỗ trợ nghiên cứu',
                  subtitle: 'Tài liệu và hướng dẫn chi tiết',
                  description:
                    'Truy cập kho tài liệu, hướng dẫn và các công cụ hỗ trợ nghiên cứu khoa học.',
                  buttonText: 'Khám phá tài liệu',
                  buttonLink: '/resources',
                },
              ].map((slide, index) => (
                <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                  <div
                    className="banner-bg"
                    style={{ backgroundImage: `url(${slide.img})` }}
                  >
                    <div className="container-fluid px-0 px-md-5">
                      <div className="row align-items-center px-3">
                        <div className="col-lg-6 text-center text-lg-left animate__animated animate__fadeInLeft">
                          <h4 className="text-white mb-4 mt-5 mt-lg-0">{slide.title}</h4>
                          <h1 className="display-3 font-weight-bold text-white">{slide.subtitle}</h1>
                          <p className="text-white mb-4">{slide.description}</p>
                          <Link
                            to={slide.buttonLink}
                            className="btn btn-primary mt-1 py-3 px-5"
                            onClick={() => console.log('Button clicked:', slide.buttonLink)}
                          >
                            {slide.buttonText}
                          </Link>
                        </div>
                        <div className="col-lg-6 text-center text-lg-right">
                          <img
                            className="img-fluid mt-5 animate__animated animate__fadeInRight"
                            src={slide.img}
                            alt={slide.title}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="carousel-control-prev"
              type="button"
              data-bs-target="#bannerCarousel"
              data-bs-slide="prev"
            >
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className="carousel-control-next"
              type="button"
              data-bs-target="#bannerCarousel"
              data-bs-slide="next"
            >
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
            <div className="carousel-indicators">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  data-bs-target="#bannerCarousel"
                  data-bs-slide-to={i}
                  className={i === 0 ? 'active' : ''}
                  aria-label={`Slide ${i + 1}`}
                ></button>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="container">
            <h2 className="section-title animate__animated animate__fadeInDown">Chức năng chính</h2>
            <div className="row">
              {[
                {
                  icon: 'fas fa-file-alt',
                  title: 'Đăng ký đề tài',
                  description: 'Dễ dàng đăng ký đề tài nghiên cứu với quy trình đơn giản và trực quan.',
                  link: '/register-topic',
                },
                {
                  icon: 'fas fa-chart-line',
                  title: 'Theo dõi tiến độ',
                  description: 'Theo dõi trạng thái đề tài và nhận thông báo cập nhật.',
                  link: '/track-progress',
                },
                {
                  icon: 'fas fa-book',
                  title: 'Tài liệu hỗ trợ',
                  description: 'Truy cập tài liệu hướng dẫn và các công cụ nghiên cứu.',
                  link: '/resources',
                },
              ].map((feature, index) => (
                <div key={index} className="col-md-4 feature-card animate__animated animate__zoomIn">
                  <i className={`${feature.icon} fa-3x mb-3`}></i>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <Link to={feature.link} className="btn btn-outline-primary">Tìm hiểu thêm</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Topics Section */}
        <section className="featured-topics">
          <div className="container">
            <h2 className="section-title animate__animated animate__fadeInDown">Đề tài nổi bật</h2>
            <div className="row">
              {[
                {
                  title: 'Ứng dụng AI trong Y học',
                  description: 'Nghiên cứu ứng dụng trí tuệ nhân tạo để chẩn đoán bệnh sớm.',
                  field: 'Công nghệ thông tin',
                  supervisor: 'TS. Nguyễn Văn A',
                  link: '/topics/ai-in-medicine',
                },
                {
                  title: 'Phát triển năng lượng tái tạo',
                  description: 'Tìm hiểu các giải pháp năng lượng bền vững cho tương lai.',
                  field: 'Kỹ thuật',
                  supervisor: 'PGS. Trần Thị B',
                  link: '/topics/renewable-energy',
                },
                {
                  title: 'Phân tích dữ liệu kinh tế',
                  description: 'Ứng dụng big data trong dự báo kinh tế vĩ mô.',
                  field: 'Kinh tế',
                  supervisor: 'TS. Lê Văn C',
                  link: '/topics/economic-data',
                },
              ].map((topic, index) => (
                <div key={index} className="col-md-4 topic-card animate__animated animate__fadeInUp">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">{topic.title}</h5>
                      <p className="card-text">{topic.description}</p>
                      <p className="card-text"><strong>Lĩnh vực:</strong> {topic.field}</p>
                      <p className="card-text"><strong>Giảng viên hướng dẫn:</strong> {topic.supervisor}</p>
                      <Link to={topic.link} className="btn btn-primary">Xem chi tiết</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="statistics">
          <div className="container">
            <h2 className="section-title animate__animated animate__fadeInDown">Thống kê nổi bật</h2>
            <div className="row">
              {[
                { number: '500+', label: 'Đề tài đã đăng ký' },
                { number: '2000+', label: 'Sinh viên tham gia' },
                { number: '100+', label: 'Giảng viên hướng dẫn' },
              ].map((stat, index) => (
                <div key={index} className="col-md-4 text-center animate__animated animate__fadeInUp">
                  <h3 className="stat-number">{stat.number}</h3>
                  <p>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq">
          <div className="container">
            <h2 className="section-title animate__animated animate__fadeInDown">Câu hỏi thường gặp</h2>
            <div className="accordion" id="faqAccordion">
              {[
                {
                  question: 'Làm thế nào để đăng ký đề tài?',
                  answer: 'Đăng nhập vào hệ thống, chọn mục "Đăng ký đề tài", điền thông tin và gửi yêu cầu. Hội đồng sẽ xét duyệt trong 7 ngày.',
                },
                {
                  question: 'Ai có thể tham gia hướng dẫn đề tài?',
                  answer: 'Giảng viên có trình độ từ thạc sĩ trở lên và được nhà trường phê duyệt có thể hướng dẫn đề tài.',
                },
                {
                  question: 'Làm sao để theo dõi tiến độ đề tài?',
                  answer: 'Vào mục "Theo dõi tiến độ" để xem trạng thái và nhận thông báo cập nhật từ hệ thống.',
                },
              ].map((faq, index) => (
                <div className="accordion-item" key={index}>
                  <h2 className="accordion-header" id={`heading${index}`}>
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#collapse${index}`}
                      aria-expanded="false"
                      aria-controls={`collapse${index}`}
                    >
                      {faq.question}
                    </button>
                  </h2>
                  <div
                    id={`collapse${index}`}
                    className="accordion-collapse collapse"
                    aria-labelledby={`heading${index}`}
                    data-bs-parent="#faqAccordion"
                  >
                    <div className="accordion-body">{faq.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guide Section */}
        <section className="guide">
          <div className="container">
            <h2 className="section-title animate__animated animate__fadeInDown">Hướng dẫn sử dụng</h2>
            <div className="row">
              <div className="col-md-6">
                <h4>Bước 1: Đăng ký tài khoản</h4>
                <p>Đăng ký tài khoản sinh viên hoặc giảng viên để bắt đầu sử dụng hệ thống.</p>
              </div>
              <div className="col-md-6">
                <h4>Bước 2: Đăng ký đề tài</h4>
                <p>Chọn lĩnh vực, điền thông tin đề tài và gửi yêu cầu phê duyệt.</p>
              </div>
              <div className="col-md-6">
                <h4>Bước 3: Theo dõi tiến độ</h4>
                <p>Nhận thông báo và cập nhật trạng thái từ hội đồng xét duyệt.</p>
              </div>
              <div className="col-md-6">
                <h4>Bước 4: Nộp báo cáo</h4>
                <p>Nộp báo cáo định kỳ và nhận phản hồi từ giảng viên hướng dẫn.</p>
              </div>
            </div>
            <div className="text-center mt-4">
              <Link to="/guide" className="btn btn-primary btn-lg">Xem hướng dẫn chi tiết</Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta">
          <div className="container text-center">
            <h2 className="mb-4 animate__animated animate__pulse">Bắt đầu nghiên cứu của bạn ngay hôm nay!</h2>
            <Link to="/register-topic" className="btn btn-primary btn-lg">Đăng ký đề tài ngay</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;