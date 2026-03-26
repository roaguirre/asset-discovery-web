import type { FormEvent } from "react";
import type { RunFormState } from "../../core/runForm";

type CreateRunModalProps = {
  open: boolean;
  formState: RunFormState;
  modalMessage: string;
  busyAction: string;
  showOptionalSeedFields: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCompanyNameChange: (value: string) => void;
  onDomainsChange: (value: string) => void;
  onModeChange: (checked: boolean) => void;
  onIndustryChange: (value: string) => void;
  onAddressChange: (value: string) => void;
};

/**
 * CreateRunModal encapsulates the new-run workflow so the parent shell only
 * manages intent-level state and callbacks.
 */
export function CreateRunModal({
  open,
  formState,
  modalMessage,
  busyAction,
  showOptionalSeedFields,
  onClose,
  onSubmit,
  onCompanyNameChange,
  onDomainsChange,
  onModeChange,
  onIndustryChange,
  onAddressChange,
}: CreateRunModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-run-title"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New Run</p>
            <h2 id="new-run-title">Plant seeds</h2>
            <p className="panel-copy">
              Use a compact seed set, then let the workspace take over.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button compact"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form className="create-form" onSubmit={onSubmit}>
          <label>
            Company
            <input
              value={formState.companyName}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              placeholder="Example Holdings"
            />
          </label>
          <label>
            Domains
            <textarea
              rows={3}
              value={formState.domains}
              onChange={(event) => onDomainsChange(event.target.value)}
              placeholder="example.com, api.example.com"
            />
          </label>
          <div className="mode-switch-field">
            <span className="mode-switch-label">Mode</span>
            <label className="mode-switch">
              <input
                type="checkbox"
                role="switch"
                aria-label="✨ AI mode"
                checked={formState.mode === "autonomous"}
                onChange={(event) => onModeChange(event.target.checked)}
              />
              <span className="mode-switch-copy">
                <strong>✨ AI mode</strong>
                <span>
                  {formState.mode === "autonomous"
                    ? "Fully autonomous"
                    : "Human-in-the-loop"}
                </span>
              </span>
              <span className="mode-switch-track" aria-hidden="true">
                <span className="mode-switch-thumb" />
              </span>
            </label>
          </div>
          {showOptionalSeedFields ? (
            <div className="form-row">
              <label>
                Industry
                <input
                  value={formState.industry}
                  onChange={(event) => onIndustryChange(event.target.value)}
                  placeholder="Retail"
                />
              </label>
              <label>
                Address
                <input
                  value={formState.address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  placeholder="San Francisco, CA"
                />
              </label>
            </div>
          ) : null}
          {modalMessage ? (
            <p className="status-line status-error">{modalMessage}</p>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="hero-button"
              disabled={busyAction === "create-run"}
            >
              {busyAction === "create-run" ? "Submitting..." : "Launch Run"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
