import React, { useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-container ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content pump-card">
          {title && (
            <div className="modal-header">
              <h2>{title}</h2>
              <button
                className="icon-btn modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          )}
          {!title && (
            <button
              className="icon-btn modal-close"
              onClick={onClose}
              aria-label="Close modal"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              ✕
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;
