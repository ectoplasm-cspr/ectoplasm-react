import React from 'react';
import { useLaunchpad } from '../../hooks/useLaunchpad';
import { useWallet } from '../../contexts/WalletContext';
import { Modal } from '../common/Modal';

interface TokenCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TokenCreationForm({ isOpen, onClose }: TokenCreationFormProps) {
  const { connected, connect } = useWallet();
  const {
    formData,
    setFormData,
    createToken,
    isCreating,
    createError,
    resetForm,
  } = useLaunchpad();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      await connect();
      return;
    }

    const hash = await createToken();
    if (hash) {
      alert(`Token launch initiated! Deploy hash: ${hash}`);
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatBudget = (value: number) => {
    return value.toLocaleString() + ' CSPR';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Launch configuration">
      <form className="launch-form" onSubmit={handleSubmit}>
        {/* Project Name */}
        <div className="form-field">
          <label htmlFor="projectName">Project name</label>
          <input
            id="projectName"
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ projectName: e.target.value })}
            placeholder="Ghost Cats"
            required
            maxLength={50}
          />
        </div>

        {/* Token Symbol */}
        <div className="form-field">
          <label htmlFor="symbol">Token symbol</label>
          <input
            id="symbol"
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ symbol: e.target.value.toUpperCase() })}
            placeholder="GHOST"
            required
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
          <span className="form-hint">{formData.symbol.length}/6 characters</span>
        </div>

        {/* Two Column Grid */}
        <div className="form-grid">
          {/* Bonding Curve */}
          <div className="form-field">
            <label htmlFor="bondingCurve">Bonding curve</label>
            <select
              id="bondingCurve"
              value={formData.bondingCurve}
              onChange={(e) => setFormData({ bondingCurve: e.target.value as any })}
            >
              <option value="linear">Linear — slow ramp</option>
              <option value="sigmoid">Sigmoid — crowd-friendly</option>
              <option value="steep">Steep — degen mode</option>
            </select>
          </div>

          {/* Hype Budget */}
          <div className="form-field">
            <label htmlFor="promoBudget">Hype budget (promo)</label>
            <div className="range-field">
              <input
                id="promoBudget"
                type="range"
                min="0"
                max="5000"
                step="100"
                value={formData.promoBudget}
                onChange={(e) => setFormData({ promoBudget: parseInt(e.target.value) })}
              />
              <span className="range-value">{formatBudget(formData.promoBudget)}</span>
            </div>
          </div>
        </div>

        {/* Optional: Description */}
        <div className="form-field">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ description: e.target.value })}
            placeholder="Tell the community about your project..."
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Optional: Links */}
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="website">Website (optional)</label>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ website: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="form-field">
            <label htmlFor="twitter">Twitter (optional)</label>
            <input
              id="twitter"
              type="text"
              value={formData.twitter}
              onChange={(e) => setFormData({ twitter: e.target.value })}
              placeholder="@handle"
            />
          </div>
        </div>

        {/* Error Display */}
        {createError && (
          <div className="form-error">
            {createError}
          </div>
        )}

        {/* Footer */}
        <div className="launch-form-footer">
          <small className="muted">
            Demo only — deploys to Casper testnet with pump.fun inspired presets.
          </small>
          <button
            type="submit"
            className="btn primary full"
            disabled={connected && isCreating}
          >
            {!connected
              ? 'Connect Wallet'
              : isCreating
              ? 'Launching...'
              : 'Start launch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TokenCreationForm;
