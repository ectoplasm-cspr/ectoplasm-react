import React, { useState } from 'react';
import { useLaunchpad } from '../../hooks/useLaunchpad';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';

interface TokenCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenCreated?: () => Promise<void>; // Callback to refresh parent's token list
}

export function TokenCreationForm({ isOpen, onClose, onTokenCreated }: TokenCreationFormProps) {
  const { connected, connect } = useWallet();
  const { showToast } = useToast();
  const {
    formData,
    setFormData,
    createToken,
    isCreating,
    createError,
    resetForm,
    isContractsDeployed,
  } = useLaunchpad();

  // Toggle for showing advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      await connect();
      return;
    }

    const hash = await createToken();
    if (hash) {
      showToast('success', `Token launch initiated!`, hash);
      // Refresh parent's token list before closing
      if (onTokenCreated) {
        await onTokenCreated();
      }
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Launch configuration" className="launch-modal">
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
          <div className="label-row">
            <label htmlFor="symbol">Token symbol</label>
            <span className="char-count">{formData.symbol.length}/6</span>
          </div>
          <input
            id="symbol"
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ symbol: e.target.value.toUpperCase() })}
            placeholder="GHOST"
            required
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
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

        {/* Optional Section */}
        <p className="form-section-label">Optional details</p>

        {/* Optional: Description */}
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ description: e.target.value })}
            placeholder="Tell the community about your project..."
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Links */}
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="website">Website</label>
            <div className="input-with-icon">
              <span className="input-icon">🌐</span>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ website: e.target.value })}
                placeholder="https://yourproject.com"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="twitter">Twitter / X</label>
            <div className="input-with-icon">
              <span className="input-icon">𝕏</span>
              <input
                id="twitter"
                type="text"
                value={formData.twitter}
                onChange={(e) => setFormData({ twitter: e.target.value })}
                placeholder="yourhandle"
              />
            </div>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="advanced-toggle">
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="toggle-icon">{showAdvanced ? '−' : '+'}</span>
            {showAdvanced ? 'Hide advanced options' : 'Advanced options'}
          </button>
        </div>

        {/* Advanced Options (Collapsible) */}
        {showAdvanced && (
          <div className="advanced-options">
            <h4>Advanced Configuration</h4>
            <p className="form-hint muted">
              Override platform defaults. Leave blank to use recommended settings.
            </p>

            <div className="form-grid">
              {/* Graduation Threshold */}
              <div className="form-field">
                <label htmlFor="graduationThreshold">
                  Graduation Threshold (CSPR)
                </label>
                <input
                  id="graduationThreshold"
                  type="number"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={formData.graduationThreshold || ''}
                  onChange={(e) => setFormData({
                    graduationThreshold: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="50000 (default)"
                />
                <span className="form-hint">
                  CSPR needed to graduate to DEX
                </span>
              </div>

              {/* Creator Fee */}
              <div className="form-field">
                <label htmlFor="creatorFeeBps">
                  Creator Fee (basis points)
                </label>
                <input
                  id="creatorFeeBps"
                  type="number"
                  min="0"
                  max="500"
                  step="10"
                  value={formData.creatorFeeBps || ''}
                  onChange={(e) => setFormData({
                    creatorFeeBps: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="0 (default)"
                />
                <span className="form-hint">
                  100 = 1%, max 5%
                </span>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="deadlineDays">
                Deadline (days)
              </label>
              <input
                id="deadlineDays"
                type="number"
                min="7"
                max="90"
                step="1"
                value={formData.deadlineDays || ''}
                onChange={(e) => setFormData({
                  deadlineDays: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="30 (default)"
              />
              <span className="form-hint">
                Days until refunds are enabled if not graduated (7-90 days)
              </span>
            </div>
          </div>
        )}

        {/* Contract Status Notice */}
        {!isContractsDeployed && (
          <div className="form-notice">
            <strong>Demo Mode:</strong> Launchpad contracts not yet deployed.
            Token creation will be simulated.
          </div>
        )}

        {/* Error Display */}
        {createError && (
          <div className="form-error">
            {createError}
          </div>
        )}

        {/* Footer */}
        <div className="launch-form-footer">
          <small className="muted">
            {isContractsDeployed
              ? 'Deploys to Casper testnet with pump.fun inspired presets.'
              : 'Demo only — contracts not deployed yet.'}
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
