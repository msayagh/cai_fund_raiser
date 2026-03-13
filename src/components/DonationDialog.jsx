export default function DonationDialog({ isOpen, onClose, selectedTier }) {
    if (!isOpen) return null;

    return (
        <div className="donation-dialog-overlay" onClick={onClose}>
            <div className="donation-dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="donation-dialog-body">
                    <button
                        type="button"
                        aria-label="Close donation dialog"
                        className="donation-dialog-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                    <div className="donation-dialog-form-wrapper">
                        {selectedTier && (
                            <div className="donation-dialog-tier-info">
                                <h2>{selectedTier.label}</h2>
                                <p className="donation-dialog-amount">${selectedTier.amount}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
