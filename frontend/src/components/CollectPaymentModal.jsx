import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wallet, QrCode, CheckCircle, Loader, ShieldCheck, Banknote, CreditCard, Layers, Split } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * CollectPaymentModal — Admin collects fee payment.
 * Payment modes:
 *   - Cash / UPI per single installment (existing)
 *   - Full Balance: pay all pending fees in one shot (new)
 *   - Single Installment: pay one invoice at a time (existing)
 *
 * Props:
 *  fee        — the fee object { _id, amount, term, studentId }
 *  allFees    — full list of fees for the student (to compute full balance)
 *  studentName
 *  onClose()
 *  onSuccess()
 */
export default function CollectPaymentModal({ fee, allFees = [], studentName, onClose, onSuccess }) {
  const [payMode, setPayMode] = useState('single');   // 'single' | 'full'
  const [method, setMethod] = useState('');           // 'cash' | 'upi'
  const [stage, setStage] = useState('choose');       // choose | upiPending | verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [rzpKey, setRzpKey] = useState(null);
  const [rzpReady, setRzpReady] = useState(false);
  const pollRef = useRef(null);

  const token = localStorage.getItem('token');

  // All pending fees for this student
  const pendingFees = allFees.filter(f => f.status !== 'paid' && f._id !== undefined);
  const singleAmount = fee.totalAmount || fee.amount || 0;
  const fullBalance  = pendingFees.reduce((sum, f) => sum + (f.totalAmount || f.amount || 0), 0) || singleAmount;
  const activeAmount = payMode === 'full' ? fullBalance : singleAmount;

  // Fire confetti + callback
  const fireSuccess = useCallback((receiptData) => {
    setStage('success');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => onSuccess?.(receiptData), 1000);
  }, [onSuccess]);

  // Poll fee receipt
  const startPollingFee = useCallback((feeId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/receipt/${feeId}`);
        const data = await res.json();
        if (data.success && data.receipt) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          fireSuccess(data);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  }, [fireSuccess]);

  useEffect(() => {
    fetch('/api/razorpay/config')
      .then(r => r.json())
      .then(d => { if (d.success) setRzpKey(d.keyId); })
      .catch(() => {});

    if (!document.getElementById('razorpay-checkout-script')) {
      const s = document.createElement('script');
      s.id = 'razorpay-checkout-script';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => setRzpReady(true);
      document.body.appendChild(s);
    } else {
      setRzpReady(true);
    }

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── CASH ──
  const handleCash = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      if (payMode === 'full' && pendingFees.length > 1) {
        // Pay all pending fees sequentially
        for (const f of pendingFees) {
          await fetch(`/api/admin/fees/${f._id}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ paymentMethod: 'Desk Cash — Full Balance' })
          });
        }
        fireSuccess({ message: 'Full balance paid in cash' });
      } else {
        const res = await fetch(`/api/admin/fees/${fee._id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentMethod: 'Admission Desk Cash' })
        });
        const data = await res.json();
        if (data.success) fireSuccess(data);
        else { setStage('error'); setErrorMsg(data.message || 'Cash collection failed.'); }
      }
    } catch (err) {
      console.error(err);
      setStage('error');
      setErrorMsg('Network error. Could not record cash payment.');
    }
  };

  // ── UPI / RAZORPAY ──
  const handleUpi = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      if (rzpKey && window.Razorpay) {
        const orderRes = await fetch('/api/razorpay/create-fee-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            feeId: fee._id,
            studentId: fee.studentId?._id || fee.studentId,
            amount: activeAmount
          })
        });
        const orderData = await orderRes.json();
        if (orderData.success && orderData.order) {
          const options = {
            key: rzpKey,
            amount: orderData.order.amount,
            currency: 'INR',
            name: 'Pranidha International School',
            description: payMode === 'full' ? `Full Balance — ${studentName}` : fee.term,
            order_id: orderData.order.id,
            prefill: { name: studentName },
            theme: { color: '#FF7043' },
            handler: async (response) => {
              setStage('verifying');
              try {
                if (payMode === 'full' && pendingFees.length > 1) {
                  // Mark all pending fees paid after one Razorpay transaction
                  for (const f of pendingFees) {
                    await fetch(`/api/admin/fees/${f._id}/pay`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ paymentMethod: `Razorpay Full Balance (${response.razorpay_payment_id})` })
                    });
                  }
                } else {
                  await fetch('/api/razorpay/verify-fee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                      feeId: fee._id,
                      studentId: fee.studentId?._id || fee.studentId
                    })
                  });
                }
              } catch (e) {
                console.error('verify-fee error:', e);
              }
              startPollingFee(fee._id);
            },
            modal: { ondismiss: () => setStage('choose') }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
          setStage('upiPending');
          startPollingFee(fee._id);
        } else {
          setStage('error');
          setErrorMsg(orderData.message || 'Could not generate Razorpay order.');
        }
      } else {
        // No keys — show QR fallback
        setStage('upiPending');
        startPollingFee(fee._id);
      }
    } catch (err) {
      console.error(err);
      setStage('error');
      setErrorMsg(err.message || 'Network error. Could not start UPI payment.');
    }
  };

  // ── Simulate webhook (dev/sandbox) ──
  const handleSimulateWebhook = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      if (payMode === 'full' && pendingFees.length > 1) {
        for (const f of pendingFees) {
          await fetch('/api/razorpay/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.captured',
              payload: { payment: { entity: { id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`, method: 'upi', notes: { type: 'installment', feeId: f._id, studentId: f.studentId?._id || f.studentId } } } }
            })
          });
        }
        setTimeout(() => fireSuccess({ message: 'Full balance simulated' }), 1500);
      } else {
        const res = await fetch('/api/razorpay/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.captured',
            payload: { payment: { entity: { id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`, method: 'upi', notes: { type: 'installment', feeId: fee._id, studentId: fee.studentId?._id || fee.studentId } } } }
          })
        });
        if (res.ok) {
          setTimeout(async () => {
            const rd = await fetch(`/api/public/receipt/${fee._id}`);
            const rdata = await rd.json();
            if (rdata.success) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } fireSuccess(rdata); }
            else setStage('upiPending');
          }, 1500);
        } else { setStage('upiPending'); setErrorMsg('Webhook simulation failed.'); }
      }
    } catch (err) {
      console.error(err);
      setStage('upiPending');
      setErrorMsg('Simulation network error.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative text-slate-800 max-h-[92vh] overflow-y-auto">

        <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); onClose?.(); }}
          className="absolute flex items-center justify-center w-8 h-8 font-bold transition-colors rounded-full top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pb-3 space-y-1 text-center border-b-2 border-slate-100">
          <div className="w-12 h-12 rounded-full bg-[#5B468C]/10 text-[#5B468C] flex items-center justify-center mx-auto shadow-[inset_1px_1px_2px_white] mb-1">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-extrabold tracking-widest text-[#5B468C] bg-[#5B468C]/10 px-2.5 py-0.5 rounded-full uppercase">Collect Invoice Payment</span>
          <h4 className="font-quicksand font-bold text-slate-800 text-base mt-1">{studentName}</h4>
          <p className="text-[10px] text-slate-500">Bill Item: {fee.term}</p>
          <p className="text-3xl font-extrabold text-brandCoral font-quicksand mt-1">
            ₹{activeAmount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* CHOOSE METHOD */}
        {stage === 'choose' && (
          <div className="py-4 space-y-3">

            {/* ── Pay Mode: Single vs Full ── */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Amount</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayMode('single')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-xs ${payMode === 'single' ? 'border-brandCoral bg-brandCoral/5' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <Split className="w-5 h-5 text-brandCoral" />
                  <span className="font-bold text-slate-800">This Installment</span>
                  <span className="text-[10px] text-slate-500 font-semibold">₹{singleAmount.toLocaleString('en-IN')}</span>
                </button>
                <button
                  onClick={() => setPayMode('full')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-xs ${payMode === 'full' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-slate-800">Full Balance</span>
                  <span className="text-[10px] text-indigo-600 font-bold">₹{fullBalance.toLocaleString('en-IN')}</span>
                  {pendingFees.length > 0 && (
                    <span className="text-[9px] text-slate-400">{pendingFees.length} dues cleared</span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Collection Method ── */}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collection Method</p>
            <button
              onClick={() => setMethod('cash')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'cash' ? 'border-brandMint bg-brandMint/5' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-brandMint/10 text-brandMint flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
              <div className="text-left">
                <p className="font-quicksand font-bold text-sm text-slate-800">Desk Cash</p>
                <p className="text-[10px] text-slate-500">Collect cash at the counter. Marks invoice paid instantly.</p>
              </div>
            </button>

            <button
              onClick={() => setMethod('upi')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'upi' ? 'border-brandSky bg-brandSky/5' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-brandSky/10 text-brandSky flex items-center justify-center"><QrCode className="w-5 h-5" /></div>
              <div className="text-left">
                <p className="font-quicksand font-bold text-sm text-slate-800">UPI / Razorpay</p>
                <p className="text-[10px] text-slate-500">Open Razorpay checkout. Auto-detects payment via webhook.</p>
              </div>
            </button>

            <button
              disabled={!method}
              onClick={method === 'cash' ? handleCash : handleUpi}
              className={`w-full py-3 rounded-2xl font-quicksand font-bold text-xs transition-all ${method ? 'bg-brandCoral hover:bg-brandCoral-dark text-white shadow' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {method === 'cash'
                ? `COLLECT ₹${activeAmount.toLocaleString('en-IN')} IN CASH`
                : `PAY ₹${activeAmount.toLocaleString('en-IN')} VIA UPI / RAZORPAY`}
            </button>
          </div>
        )}

        {/* UPI PENDING */}
        {stage === 'upiPending' && (
          <div className="py-5 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="inline-block p-4 rounded-3xl bg-white border border-slate-100">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=billing@appletree&pn=Appletree%20Coaching&am=${activeAmount}&cu=INR`)}`}
                  alt="UPI QR Code"
                  className="h-40 w-40"
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Scan to pay <span className="text-brandCoral font-bold">₹{activeAmount.toLocaleString('en-IN')}</span>
                {payMode === 'full' && <span className="text-indigo-500"> (full balance)</span>}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-brandSky">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              <span>Auto-detecting payment… waiting for webhook</span>
            </div>
            {!rzpKey && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sandbox Controls</p>
                <button onClick={handleSimulateWebhook}
                  className="w-full py-2.5 rounded-xl bg-brandCoral hover:bg-brandCoral-dark text-white font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow">
                  <QrCode className="w-4 h-4" /> SIMULATE WEBHOOK SUCCESS (MOCK)
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'verifying' && (
          <div className="py-10 text-center">
            <Loader className="w-8 h-8 mx-auto animate-spin text-brandCoral" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Verifying payment & generating receipt…</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-brandMint/10 text-brandMint flex items-center justify-center mx-auto shadow-[inset_1px_1px_2px_white]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="font-quicksand font-bold text-slate-800">Payment Cleared!</h4>
            <p className="text-xs text-slate-500">
              {payMode === 'full' ? 'Full balance has been cleared.' : 'The invoice has been paid and verified.'}
            </p>
          </div>
        )}

        {stage === 'error' && (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-red-600">{errorMsg}</p>
            <button onClick={() => setStage('choose')} className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-quicksand font-bold text-xs">BACK</button>
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * CollectPaymentModal: Allows admin to collect fee payment for an invoice.
 * - Cash: instantly collected → fee marked as paid on backend.
 * - UPI: opens Razorpay checkout and polls for status (or simulate webhook in mock mode).
 *
 * Props:
 *  - fee: the fee object { _id, amount, term, studentId }
 *  - studentName: the student's name
 *  - onClose()
 *  - onSuccess()
 */
export default function CollectPaymentModal({ fee, studentName, onClose, onSuccess }) {
  const [method, setMethod] = useState('');        // 'cash' | 'upi'
  const [stage, setStage] = useState('choose');    // choose | upiPending | verifying | success | error
  const [payment, setPayment] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [rzpKey, setRzpKey] = useState(null);
  const [rzpReady, setRzpReady] = useState(false);
  const pollRef = useRef(null);

  const token = localStorage.getItem('token');
  const feeAmount = fee.totalAmount || fee.amount || 0;

  // Fire confetti and callback on payment success
  const fireSuccess = useCallback((receiptData) => {
    setStage('success');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => onSuccess?.(receiptData), 1000);
  }, [onSuccess]);

  // Poll outstanding installment fee status
  const startPollingFee = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/receipt/${fee._id}`);
        const data = await res.json();
        if (data.success && data.receipt) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          fireSuccess(data);
        }
      } catch (err) {
        console.error('Polling fee receipt error:', err);
      }
    }, 3000);
  }, [fee._id, fireSuccess]);

  // Load Razorpay config & script on mount
  useEffect(() => {
    fetch('/api/razorpay/config')
      .then((r) => r.json())
      .then((d) => { if (d.success) setRzpKey(d.keyId); })
      .catch(() => {});

    if (!document.getElementById('razorpay-checkout-script')) {
      const s = document.createElement('script');
      s.id = 'razorpay-checkout-script';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => setRzpReady(true);
      document.body.appendChild(s);
    } else {
      setRzpReady(true);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ---- CASH: collect instantly at the desk ----
  const handleCash = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/fees/${fee._id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: 'Admission Desk Cash' })
      });
      const data = await res.json();
      if (data.success) {
        fireSuccess(data);
      } else {
        setStage('error');
        setErrorMsg(data.message || 'Cash collection failed.');
      }
    } catch (err) {
      console.error(err);
      setStage('error');
      setErrorMsg('Network error. Could not record cash payment.');
    }
  };

  // ---- UPI: create a payment order via Razorpay, poll for webhook ----
  const handleUpi = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      if (rzpKey && window.Razorpay) {
        // Create Razorpay Order
        const orderRes = await fetch('/api/razorpay/create-fee-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            feeId: fee._id,
            studentId: fee.studentId?._id || fee.studentId,
            amount: feeAmount
          })
        });
        const orderData = await orderRes.json();
        if (orderData.success && orderData.order) {
          const options = {
            key: rzpKey,
            amount: orderData.order.amount,
            currency: 'INR',
            name: 'Pranidha International School',
            description: fee.term,
            order_id: orderData.order.id,
            prefill: {
              name: studentName
            },
            theme: { color: '#FF7043' },
            handler: async (response) => {
              setStage('verifying');
              try {
                await fetch('/api/razorpay/verify-fee', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                    feeId: fee._id,
                    studentId: fee.studentId?._id || fee.studentId
                  })
                });
              } catch (e) {
                console.error('verify-fee error:', e);
              }
              startPollingFee();
            },
            modal: {
              ondismiss: () => {
                setStage('choose');
              }
            }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
          setStage('upiPending');
          startPollingFee();
        } else {
          setStage('error');
          setErrorMsg(orderData.message || 'Could not generate Razorpay order.');
        }
      } else {
        // No keys configured -> sandbox mode QR code fallback
        setStage('upiPending');
        startPollingFee();
      }
    } catch (err) {
      console.error(err);
      setStage('error');
      setErrorMsg(err.message || 'Network error. Could not start UPI payment.');
    }
  };

  // ---- Simulate Webhook callback in sandbox mode ----
  const handleSimulateWebhook = async () => {
    setStage('verifying');
    setErrorMsg('');
    try {
      const res = await fetch('/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
                method: 'upi',
                notes: {
                  type: 'installment',
                  feeId: fee._id,
                  studentId: fee.studentId?._id || fee.studentId
                }
              }
            }
          }
        })
      });
      if (res.ok) {
        setTimeout(async () => {
          try {
            const receiptRes = await fetch(`/api/public/receipt/${fee._id}`);
            const receiptData = await receiptRes.json();
            if (receiptData.success) {
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              fireSuccess(receiptData);
            } else {
              setStage('upiPending');
            }
          } catch (err) {
            setStage('upiPending');
          }
        }, 1500);
      } else {
        setStage('upiPending');
        setErrorMsg('Webhook simulation failed.');
      }
    } catch (err) {
      console.error(err);
      setStage('upiPending');
      setErrorMsg('Simulation network error.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative text-slate-800 max-h-[92vh] overflow-y-auto">

        <button
          onClick={() => { if (pollRef.current) clearInterval(pollRef.current); onClose?.(); }}
          className="absolute flex items-center justify-center w-8 h-8 font-bold transition-colors rounded-full top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pb-3 space-y-1 text-center border-b-2 border-slate-100">
          <div className="w-12 h-12 rounded-full bg-[#5B468C]/10 text-[#5B468C] flex items-center justify-center mx-auto shadow-[inset_1px_1px_2px_white] mb-1">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-extrabold tracking-widest text-[#5B468C] bg-[#5B468C]/10 px-2.5 py-0.5 rounded-full uppercase">Collect Invoice Payment</span>
          <h4 className="font-quicksand font-bold text-slate-800 text-base mt-1">{studentName}</h4>
          <p className="text-[10px] text-slate-500">Bill Item: {fee.term}</p>
          <p className="text-3xl font-extrabold text-brandCoral font-quicksand mt-1">₹{feeAmount.toLocaleString('en-IN')}</p>
        </div>

        {/* CHOOSE METHOD */}
        {stage === 'choose' && (
          <div className="py-5 space-y-3">
            <p className="text-xs font-semibold text-center text-slate-500">Select payment collection method.</p>
            <button
              onClick={() => setMethod('cash')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'cash' ? 'border-brandMint bg-brandMint/5' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-brandMint/10 text-brandMint flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
              <div className="text-left">
                <p className="font-quicksand font-bold text-sm text-slate-800">Desk Cash</p>
                <p className="text-[10px] text-slate-500">Collect cash at the counter. Marks invoice paid instantly.</p>
              </div>
            </button>

            <button
              onClick={() => setMethod('upi')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'upi' ? 'border-brandSky bg-brandSky/5' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="w-10 h-10 rounded-full bg-brandSky/10 text-brandSky flex items-center justify-center"><QrCode className="w-5 h-5" /></div>
              <div className="text-left">
                <p className="font-quicksand font-bold text-sm text-slate-800">UPI / Razorpay</p>
                <p className="text-[10px] text-slate-500">Scan QR & pay. Auto-detects payment via webhook.</p>
              </div>
            </button>

            <button
              disabled={!method}
              onClick={method === 'cash' ? handleCash : handleUpi}
              className={`w-full py-3 rounded-2xl font-quicksand font-bold text-xs transition-all ${method ? 'bg-brandCoral hover:bg-brandCoral-dark text-white shadow' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {method === 'cash' ? 'COLLECT CASH & CONFIRM' : 'OPEN UPI SCANNERS / RAZORPAY'}
            </button>
          </div>
        )}

        {/* UPI PENDING: QR + auto-poll */}
        {stage === 'upiPending' && (
          <div className="py-5 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="inline-block p-4 rounded-3xl bg-white border border-slate-100">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    `upi://pay?pa=billing@appletree&pn=Appletree%20Coaching&am=${feeAmount}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  className="h-40 w-40"
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-500">Scan with any UPI app to pay <span className="text-brandCoral font-bold">₹{feeAmount.toLocaleString('en-IN')}</span></p>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-brandSky">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              <span>Auto-detecting payment… waiting for webhook callback</span>
            </div>

            {/* Sandbox simulation */}
            {!rzpKey && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sandbox Controls</p>
                <button
                  onClick={handleSimulateWebhook}
                  className="w-full py-2.5 rounded-xl bg-brandCoral hover:bg-brandCoral-dark text-white font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <QrCode className="w-4 h-4" /> SIMULATE WEBHOOK SUCCESS (MOCK RAZORPAY)
                </button>
              </div>
            )}
          </div>
        )}

        {/* VERIFYING */}
        {stage === 'verifying' && (
          <div className="py-10 text-center">
            <Loader className="w-8 h-8 mx-auto animate-spin text-brandCoral" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Verifying payment & generating receipt…</p>
          </div>
        )}

        {/* SUCCESS */}
        {stage === 'success' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-brandMint/10 text-brandMint flex items-center justify-center mx-auto shadow-[inset_1px_1px_2px_white]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="font-quicksand font-bold text-slate-800">Payment Cleared!</h4>
            <p className="text-xs text-slate-500">The invoice payment has been received and verified.</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-red-600">{errorMsg}</p>
            <button onClick={() => setStage('choose')} className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-quicksand font-bold text-xs">BACK</button>
          </div>
        )}

      </div>
    </div>
  );
}
