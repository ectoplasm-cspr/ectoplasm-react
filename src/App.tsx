import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, WalletProvider } from './contexts';
import { Header, Footer } from './components/common';
import { Home, Liquidity, Launchpad, Dashboard, Privacy } from './pages';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="app-wrapper">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/swap" element={<Home />} />
              <Route path="/liquidity" element={<Liquidity />} />
              <Route path="/launchpad" element={<Launchpad />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/privacy" element={<Privacy />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
