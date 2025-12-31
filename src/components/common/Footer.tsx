import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="logo" to="/">
            <img src="/assets/electoplasmlogo.png" width="38" height="38" alt="Ectoplasm logo" />
            <span>Ectoplasm</span>
          </Link>
          <p className="muted">
            Built on Casper Network · Open source · © {currentYear} EcosystemNetwork
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/docs">Docs</a>
          <a href="/whitepaper.pdf">Whitepaper</a>
          <a href="/audit-report.pdf">Audit</a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
