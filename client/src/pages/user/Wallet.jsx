import { useEffect, useMemo, useState } from 'react';
import { payoutsAPI, userAPI, walletAPI } from '../../utils/api.js';
import BottomNav from '../../components/BottomNav.jsx';
import StatusPopup from '../../components/StatusPopup.jsx';

const TOPUP_AMOUNTS = [29, 100, 500];

const emptyBankForm = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' };

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [topping, setTopping] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState('wallet');
  const [upiId, setUpiId] = useState('');
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [savingMethod, setSavingMethod] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet'); // wallet | bank | upi

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  const loadData = async (nextPage = 1) => {
    try {
      const [balRes, txRes, payoutRes] = await Promise.all([
        walletAPI.getBalance(),
        userAPI.getTransactions({ page: nextPage, limit: 15 }),
        payoutsAPI.getMethods(),
      ]);

      setBalance(balRes.data);
      setTransactions(prev => nextPage === 1 ? txRes.data.transactions : [...prev, ...txRes.data.transactions]);
      setTotalPages(txRes.data.pagination.pages);
      setPage(nextPage);
      setPayoutMethods(payoutRes.data.methods || []);
      setDefaultMethod(payoutRes.data.default || 'wallet');
    } catch (err) { } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const bankConfigured = useMemo(() => !!payoutMethods.find(i => i.id === 'bank' && i.configured), [payoutMethods]);

  const handleTopUp = async () => {
    const amount = Number(customAmount) || selectedAmount;
    if (!amount || amount < 24) return showToast('Error', 'Minimum top-up is ₹24.', 'error');

    setTopping(true);
    try {
      const { data } = await walletAPI.topUp({ amount });
      showToast('Money added', data.message);
      setCustomAmount(''); setSelectedAmount(null);
      await loadData();
    } catch (err) {
      showToast('Failed', err.response?.data?.error || 'Top-up failed', 'error');
    } finally { setTopping(false); }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) return showToast('Error', 'Minimum bank transfer is ₹100.', 'error');
    setWithdrawing(true);
    try {
      const { data } = await walletAPI.withdrawToBank({ amount });
      showToast('Transferred', data.message);
      setWithdrawAmount(''); await loadData();
    } catch (err) {
      showToast('Failed', err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Transfer failed', 'error');
    } finally { setWithdrawing(false); }
  };

  const handleWithdrawUpi = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) return showToast('Error', 'Minimum UPI transfer is ₹100.', 'error');
    setWithdrawing(true);
    try {
      const { data } = await walletAPI.withdrawToUpi({ amount });
      showToast('Transferred', data.message);
      setWithdrawAmount(''); await loadData();
    } catch (err) {
      showToast('Failed', err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Transfer failed', 'error');
    } finally { setWithdrawing(false); }
  };

  const saveUpi = async () => {
    setSavingMethod(true);
    try {
      await payoutsAPI.configureUpi({ upiId });
      showToast('UPI Saved', 'Claims can be sent to UPI now.');
      await loadData();
      setUpiId('');
    } catch (err) {
      showToast('Failed', 'Could not save UPI', 'error');
    } finally { setSavingMethod(false); }
  };

  const saveBank = async () => {
    setSavingMethod(true);
    try {
      await payoutsAPI.configureBankAccount(bankForm);
      showToast('Bank linked', 'Ready for transfers.');
      setBankForm(emptyBankForm); await loadData();
    } catch (err) {
      showToast('Failed', 'Could not save bank', 'error');
    } finally { setSavingMethod(false); }
  };

  const updateDefaultMethod = async (method) => {
    setSavingMethod(true);
    try {
      await payoutsAPI.setDefaultMethod({ method });
      setDefaultMethod(method);
      showToast('Payout Updated', `Claims will be sent to ${method}.`);
      await loadData();
    } catch (err) { } finally { setSavingMethod(false); }
  };

  const txIcons = {
    premium_deduction: { icon: '🛡', label: 'Premium', color: '#f97316' },
    payout: { icon: '💸', label: 'Payout', color: '#4ade80' },
    topup: { icon: '➕', label: 'Top-up', color: '#38bdf8' },
    refund: { icon: '↩', label: 'Refund', color: '#a78bfa' },
    bank_withdrawal: { icon: '🏦', label: 'Bank Transfer', color: '#9ca3af' },
  };

  return (
    <div className="phone-screen">
      <StatusPopup toast={toast} />
      <div className="page-content">

      <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif" }}>Wallet</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Balance & Payouts</div>
        </div>
        <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)', border: '2px solid rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
           <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        {/* Glow Balance Card */}
        <div style={{
          position: 'relative', padding: 24, borderRadius: 24, overflow: 'hidden',
          background: 'linear-gradient(135deg, #131320 0%, #0d0d14 100%)',
          border: '1px solid rgba(249,115,22,0.2)',
          boxShadow: '0 10px 40px rgba(249,115,22,0.15)'
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'rgba(249,115,22,0.15)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>AVAILABLE BALANCE</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", marginTop: 4 }}>
            <span style={{ fontSize: 24, color: '#f97316' }}>₹</span>{loading ? '--' : balance?.balance || 0}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <span style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 12, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              Weekly: ₹{balance?.weeklyPremium || 29}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '0 20px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 4 }}>
        {[{ id: 'wallet', label: 'Top-up' }, { id: 'bank', label: 'Bank' }, { id: 'upi', label: 'UPI' }].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 12,
              background: activeTab === t.id ? '#f97316' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s ease', border: 'none', cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {activeTab === 'wallet' && (
          <div className="glass fade-up" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Add Money</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {TOPUP_AMOUNTS.map(amt => (
                <button
                  key={amt} onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    border: selectedAmount === amt ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedAmount === amt ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)',
                    color: selectedAmount === amt ? '#f97316' : '#fff', transition: 'all 0.2s'
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>₹</span>
              <input type="number" placeholder="Custom amount" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }} className="input-field" style={{ paddingLeft: 30 }} />
            </div>
            <button onClick={handleTopUp} disabled={topping || (!selectedAmount && !customAmount)} className="btn-primary" style={{ width: '100%', opacity: (!selectedAmount && !customAmount) ? 0.5 : 1 }}>
              {topping ? 'Processing…' : `Add ₹${customAmount || selectedAmount || 0}`}
            </button>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="fade-up">
            {!bankConfigured ? (
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Link Bank Account</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Receive payouts & withdraw wallet balance.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="text" className="input-field" placeholder="Account holder name" value={bankForm.accountHolderName} onChange={e => setBankForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                  <input type="text" className="input-field" placeholder="Bank name" value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} />
                  <input type="numeric" className="input-field" placeholder="Account number" value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} />
                  <input type="text" className="input-field" placeholder="IFSC code" value={bankForm.ifscCode} onChange={e => setBankForm(f => ({ ...f, ifscCode: e.target.value.toUpperCase() }))} />
                  <button onClick={saveBank} disabled={savingMethod} className="btn-primary" style={{ marginTop: 4 }}>Save Bank</button>
                </div>
              </div>
            ) : (
               <div className="glass" style={{ padding: 20 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Bank Linked 🏦</div>
                      <div style={{ fontSize: 12, color: '#4ade80' }}>Ready for transfers</div>
                    </div>
                    <button onClick={() => updateDefaultMethod('bank')} style={{ background: defaultMethod==='bank'? '#f97316': 'rgba(255,255,255,0.1)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700 }}>
                      {defaultMethod === 'bank' ? 'Current Default' : 'Set as Default'}
                    </button>
                 </div>
                 
                 <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                   <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Withdraw Wallet Balance</div>
                   <div style={{ display: 'flex', gap: 8 }}>
                     <input type="number" min={100} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="₹ Amount (min 100)" className="input-field" style={{ flex: 1 }} />
                     <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount} className="btn-primary" style={{ padding: '0 16px' }}>Send</button>
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}

        {activeTab === 'upi' && (
          <div className="fade-up">
            {!payoutMethods.find(m => m.id === 'upi')?.configured ? (
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Link UPI ID</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Receive claims instantly to your bank.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="text" className="input-field" placeholder="worker@okbank" value={upiId} onChange={e => setUpiId(e.target.value)} />
                  <button onClick={saveUpi} disabled={savingMethod} className="btn-primary">Save UPI</button>
                </div>
              </div>
            ) : (
               <div className="glass" style={{ padding: 20 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>UPI Linked 📱</div>
                      <div style={{ fontSize: 12, color: '#4ade80' }}>Ready for transfers</div>
                      <button onClick={() => setPayoutMethods(prev => prev.map(m => m.id === 'upi' ? { ...m, configured: false } : m))} style={{ marginTop: 8, background: 'transparent', border: '1px solid #f97316', color: '#f97316', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        Change UPI ID
                      </button>
                    </div>
                    <button onClick={() => updateDefaultMethod('upi')} style={{ background: defaultMethod==='upi'? '#f97316': 'rgba(255,255,255,0.1)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700 }}>
                      {defaultMethod === 'upi' ? 'Current Default' : 'Set as Default'}
                    </button>
                 </div>
                 
                 <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                   <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Withdraw Wallet Balance</div>
                   <div style={{ display: 'flex', gap: 8 }}>
                     <input type="number" min={100} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="₹ Amount (min 100)" className="input-field" style={{ flex: 1 }} />
                     <button onClick={handleWithdrawUpi} disabled={withdrawing || !withdrawAmount} className="btn-primary" style={{ padding: '0 16px' }}>Send</button>
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* Transactions List */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Recent Activity</div>
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
               {[1,2,3].map(i => <div key={i} className="heat-shimmer" style={{ height: 60, borderRadius: 16 }} />)}
             </div>
          ) : transactions.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No transactions yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map(tx => {
                const isCredit = tx.amount > 0;
                const meta = txIcons[tx.type] || { icon: '•', label: tx.type, color: '#fff' };
                return (
                  <div key={tx._id} className="glass" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: `rgba(255,255,255,0.05)`,
                      color: meta.color, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{meta.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{meta.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: isCredit ? '#4ade80' : '#fff' }}>
                      {isCredit ? '+' : ''}₹{Math.abs(tx.amount)}
                    </div>
                  </div>
                )
              })}
              {page < totalPages && (
                 <button onClick={() => loadData(page + 1)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#f97316', padding: 12, borderRadius: 16, fontSize: 13, fontWeight: 700, marginTop: 8 }}>Load more</button>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
