import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const mobileDetailsRef = useRef(null);

  const closeMobileMenu = () => {
    if (mobileDetailsRef.current) {
      mobileDetailsRef.current.removeAttribute('open');
    }
  };

  const isHomePage = location.pathname === '/';

  return (
    <header className="site-header">
      <div className="container site-nav-wrap">
        <Link
          className="site-brand"
          to="/"
          aria-label="Smart Student Service Portal home"
          onClick={closeMobileMenu}
        >
          <span className="site-brand-mark" aria-hidden="true">SS</span>
          <span className="site-brand-name">
            Smart Student <span>Service Portal</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {isHomePage ? (
            <>
              <a href="#home">Home</a>
              <a href="#about">About</a>
              <a href="#services">Services</a>
              <a href="#features">Features</a>
              <a href="#contact">Contact</a>
            </>
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/login">Student Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/admin-login">Admin Login</Link>
            </>
          )}
        </nav>

        <div className="site-nav-actions">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link
                className="site-button site-button-primary"
                to={isAdmin ? '/admin' : '/dashboard'}
              >
                {isAdmin ? 'Admin Panel' : 'Dashboard'}
              </Link>
            </>
          ) : (
            <>
              <Link
                className="site-button site-button-quiet site-login"
                to="/login"
              >
                Sign in
              </Link>
              <Link
                className="site-button site-button-primary site-register"
                to="/register"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <details
          ref={mobileDetailsRef}
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          <summary aria-label="Toggle navigation links"></summary>
          <div className="mobile-menu-panel">
            {isHomePage ? (
              <>
                <a href="#home" onClick={closeMobileMenu}>Home</a>
                <a href="#about" onClick={closeMobileMenu}>About</a>
                <a href="#services" onClick={closeMobileMenu}>Services</a>
                <a href="#features" onClick={closeMobileMenu}>Features</a>
                <a href="#contact" onClick={closeMobileMenu}>Contact</a>
              </>
            ) : (
              <>
                <Link to="/" onClick={closeMobileMenu}>Home</Link>
                <Link to="/login" onClick={closeMobileMenu}>Student Login</Link>
                <Link to="/register" onClick={closeMobileMenu}>Register</Link>
                <Link to="/admin-login" onClick={closeMobileMenu}>Admin Login</Link>
              </>
            )}
            <hr />
            {isAuthenticated ? (
              <Link
                to={isAdmin ? '/admin' : '/dashboard'}
                onClick={closeMobileMenu}
              >
                {isAdmin ? 'Admin Panel' : 'Dashboard'}
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={closeMobileMenu}>Sign in</Link>
                <Link to="/register" onClick={closeMobileMenu}>Get started</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
