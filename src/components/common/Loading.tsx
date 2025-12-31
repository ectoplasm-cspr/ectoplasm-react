import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Loading({ message = 'Loading...', size = 'medium' }: LoadingProps) {
  const sizeClass = `loading-${size}`;

  return (
    <div className={`loading-container ${sizeClass}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <main className="page-loader">
      <Loading size="large" message="Loading page..." />
    </main>
  );
}

export function CardLoader() {
  return (
    <div className="card-loader pump-card">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  );
}

export default Loading;
