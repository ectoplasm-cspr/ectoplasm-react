import { SwapCard } from '../components/swap';

export function Swap() {
  return (
    <main>
      <section className="hero swap-hero" id="swap">
        {/* Liquid blob animations */}
        <div className="liquid-container">
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
        </div>

        <div className="container swap-layout">
          <div className="swap-heading">
            <h1>Swapping when & wherever you want to.</h1>
          </div>

          <SwapCard />

          <div className="hero-copy swap-copy">
            <p className="lead">
              A focused swap card sits front and center. Connect your wallet, set slippage,
              and move between CSPR and ECTO with clear routing and instant feedback.
            </p>
            <ul className="trust-list">
              <li><strong id="priceTicker">CSPR $--.--</strong> live price</li>
              <li>Casper mainnet routing</li>
              <li>Wallet status shown inline</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Swap;
