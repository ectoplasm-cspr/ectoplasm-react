import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ConnectWallet } from './ConnectWallet';

export function Header() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="site-header">
      <div className="container header-grid">
        <div className="logo-menu" ref={menuRef}>
          <button
            className="logo logo-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls="logoMenu"
          >
            <img src="/assets/electoplasmlogo.png" width="38" height="38" alt="Ectoplasm logo" />
            <span>Ectoplasm</span>
            <span className="chevron" aria-hidden="true">⌄</span>
          </button>

          <div className={`logo-menu-panel ${menuOpen ? '' : 'hidden'}`} id="logoMenu">
            <div className="menu-grid">
              <div className="menu-section">
                <div className="menu-heading">Products</div>
                <Link className="menu-item" to="/" onClick={() => setMenuOpen(false)}>
                  <div>
                    <strong>Swap</strong>
                    <p>Fast token swaps on Casper</p>
                  </div>
                  <span className="pill">Live</span>
                </Link>
                <Link className="menu-item" to="/launchpad" onClick={() => setMenuOpen(false)}>
                  <div>
                    <strong>Launch Pad</strong>
                    <p>Create and launch tokens</p>
                  </div>
                  <span className="pill">Beta</span>
                </Link>
                <Link className="menu-item" to="/liquidity" onClick={() => setMenuOpen(false)}>
                  <div>
                    <strong>Earn</strong>
                    <p>Provide liquidity and farm</p>
                  </div>
                  <span className="pill">Live</span>
                </Link>
                <Link className="menu-item" to="/dashboard" onClick={() => setMenuOpen(false)}>
                  <div>
                    <strong>Dashboard</strong>
                    <p>Track quests and positions</p>
                  </div>
                  <span className="pill">Gamified</span>
                </Link>
              </div>

              <div className="menu-section">
                <div className="menu-heading">Use for</div>
                <ul className="menu-list">
                  <li><Link to="/" onClick={() => setMenuOpen(false)}>Swap crypto</Link></li>
                  <li><Link to="/liquidity" onClick={() => setMenuOpen(false)}>Provide liquidity</Link></li>
                  <li><Link to="/launchpad" onClick={() => setMenuOpen(false)}>Launch tokens</Link></li>
                  <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Track positions</Link></li>
                </ul>
              </div>

              <div className="menu-section">
                <div className="menu-heading">Settings</div>
                <ul className="menu-list">
                  <li>
                    <button
                      className="btn ghost"
                      onClick={toggleTheme}
                      style={{ width: '100%', textAlign: 'left' }}
                    >
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="menu-metrics" aria-label="Swap status summary">
              <div className="menu-metrics-title">
                <span>Optimal routing</span>
                <span className="status-badge subtle">Live</span>
              </div>
              <div className="menu-metrics-grid">
                <div>
                  <span className="menu-metrics-label">Impact</span>
                  <strong>0.00%</strong>
                </div>
                <div>
                  <span className="menu-metrics-label">Fee</span>
                  <strong>0.25%</strong>
                </div>
                <div>
                  <span className="menu-metrics-label">Network</span>
                  <strong>Casper</strong>
                </div>
              </div>
            </div>

            <div className="menu-footer">
              <div>
                <div className="menu-heading">Get started</div>
                <p>Trade tokens, provide liquidity, and launch on the Casper Network with low fees and fast finality.</p>
              </div>
              <Link className="btn primary" to="/" onClick={() => setMenuOpen(false)}>
                Start trading
              </Link>
            </div>
          </div>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          <Link to="/" className={isActive('/') || isActive('/swap') ? 'active' : ''}>Swap</Link>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>Dashboard</Link>
          <Link to="/launchpad" className={isActive('/launchpad') ? 'active' : ''}>Launch Pad</Link>
          <Link to="/liquidity" className={isActive('/liquidity') ? 'active' : ''}>Earn</Link>
          <button
            className="btn ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}

export default Header;
