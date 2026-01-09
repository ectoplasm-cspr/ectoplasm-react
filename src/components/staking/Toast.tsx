import { useEffect } from 'react';
import './toast.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  deployHash?: string;
  onClose: () => void;
}

export function Toast({ message, type = 'info', deployHash, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000); // Auto-close after 8 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const explorerUrl = deployHash ? `https://testnet.cspr.live/deploy/${deployHash}` : null;

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'info' && 'ℹ️'}
        </div>
        <div className="toast-message">
          <div className="toast-text">{message}</div>
          {explorerUrl && (
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="toast-link"
            >
              View on Explorer →
            </a>
          )}
        </div>
        <button className="toast-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
