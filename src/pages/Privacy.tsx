import React from 'react';

export function Privacy() {
  return (
    <main className="section">
      <div className="container">
        <h1>Privacy Policy</h1>
        <div className="pump-card">
          <h2>Data Collection</h2>
          <p>
            Ectoplasm is a decentralized application that operates primarily on the Casper blockchain.
            We do not collect, store, or process any personal information beyond what is publicly
            available on the blockchain.
          </p>

          <h2>Wallet Connections</h2>
          <p>
            When you connect your wallet to Ectoplasm, we only access your public key and account hash
            to facilitate transactions. No private keys or sensitive wallet data are ever accessed or stored.
          </p>

          <h2>Blockchain Transactions</h2>
          <p>
            All transactions you make through Ectoplasm are recorded on the Casper blockchain and are
            publicly visible. This is inherent to blockchain technology and not unique to our platform.
          </p>

          <h2>Local Storage</h2>
          <p>
            We use browser local storage to remember your theme preferences and dashboard progress.
            This data stays on your device and is not transmitted to any servers.
          </p>

          <h2>Contact</h2>
          <p>
            For any privacy-related questions, please reach out through our official channels.
          </p>
        </div>
      </div>
    </main>
  );
}

export default Privacy;
