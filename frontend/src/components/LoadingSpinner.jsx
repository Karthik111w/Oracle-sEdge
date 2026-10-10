import React from 'react';

// Skeleton placeholder shaped like a page of cards, with a short status line.
const LoadingSpinner = ({ text = 'Loading' }) => (
  <div className="loading-block" role="status" aria-live="polite">
    <p className="loading-text">{text}</p>
    <div className="loading-grid" aria-hidden="true">
      <span className="skel" />
      <span className="skel" />
      <span className="skel" />
    </div>
  </div>
);

export default LoadingSpinner;
