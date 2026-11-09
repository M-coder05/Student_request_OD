import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DemoLogin from '../components/DemoLogin';
import DemoBanner from '../components/DemoBanner';
import { useAuth } from '../context/AuthContext';
import { useFeatures } from '../context/FeatureContext';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { appointmentsEnabled } = useFeatures();
  const appointmentPath =
    isAuthenticated && user?.role === 'student' ? '/appointments/book' : '/login';

  useEffect(() => {
    document.body.className = 'home-page';

    return () => {
      document.body.className = '';
    };
  }, []);

  return (
    <div>
      <DemoBanner />
      <Navbar />

      <main>
        <section id="home" className="home-hero">
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <h1>Leave, on-duty, bonafide and appointments, from one student account.</h1>
              <p>
                Fill the form for the service you need, attach the supporting file, and submit it to
                your department. The request then appears in Request status with an ID and the date
                you sent it, so you can follow the decision without visiting the office.
              </p>
              <div className="home-hero-actions">
                <Link className="site-button site-button-primary" to="/register">
                  Create a student account
                </Link>
                <Link className="site-button site-button-quiet" to="/login">
                  Sign in
                </Link>
              </div>
              <p className="home-hero-note">
                Already submitted something?{' '}
                <Link to="/status">Open Request status</Link> to read the latest remark.
              </p>
            </div>

            <aside className="notice-board" aria-labelledby="notice-board-title">
              <div className="notice-board-head">
                <span className="section-kicker">Notice board</span>
                <h2 id="notice-board-title">What you can do here</h2>
              </div>
              <ul className="notice-list">
                <li>
                  <Link to="/leave">
                    <span className="notice-number">01</span>
                    <span className="notice-copy">
                      <strong>Leave application</strong>
                      <small>Dates, reason, and a medical note if you have one.</small>
                    </span>
                    <span className="notice-action">Open</span>
                  </Link>
                </li>
                <li>
                  <Link to="/od">
                    <span className="notice-number">02</span>
                    <span className="notice-copy">
                      <strong>On-duty request</strong>
                      <small>Event details and the permission letter.</small>
                    </span>
                    <span className="notice-action">Open</span>
                  </Link>
                </li>
                <li>
                  <Link to="/bonafide">
                    <span className="notice-number">03</span>
                    <span className="notice-copy">
                      <strong>Bonafide certificate</strong>
                      <small>Purpose and supporting document, issued as a PDF.</small>
                    </span>
                    <span className="notice-action">Open</span>
                  </Link>
                </li>
                <li>
                  <Link to="/complaint">
                    <span className="notice-number">04</span>
                    <span className="notice-copy">
                      <strong>Student complaint</strong>
                      <small>Category, subject, and a description of the issue.</small>
                    </span>
                    <span className="notice-action">Open</span>
                  </Link>
                </li>
                {appointmentsEnabled ? (
                  <li>
                    <Link to={appointmentPath}>
                      <span className="notice-number">05</span>
                      <span className="notice-copy">
                        <strong>Appointment</strong>
                        <small>Faculty, HOD or Principal, with a date and time.</small>
                      </span>
                      <span className="notice-action">Open</span>
                    </Link>
                  </li>
                ) : null}
              </ul>
              <p className="notice-foot">
                Sign in to open a service. Your department reviews each request and records the
                decision in the portal.
              </p>
            </aside>
          </div>
        </section>

        <section id="services" className="home-services home-section">
          <div className="container">
            <div className="section-head">
              <h2>Services for the requests students make most.</h2>
              <p>
                Each service has a short form. Sign in before you start, and the request will appear
                in Request status after you submit it.
              </p>
            </div>

            <ol className="service-list">
              <li className="service-row service-row-lead">
                <span className="service-number">01</span>
                <div className="service-copy">
                  <h3>
                    <Link to="/leave">Leave application</Link>
                  </h3>
                  <p>
                    Enter the dates and reason for an academic absence. Attach a medical certificate
                    or other proof if you have one, then submit the request to your department.
                  </p>
                </div>
                <Link className="service-open" to="/leave">
                  Start a leave request
                </Link>
              </li>

              <li className="service-row">
                <span className="service-number">02</span>
                <div className="service-copy">
                  <h3>
                    <Link to="/od">On-duty request</Link>
                  </h3>
                  <p>
                    Give the event name, date, location and organizer, and attach the invitation or
                    permission letter.
                  </p>
                </div>
                <Link className="service-open" to="/od">
                  Start an on-duty request
                </Link>
              </li>

              <li className="service-row">
                <span className="service-number">03</span>
                <div className="service-copy">
                  <h3>
                    <Link to="/bonafide">Bonafide certificate</Link>
                  </h3>
                  <p>
                    Choose the purpose, from scholarship to bank loan, add any format details, and
                    attach the supporting document. Approved certificates download as a PDF.
                  </p>
                </div>
                <Link className="service-open" to="/bonafide">
                  Request a certificate
                </Link>
              </li>

              <li className="service-row">
                <span className="service-number">04</span>
                <div className="service-copy">
                  <h3>
                    <Link to="/complaint">Student complaint</Link>
                  </h3>
                  <p>
                    Pick a category, write the subject and description, and attach a screenshot or
                    document if it helps explain the issue.
                  </p>
                </div>
                <Link className="service-open" to="/complaint">
                  Register a complaint
                </Link>
              </li>

              {appointmentsEnabled ? (
                <li className="service-row">
                  <span className="service-number">05</span>
                  <div className="service-copy">
                    <h3>
                      <Link to={appointmentPath}>Appointment</Link>
                    </h3>
                    <p>
                      Choose faculty, HOD or Principal, pick a free time on the date you need, and
                      state what you want to discuss.
                    </p>
                  </div>
                  <Link className="service-open" to={appointmentPath}>
                    Book an appointment
                  </Link>
                </li>
              ) : null}

              <li className="service-row">
                <span className="service-number">{appointmentsEnabled ? '06' : '05'}</span>
                <div className="service-copy">
                  <h3>
                    <Link to="/status">Request status</Link>
                  </h3>
                  <p>
                    Read the latest remark on every request you have submitted and download an
                    approved Bonafide certificate.
                  </p>
                </div>
                <Link className="service-open" to="/status">
                  Open Request status
                </Link>
              </li>
            </ol>
          </div>
        </section>

        <section id="how-it-works" className="home-process home-section">
          <span id="features" className="anchor-target" aria-hidden="true"></span>
          <div className="container process-layout">
            <div className="process-intro">
              <h2>What happens after you submit</h2>
              <p>
                Every service follows the same path, so you know where to look for the next update.
              </p>
            </div>
            <ol className="process-steps">
              <li>
                <span className="step-number">1</span>
                <div>
                  <h3>You fill the form</h3>
                  <p>Choose the service and add the details your department reviews.</p>
                </div>
              </li>
              <li>
                <span className="step-number">2</span>
                <div>
                  <h3>The request is recorded</h3>
                  <p>
                    It appears in Request status with a request ID and the time you submitted it.
                  </p>
                </div>
              </li>
              <li>
                <span className="step-number">3</span>
                <div>
                  <h3>A decision is added</h3>
                  <p>
                    Open the request to read the remark. Approved Bonafide certificates can be
                    downloaded as a PDF.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="about" className="home-about home-section">
          <div className="container about-band">
            <div className="about-intro">
              <h2>A Bonafide certificate can be checked without calling the office.</h2>
            </div>
            <div className="about-copy">
              <p>
                When a Bonafide request is approved, the portal produces a PDF with a QR code.
                Anyone who scans it opens a public page that confirms the certificate number,
                student name, department and issue date.
              </p>
              <p>
                Leave, on-duty, complaints and appointments stay in the same account, so you do not
                need a different login or a separate form for each service.
              </p>
              <Link className="text-link" to="/bonafide">
                Request a Bonafide certificate
              </Link>
            </div>
          </div>
        </section>

        <section id="demo" className="home-demo home-section">
          <div className="container">
            <div className="section-head section-head-compact">
              <h2>Look around with a demo account</h2>
              <p>
                Demo data is separate from real student records. You can sign in as a student,
                faculty member or admin.
              </p>
            </div>
            <DemoLogin roleFilter="all" />
          </div>
        </section>
      </main>

      <footer id="contact" className="home-footer">
        <div className="container footer-main">
          <div className="footer-identity">
            <a className="site-brand footer-site-brand" href="#home">
              <span className="site-brand-mark" aria-hidden="true">SS</span>
              <span className="site-brand-name">
                Smart Student <span>Service Portal</span>
              </span>
            </a>
            <p>Campus services for students, faculty and the office that reviews requests.</p>
          </div>
          <div className="footer-column">
            <h2>Explore</h2>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#how-it-works">How it works</a>
            <a href="#demo">Demo</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-column">
            <h2>Services</h2>
            <Link to="/leave">Leave application</Link>
            <Link to="/od">On-duty request</Link>
            <Link to="/bonafide">Bonafide certificate</Link>
            <Link to="/status">Request status</Link>
          </div>
          <div className="footer-column footer-contact">
            <h2>Contact</h2>
            <a href="mailto:studentportal@gmail.com">studentportal@gmail.com</a>
            <a href="tel:+919876543210">+91 9876543210</a>
            <Link to="/complaint">Student complaints</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>&copy; 2026 Smart Student Service Portal</span>
          <div>
            <Link to="/login">Student login</Link>
            <Link to="/register">Create account</Link>
            <Link to="/admin-login">Admin login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
