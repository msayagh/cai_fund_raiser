import { downloadPaymentConfirmation } from '@/lib/adminApi.js';
import { useState } from 'react';

export default function PaymentPanel({ donor, payments, onAddPayment, loading, inputStyle, cardStyle, t }) {
    const [paymentDateError, setPaymentDateError] = useState('');

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
        <div style={cardStyle}>
            <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 20,
                marginBottom: 18,
            }}>
                Payment History
            </div>

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 20,
            }}>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pledged</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>${pledge.toLocaleString()}</div>
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Paid</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>${totalPaid.toLocaleString()}</div>
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Remaining</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>${remaining.toLocaleString()}</div>
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Status</div>
                    <div style={{
                        fontWeight: 700,
                        marginTop: 4,
                        color: status === 'Completed' ? '#7EB8A0' : status === 'In Progress' ? '#D4A96E' : '#7c8499',
                    }}>
                        {status}
                    </div>
                </div>
            </div>

            {/* Add Payment Form */}
            <div style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                marginBottom: 20,
            }}>
                <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 14,
                    marginBottom: 12,
                }}>
                    Record Payment
                </div>
                <form onSubmit={onAddPayment} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={inputStyle}
                            placeholder="Amount"
                            required
                            id="payment-amount"
                        />
                        <select style={inputStyle} id="payment-method" required>
                            <option value="">Select method</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                        </select>
                    </div>
                    <div>
                        <input
                            type="date"
                            style={{ ...inputStyle, borderColor: paymentDateError ? '#ff6b6b' : 'var(--border)' }}
                            id="payment-date"
                            required
                            onChange={handlePaymentDateChange}
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {paymentDateError && (
                            <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>
                                ⚠️ {paymentDateError}
                            </div>
                        )}
                    </div>
                    <textarea
                        style={{ ...inputStyle, minHeight: 80 }}
                        placeholder="Payment note (optional)"
                        id="payment-note"
                    />
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label style={{
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px dashed var(--border)',
                            background: 'rgba(255,255,255,0.02)',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            textAlign: 'center',
                            fontSize: 14,
                        }}>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                style={{ display: 'none' }}
                                id="payment-receipt"
                            />
                            📎 Attach Receipt (optional)
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--accent-gold)',
                                color: '#111',
                                fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Payment List */}
            <div>
                <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 14,
                    marginBottom: 12,
                }}>
                    Payment Records ({payments.length})
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                    {payments.length === 0 ? (
                        <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                        }}>
                            No payments recorded yet
                        </div>
                    ) : (
                        payments.map((payment) => (
                            <div
                                key={payment.id}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700 }}>${Number(payment.amount || 0).toLocaleString()}</div>
                                    <div style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                        marginTop: 4,
                                    }}>
                                        {new Date(payment.date).toLocaleDateString()} · {payment.method} {payment.note && `· ${payment.note}`}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadConfirmation(payment)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: 'var(--text-primary)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    📄 PDF
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
