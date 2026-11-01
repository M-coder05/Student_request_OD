import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <div>
      <Navbar />
      <main className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
          <h1 style={{ fontSize: '3.5rem', color: 'var(--navy-950)', marginBottom: '10px' }}>404</h1>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--navy-900)', marginBottom: '16px' }}>Page Not Found</h2>
          <p className="muted" style={{ marginBottom: '24px' }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
