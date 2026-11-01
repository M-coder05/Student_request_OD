import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Navbar from '../components/Navbar';

export default function VerifyCertificate() {
  const { code } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest(`/verify/${encodeURIComponent(code)}`)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to verify certificate');
      });

    return () => {
      active = false;
    };
  }, [code]);

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <div className="container">
          <section className="card" style={{ maxWidth: '680px', margin: '30px auto', padding: '28px' }}>
            {error ? (
              <h1 style={{ color: 'var(--danger)' }}>Unable to verify certificate</h1>
            ) : !result ? (
              <p>Verifying certificate…</p>
            ) : result.valid ? (
              <>
                <h1 style={{ color: 'var(--success)' }}>Valid certificate</h1>
                <p><strong>Certificate number:</strong> {result.certificateNumber}</p>
                <p><strong>Student:</strong> {result.studentName}</p>
                <p><strong>Department:</strong> {result.department}</p>
                <p><strong>Purpose:</strong> {result.purpose}</p>
                <p><strong>Issue date:</strong> {result.issueDate ? new Date(result.issueDate).toLocaleDateString() : '--'}</p>
              </>
            ) : (
              <h1 style={{ color: 'var(--danger)' }}>
                {result.revoked ? 'Invalid or revoked certificate' : 'Invalid certificate'}
              </h1>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
