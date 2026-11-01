import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DemoLogin from '../components/DemoLogin';
import DemoBanner from '../components/DemoBanner';

export default function Home() {
  const containerRef = useRef(null);

  useEffect(() => {
    document.body.className = 'home-page';

    // IntersectionObserver for reveal animation
    if ('IntersectionObserver' in window && containerRef.current) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      const revealElements = containerRef.current.querySelectorAll(
        '.home-section .container > *, .home-service-card, .feature-list article'
      );
      revealElements.forEach((el) => {
        el.classList.add('reveal');
        revealObserver.observe(el);
      });

      // Counter animation
      const countObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const counter = entry.target;
            const target = Number(counter.dataset.count);
            const startTime = performance.now();
            const duration = 850;

            const updateCount = (now) => {
              const progress = Math.min((now - startTime) / duration, 1);
              counter.textContent = String(Math.round(target * progress));
              if (progress < 1) {
                requestAnimationFrame(updateCount);
              }
            };

            requestAnimationFrame(updateCount);
            observer.unobserve(counter);
          });
        },
        { threshold: 0.6 }
      );

      const counters = containerRef.current.querySelectorAll('[data-count]');
      counters.forEach((c) => countObserver.observe(c));

      return () => {
        revealObserver.disconnect();
        countObserver.disconnect();
      };
    }

    return () => {
      document.body.className = '';
    };
  }, []);

  return (
    <div ref={containerRef}>
      <DemoBanner />
      <Navbar />

      <main>
        <section id="home" class="home-hero">
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <span className="home-eyebrow">
                <span></span> A clearer way to manage campus services
              </span>
              <h1>
                Your Campus Services,<br />
                <span>All in One Place.</span>
              </h1>
              <p>
                Submit college service requests online, keep the details together, and follow each request through its status from your student account.
              </p>
              <div className="home-hero-actions">
                <Link className="site-button site-button-primary" to="/register">
                  Get Started <span aria-hidden="true">&rarr;</span>
                </Link>
                <a className="site-button site-button-quiet" href="#services">
                  <span className="play-mark" aria-hidden="true">&#9658;</span> Explore Services
                </a>
              </div>
              <div className="hero-assurances" aria-label="Portal highlights">
                <span>
                  <i className="fas fa-layer-group" aria-hidden="true"></i> One student account
                </span>
                <span>
                  <i className="fas fa-route" aria-hidden="true"></i> A clear request trail
                </span>
              </div>
            </div>

            <div className="hero-visual" aria-label="Illustration of the student services portal">
              <div className="visual-orbit orbit-one"></div>
              <div className="visual-orbit orbit-two"></div>
              <div className="portal-preview">
                <div className="preview-topline">
                  <span className="preview-mark">SS</span>
                  <span>STUDENT SERVICES</span>
                  <span className="preview-dots" aria-hidden="true">&bull;&bull;&bull;</span>
                </div>
                <div className="preview-content">
                  <div className="preview-heading">
                    <div>
                      <span>REQUEST FLOW PREVIEW</span>
                      <h2>What can we help with?</h2>
                    </div>
                    <span className="live-chip">SAMPLE</span>
                  </div>
                  <div className="preview-service-list">
                    <Link to="/leave">
                      <span className="preview-icon icon-cyan">
                        <i className="fas fa-calendar-check" aria-hidden="true"></i>
                      </span>
                      <span>
                        <strong>Leave request</strong>
                        <small>Apply for academic leave</small>
                      </span>
                      <span className="preview-arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link to="/od">
                      <span className="preview-icon icon-blue">
                        <i className="fas fa-clipboard-list" aria-hidden="true"></i>
                      </span>
                      <span>
                        <strong>On-duty request</strong>
                        <small>Submit an OD application</small>
                      </span>
                      <span className="preview-arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link to="/bonafide">
                      <span className="preview-icon icon-gold">
                        <i className="fas fa-file-lines" aria-hidden="true"></i>
                      </span>
                      <span>
                        <strong>Bonafide certificate</strong>
                        <small>Request an official document</small>
                      </span>
                      <span className="preview-arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                  <div className="preview-foot">
                    <span className="preview-check">
                      <i className="fas fa-check" aria-hidden="true"></i>
                    </span>
                    <span>
                      <strong>Follow each request through its stages</strong>
                      <small>
                        Submitted <span className="flow-separator">/</span> In review <span className="flow-separator">/</span> Decision
                      </small>
                    </span>
                    <Link to="/status" aria-label="Explore request tracking">&rarr;</Link>
                  </div>
                </div>
              </div>
              <span className="visual-caption">
                <span></span> A connected student experience
              </span>
            </div>
          </div>

          <div className="container hero-metrics" aria-label="Portal overview">
            <div>
              <strong data-count="4">4</strong>
              <span>request categories</span>
            </div>
            <div>
              <strong data-count="3">3</strong>
              <span>steps to follow a request</span>
            </div>
            <p>One student portal, from submission to status.</p>
          </div>
        </section>

        {/* Guided Demo Access on Home */}
        <section className="container" style={{ margin: '30px auto' }}>
          <DemoLogin roleFilter="all" />
        </section>

        <section id="about" className="home-about home-section">
          <div className="container about-band">
            <div className="section-kicker">ABOUT THE PORTAL</div>
            <div className="about-description">
              <h2>
                Less paperwork.<br />
                <span>More room to focus.</span>
              </h2>
              <p>
                Bring everyday student services into one straightforward digital workflow. Submit a request, find it again when you need it, and see its current status without chasing forms across campus.
              </p>
            </div>
            <a className="text-link" href="#how-it-works">
              See how it works <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </section>

        <section id="services" className="home-services home-section">
          <div className="container">
            <div className="section-intro">
              <div>
                <div className="section-kicker">STUDENT SERVICES</div>
                <h2>
                  Campus essentials,<br />
                  <span>made easier to access.</span>
                </h2>
              </div>
              <p>Choose a service to get started. Sign in to submit requests and see your updates.</p>
            </div>
            <div className="home-service-grid">
              <article className="home-service-card">
                <span className="service-symbol symbol-cyan">
                  <i className="fas fa-calendar-check" aria-hidden="true"></i>
                </span>
                <span className="service-index">01 / ATTENDANCE</span>
                <h3>Leave Request</h3>
                <p>Submit the details of an academic leave request online.</p>
                <Link to="/leave">
                  Open service <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
              <article className="home-service-card">
                <span className="service-symbol symbol-blue">
                  <i className="fas fa-clipboard-list" aria-hidden="true"></i>
                </span>
                <span className="service-index">02 / ACTIVITIES</span>
                <h3>On-Duty Request</h3>
                <p>Record an on-duty request for an official event or activity.</p>
                <Link to="/od">
                  Open service <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
              <article className="home-service-card">
                <span className="service-symbol symbol-gold">
                  <i className="fas fa-file-lines" aria-hidden="true"></i>
                </span>
                <span className="service-index">03 / DOCUMENTS</span>
                <h3>Bonafide Certificate</h3>
                <p>Request a bonafide certificate for your documentation needs.</p>
                <Link to="/bonafide">
                  Open service <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
              <article className="home-service-card">
                <span className="service-symbol symbol-coral">
                  <i className="fas fa-comment-dots" aria-hidden="true"></i>
                </span>
                <span className="service-index">04 / STUDENT VOICE</span>
                <h3>Student Complaints</h3>
                <p>Share a concern with the team responsible for reviewing it.</p>
                <Link to="/complaint">
                  Open service <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
              <article className="home-service-card service-card-wide">
                <span className="service-symbol symbol-navy">
                  <i className="fas fa-arrow-trend-up" aria-hidden="true"></i>
                </span>
                <span className="service-index">05 / VISIBILITY</span>
                <h3>Request Status Tracking</h3>
                <p>Review submitted requests and follow their current status from your student account.</p>
                <Link to="/status">
                  Track a request <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="home-process home-section">
          <div className="container process-layout">
            <div className="process-intro">
              <div className="section-kicker">HOW IT WORKS</div>
              <h2>
                Three steps.<br />
                <span>One less thing to chase.</span>
              </h2>
              <p>Use your student account to start and follow a service request.</p>
            </div>
            <ol className="process-steps">
              <li>
                <span className="step-number">01</span>
                <div>
                  <h3>Sign in to your account</h3>
                  <p>Register or log in with your student details.</p>
                </div>
                <span className="step-line" aria-hidden="true"></span>
              </li>
              <li>
                <span className="step-number">02</span>
                <div>
                  <h3>Submit a service request</h3>
                  <p>Choose the relevant service and provide its details.</p>
                </div>
                <span className="step-line" aria-hidden="true"></span>
              </li>
              <li>
                <span className="step-number">03</span>
                <div>
                  <h3>Track its status</h3>
                  <p>Return to your requests to see the latest recorded status.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="features" className="home-features home-section">
          <div className="container">
            <div className="section-intro feature-intro">
              <div>
                <div className="section-kicker">A BETTER SERVICE WORKFLOW</div>
                <h2>
                  Designed around<br />
                  <span>the student experience.</span>
                </h2>
              </div>
              <p>One place to submit common requests and stay oriented as they move through review.</p>
            </div>
            <div className="feature-list">
              <article>
                <span className="feature-icon">
                  <i className="fas fa-pen-to-square" aria-hidden="true"></i>
                </span>
                <div>
                  <h3>Easy request submission</h3>
                  <p>Dedicated forms keep each service request clear and organized.</p>
                </div>
              </article>
              <article>
                <span className="feature-icon">
                  <i className="fas fa-list-check" aria-hidden="true"></i>
                </span>
                <div>
                  <h3>Visible request status</h3>
                  <p>Check the current recorded status of your submitted requests.</p>
                </div>
              </article>
              <article>
                <span className="feature-icon">
                  <i className="fas fa-id-card" aria-hidden="true"></i>
                </span>
                <div>
                  <h3>Student account access</h3>
                  <p>Register and sign in to use student services and request tracking.</p>
                </div>
              </article>
              <article>
                <span className="feature-icon">
                  <i className="fas fa-folder-tree" aria-hidden="true"></i>
                </span>
                <div>
                  <h3>Centralized services</h3>
                  <p>Find leave, OD, certificate, complaint, and tracking workflows together.</p>
                </div>
              </article>
            </div>
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
            <p>Campus services, brought into one place.</p>
          </div>
          <div className="footer-column">
            <h2>Explore</h2>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-column">
            <h2>Services</h2>
            <Link to="/leave">Leave request</Link>
            <Link to="/od">On-duty request</Link>
            <Link to="/bonafide">Bonafide certificate</Link>
            <Link to="/status">Request tracking</Link>
          </div>
          <div className="footer-column footer-contact">
            <h2>Contact</h2>
            <a href="mailto:studentportal@gmail.com">
              <i className="fas fa-envelope" aria-hidden="true"></i> studentportal@gmail.com
            </a>
            <a href="tel:+919876543210">
              <i className="fas fa-phone" aria-hidden="true"></i> +91 9876543210
            </a>
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
