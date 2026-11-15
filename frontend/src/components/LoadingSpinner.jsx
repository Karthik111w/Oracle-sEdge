import React from 'react';
import '../styles/shell-fx.css';

// Lens-ring mark, status line and skeleton placeholder shaped like a page of cards, with a short status line.
const LoadingSpinner = ({ text = 'Loading' }) => (
  <div className="loading-block" role="status" aria-live="polite">
    <svg className="sh-lens" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <circle className="sh-lens-ring sh-lens-ring--1" cx="24" cy="24" r="20" />
      <circle className="sh-lens-ring sh-lens-ring--2" cx="24" cy="24" r="13" />
      <circle className="sh-lens-ring sh-lens-ring--3" cx="24" cy="24" r="6" />
    </svg>
    <p className="loading-text">{text}</p>
    <div className="loading-grid" aria-hidden="true">
      <span className="skel" />
      <span className="skel" />
      <span className="skel" />
    </div>
  </div>
);

export default LoadingSpinner;
