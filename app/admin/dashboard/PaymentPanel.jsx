import { downloadPaymentConfirmation } from '@/lib/adminApi.js';
import { useState } from 'react';

export default function PaymentPanel({ donor, payments, onAddPayment, onUpdatePayment, onDeletePayment, loading, t }) {
    const [paymentDateError, setPaymentDateError] = useState('');
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [editForm, setEditForm] = useState({ amount: '', date: '', method: '', note: '' });

    if (!donor) return null;

    const handlePaymentDateChange = (e) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            setPaymentDateError(t('admin.dateCannotBeFuture') || 'Payment date cannot be in the future');
            e.target.value = '';
        } else {
            setPaymentDateError('');
        }
    };

    const beginEdit = (payment) => {
        setEditingPaymentId(payment.id);
        setEditForm({
            amount: String(payment.amount ?? ''),
            date: String(payment.date || '').slice(0, 10),
            method: payment.method || '',
            note: payment.note || '',
        });
    };

    const cancelEdit = () => {
        setEditingPaymentId(null);
        setEditForm({ amount: '', date: '', method: '', note: '' });
    };

    const saveEdit = async (paymentId) => {
        if (!editForm.amount || !editForm.date || !editForm.method) {
            alert('Amount, method, and date are required.');
            return;
        }

        try {
            await onUpdatePayment(paymentId, {
                amount: Number(editForm.amount),
                date: editForm.date,
                method: editForm.method,
                note: editForm.note || '',
            });
            cancelEdit();
        } catch (err) {
            alert(err?.message || 'Unable to update payment.');
        }
    };

    const handleRemovePayment = async (paymentId) => {
        try {
            await onDeletePayment(paymentId);
        } catch (err) {
            alert(err?.message || 'Unable to remove payment.');
        }
    };

    const pledge = Number(donor.engagement?.totalPledge || 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = Math.max(0, pledge - totalPaid);
    const status = totalPaid === 0 ? 'Pending' : totalPaid >= pledge ? 'Completed' : 'In Progress';

    const handleDownloadConfirmation = async (payment) => {
        try {
            const blob = await downloadPaymentConfirmation(donor.id, payment.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payment-Confirmation-${payment.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            const errorMsg = err?.message || 'Unknown error occurred while downloading payment confirmation';
            alert(`Failed to download payment confirmation: ${errorMsg}`);
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-section-title">
                Payment History
            </div>

            <div className="admin-grid admin-grid--4cols mb-lg">
                <div className="admin-surface">
                    <div className="admin-muted admin-muted--sm">Pledged</div>
                    <div className="admin-value-md">${pledge.toLocaleString()}</div>
                </div>
                <div className="admin-surface">
                    <div className="admin-muted admin-muted--sm">Paid</div>
                    <div className="admin-value-md">${totalPaid.toLocaleString()}</div>
                </div>
                <div className="admin-surface">
                    <div className="admin-muted admin-muted--sm">Remaining</div>
                    <div className="admin-value-md">${remaining.toLocaleString()}</div>
                </div>
                <div className="admin-surface">
                    <div className="admin-muted admin-muted--sm">Status</div>
                    <div
                        className="admin-value-md"
                        style={{ color: status === 'Completed' ? '#7EB8A0' : status === 'In Progress' ? '#D4A96E' : '#7c8499' }}
                    >
                        {status}
                    </div>
                </div>
            </div>

            <div className="admin-surface mb-lg">
                <div className="admin-section-title admin-section-title--sm">
                    Record Payment
                </div>
                <form onSubmit={onAddPayment} className="admin-stack">
                    <div className="admin-grid admin-grid--2cols">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="admin-input"
                            placeholder="Amount"
                            required
                            id="payment-amount"
                        />
                        <select className="admin-input" id="payment-method" required>
                            <option value="">— Select method —</option>
                            <option value="cash">💵 Cash</option>
                            <option value="card">💳 Card</option>
                            <option value="zeffy">📱 Zeffy</option>
                        </select>
                    </div>
                    <div>
                        <input
                            type="date"
                            className="admin-input"
                            style={{ borderColor: paymentDateError ? '#ff6b6b' : undefined }}
                            id="payment-date"
                            required
                            onChange={handlePaymentDateChange}
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {paymentDateError && (
                            <div className="admin-field-help" style={{ color: '#ff6b6b' }}>
                                {paymentDateError}
                            </div>
                        )}
                    </div>
                    <textarea
                        className="admin-input admin-input--textarea-lg"
                        placeholder="Payment note (optional)"
                        id="payment-note"
                    />
                    <div className="admin-stack">
                        <label className={`admin-upload-label${loading ? ' is-disabled' : ''}`}>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="admin-hidden-file"
                                id="payment-receipt"
                            />
                            Attach Receipt (optional)
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            className="admin-button"
                        >
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>

            <div>
                <div className="admin-section-title admin-section-title--sm">
                    Payment Records ({payments.length})
                </div>
                <div className="admin-stack">
                    {payments.length === 0 ? (
                        <div className="admin-surface admin-text-center admin-muted">
                            No payments recorded yet
                        </div>
                    ) : (
                        payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="admin-surface"
                            >
                                {editingPaymentId === payment.id ? (
                                    <div className="admin-stack" style={{ gridColumn: '1 / -1' }}>
                                        <div className="admin-grid admin-grid--3cols">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="admin-input"
                                                value={editForm.amount}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                                                disabled={loading}
                                            />
                                            <input
                                                type="date"
                                                className="admin-input"
                                                value={editForm.date}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                                                max={new Date().toISOString().split('T')[0]}
                                                disabled={loading}
                                            />
                                            <select
                                                className="admin-input"
                                                value={editForm.method}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, method: e.target.value }))}
                                                disabled={loading}
                                            >
                                                    <option value="">— Select method —</option>
                                                    <option value="cash">💵 Cash</option>
                                                    <option value="card">💳 Card</option>
                                                    <option value="zeffy">📱 Zeffy</option>
                                            </select>
                                        </div>
                                        <textarea
                                            className="admin-input admin-input--textarea-md"
                                            value={editForm.note}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                                            disabled={loading}
                                        />
                                        <div className="admin-actions">
                                            <button type="button" className="admin-button" disabled={loading} onClick={() => saveEdit(payment.id)}>
                                                ✅ Save
                                            </button>
                                            <button type="button" className="admin-button secondary" disabled={loading} onClick={cancelEdit}>
                                                ✕ Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <div className="admin-item-title">${Number(payment.amount || 0).toLocaleString()}</div>
                                            <div className="admin-muted admin-muted--sm mt-sm">
                                                {new Date(payment.date).toLocaleDateString()} · {payment.method} {payment.note && `· ${payment.note}`}
                                            </div>
                                        </div>
                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadConfirmation(payment)}
                                                className="admin-button secondary"
                                                disabled={loading}
                                            >
                                                    📄 PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => beginEdit(payment)}
                                                className="admin-button secondary"
                                                disabled={loading}
                                            >
                                                    ✏️ Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePayment(payment.id)}
                                                    className="admin-button danger"
                                                disabled={loading}
                                            >
                                                    🗑️ Remove
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
