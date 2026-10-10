import React from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';

const ErrorPage = ({ title = 'Something went wrong', message = 'We could not load the requested page.', linkText = 'Back to home' }) => (
  <div className="page">
    <div className="empty-state">
      <p className="mono muted">404</p>
      <h1>{title}</h1>
      <p className="page-sub">{message}</p>
      <div className="error-search">
        <SearchBar placeholder="Try KO, AAPL or BRK-B" />
      </div>
      <Link to="/" className="back-link">{linkText}</Link>
    </div>
  </div>
);

export default ErrorPage;
