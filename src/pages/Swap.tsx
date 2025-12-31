import { useEffect } from 'react';
import { SwapCard } from '../components/swap';

export function Swap() {
  // Add swap-page class to body for page-specific styling
  useEffect(() => {
    document.body.classList.add('swap-page');
    return () => {
      document.body.classList.remove('swap-page');
    };
  }, []);

  return (
    <main>
      <section className="hero swap-hero" id="swap">
        <div className="container swap-layout">
          <div className="swap-heading">
            {/* Empty heading for swap page - matches original */}
          </div>

          <SwapCard />

          <div className="hero-copy swap-copy active">
            {/* Empty copy section for swap page - matches original */}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Swap;
