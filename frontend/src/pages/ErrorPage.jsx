import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const ErrorPage = ({ title = 'Something went wrong', message = 'We could not load the requested page.', linkText = 'Return home' }) => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '700px', width: '100%', padding: '3rem', textAlign: 'center', borderTop: '4px solid var(--color-danger)' }}>
        <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ margin: '0 0 1rem 0' }}>{title}</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', whiteSpace: 'pre-line' }}>{message}</p>
        <Link to="/" className="btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{linkText}</Link>
      </div>
    </div>
  );
};

export default ErrorPage;
