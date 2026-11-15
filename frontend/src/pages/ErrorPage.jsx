import React from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import '../styles/shell.css';
import '../styles/shell-fx.css';

const ErrorPage = ({ title = 'Something went wrong', message = 'We could not load the requested page.', linkText = 'Back to home' }) => (
  <div className="page sh-err">
    <div className="sh-err-rings" aria-hidden="true">
      <span className="sh-err-ring sh-err-ring--1" />
      <span className="sh-err-ring sh-err-ring--2" />
      <span className="sh-err-ring sh-err-ring--3" />
    </div>
    <div className="empty-state sh-err-copy">
      <p className="eyebrow">404 &middot; {title}</p>
      <h1 className="display sh-err-title">Out of <em>focus</em></h1>
      <p className="page-sub">{message}</p>
      <div className="error-search">
        <SearchBar placeholder="Try KO, AAPL or BRK-B" />
      </div>
      <div className="sh-error-links">
        <Link to="/" className="back-link">{linkText}</Link>
        <Link to="/screener" className="back-link">Open the screener</Link>
      </div>
    </div>
  </div>
);

export default ErrorPage;
