import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, WalletProvider, DexProvider, ToastProvider } from './contexts';
import { Header, Footer, ErrorBoundary, PageLoader, ScrollToTop } from './components/common';
import './index.css';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Swap = lazy(() => import('./pages/Swap'));
const Liquidity = lazy(() => import('./pages/Liquidity'));
const Launchpad = lazy(() => import('./pages/Launchpad'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Faucet = lazy(() => import('./pages/Faucet'));
const Wallet = lazy(() => import('./pages/Wallet'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DexProvider>
          <ToastProvider>
            <WalletProvider>
              <BrowserRouter>
                <ScrollToTop />
                <div className="app-wrapper">
                  <Header />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/swap" element={<Swap />} />
                        <Route path="/liquidity" element={<Liquidity />} />
                        <Route path="/launchpad" element={<Launchpad />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/faucet" element={<Faucet />} />
                        <Route path="/wallet" element={<Wallet />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  <Footer />
                </div>
              </BrowserRouter>
            </WalletProvider>
          </ToastProvider>
        </DexProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
