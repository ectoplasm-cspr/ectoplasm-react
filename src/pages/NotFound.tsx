import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="not-found-code">404</div>
          <h1>Page Not Found</h1>
          <p className="lead muted">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="btn primary large">
              Go Home
            </Link>
            <Link to="/swap" className="btn ghost large">
              Start Trading
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
