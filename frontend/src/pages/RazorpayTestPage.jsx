import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { 
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, 
  ArrowRight, Coins, RefreshCw, LogIn, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';

export default function RazorpayTestPage() {
  const { user, token } = useAuth();
  const { isDark } = useTheme();

  // Input states
  const [amountInRupees, setAmountInRupees] = useState('10'); // Default ₹10
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'created' | 'opened' | 'success' | 'failed'
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Load user data if logged in
  useEffect(() => {
    if (user) {
      setCustomName(user.name || '');
      setCustomEmail(user.email || '');
      setCustomPhone(user.phone || '');
    }
  }, [user]);

  // Load Razorpay Checkout library
  const loadRazorpayCheckoutScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('You must be logged in to proceed with the payment checkout.');
      setStatus('failed');
      return;
    }

    const amountInPaise = Math.round(parseFloat(amountInRupees) * 100);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      setErrorMsg('The payment amount must be at least ₹1 (100 paise).');
      setStatus('failed');
      return;
    }

    setLoading(true);
    setStatus('created');
    setErrorMsg('');

    try {
      // 1. Create order on the backend
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `test_receipt_${Date.now()}`
        })
      });

      const orderData = await orderRes.json();
      
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to create order on the server.');
      }

      // 2. Load the checkout script
      const scriptLoaded = await loadRazorpayCheckoutScript();
      if (!scriptLoaded) {
        throw new Error('Could not load the Razorpay checkout script. Check your internet connection.');
      }

      // 3. Trigger checkout modal
      setStatus('opened');
      const rzpKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TDN5lD1IiJZXoG';

      const options = {
        key: rzpKeyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Pranidha International School',
        description: 'Standard Checkout Integration Demo',
        order_id: orderData.order_id,
        prefill: {
          name: customName || 'Guest User',
          email: customEmail || 'guest@example.com',
          contact: customPhone || ''
        },
        theme: {
          color: '#FF7043' // Sleek Coral Theme
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus('failed');
            setErrorMsg('Payment cancelled. Checkout modal was closed by the user.');
          }
        },
        handler: async (response) => {
          setLoading(true);
          setStatus('verifying');
          try {
            // 4. Verify Payment Signature on Backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            setLoading(false);

            if (verifyRes.ok && verifyData.success) {
              setStatus('success');
              setPaymentDetails({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount: amountInRupees
              });
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            } else {
              throw new Error(verifyData.message || 'Signature verification failed.');
            }
          } catch (err) {
            setLoading(false);
            setStatus('failed');
            setErrorMsg(err.message || 'Payment signature verification failed.');
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      
      rzpInstance.on('payment.failed', function (resp) {
        setLoading(false);
        setStatus('failed');
        setErrorMsg(resp.error?.description || 'Razorpay payment transaction failed.');
      });

      rzpInstance.open();

    } catch (err) {
      setLoading(false);
      setStatus('failed');
      setErrorMsg(err.message || 'Checkout process could not be initiated.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMsg('');
    setPaymentDetails(null);
  };

  return (
    <div className={`min-h-screen py-16 px-4 flex flex-col items-center justify-center font-quicksand transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-800'
    }`}>
      
      {/* Navigation breadcrumb back to dashboard */}
      <div className="w-full max-w-lg mb-8 flex justify-start">
        <Link to="/" className={`inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
        }`}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-lg">
        {/* Main Card with glassmorphism or sleek design */}
        <div className={`relative overflow-hidden p-8 rounded-3xl border transition-all duration-300 shadow-2xl ${
          isDark 
            ? 'border-white/10 bg-slate-900/60 backdrop-blur-md shadow-cyan-950/20' 
            : 'border-orange-100 bg-white shadow-orange-100/40'
        }`}>
          
          {/* Header decorative gradients */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brandCoral via-orange-400 to-brandSky" />
          
          <div className="text-center mb-8">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isDark ? 'bg-white/5 text-brandCoral' : 'bg-orange-50 text-brandCoral'
            }`}>
              <CreditCard className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Razorpay Checkout</h1>
            <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Standard Web Checkout Integration Sandbox
            </p>
          </div>

          <AnimatePresence mode="wait">
            
            {/* SUCCESS STATE */}
            {status === 'success' && paymentDetails && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  <h3 className="text-xl font-extrabold text-emerald-500">Payment Verified!</h3>
                  <p className="text-sm font-semibold">Thank you! Your transaction completed successfully.</p>
                </div>

                <div className={`p-5 rounded-2xl text-left text-xs font-medium space-y-3 ${
                  isDark ? 'bg-slate-950/60 border border-white/5' : 'bg-slate-50 border border-slate-100'
                }`}>
                  <div className="flex justify-between border-b pb-2 border-slate-100 dark:border-white/5">
                    <span className="text-slate-400">Amount Paid:</span>
                    <span className="font-extrabold text-brandCoral text-sm">₹{paymentDetails.amount}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-slate-400">Razorpay Order ID:</span>
                    <span className="font-mono text-[10px] break-all select-all font-semibold">{paymentDetails.orderId}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-slate-400">Razorpay Payment ID:</span>
                    <span className="font-mono text-[10px] break-all select-all font-semibold text-emerald-600 dark:text-emerald-400">{paymentDetails.paymentId}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-slate-400">Payment Signature:</span>
                    <span className="font-mono text-[9px] break-all select-all text-slate-400">{paymentDetails.signature}</span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-brandCoral text-brandCoral hover:bg-brandCoral/10"
                  >
                    MAKE ANOTHER PAYMENT
                  </button>
                </div>
              </motion.div>
            )}

            {/* FAILURE STATE */}
            {status === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <AlertTriangle className="w-16 h-16 text-rose-500" />
                  <h3 className="text-xl font-extrabold text-rose-500">Payment Failed</h3>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Something went wrong during checkout.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 ${
                  isDark ? 'bg-rose-950/20 border border-rose-950/50' : 'bg-rose-50 border border-rose-100'
                }`}>
                  {errorMsg || 'An unknown error occurred during transaction processing.'}
                </div>

                <div className="pt-2 flex space-x-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider transition-all duration-300 bg-brandCoral text-white shadow-lg hover:shadow-brandCoral/20 hover:scale-[1.01]"
                  >
                    TRY AGAIN
                  </button>
                </div>
              </motion.div>
            )}

            {/* FORM / IDLE / LOADING STATE */}
            {status !== 'success' && status !== 'failed' && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!token ? (
                  /* Authentication warning screen */
                  <div className="text-center py-6 space-y-6">
                    <div className={`p-5 rounded-2xl border text-xs font-medium space-y-4 ${
                      isDark ? 'bg-slate-950/40 border-white/5 text-slate-300' : 'bg-orange-50/50 border-orange-100 text-slate-600'
                    }`}>
                      <p>
                        Checkout requires an authenticated session to create Razorpay orders securely. Please log in using the demo account credentials to test.
                      </p>
                    </div>
                    <Link
                      to="/login"
                      className="w-full py-4 rounded-2xl font-extrabold text-xs tracking-wider transition-all duration-300 bg-brandCoral text-white shadow-lg hover:shadow-brandCoral/20 flex items-center justify-center space-x-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>LOG IN TO TEST CHECKOUT</span>
                    </Link>
                  </div>
                ) : (
                  /* Form fields */
                  <form onSubmit={handleCheckout} className="space-y-5">
                    
                    {/* Amount Input */}
                    <div>
                      <label className="block text-xs font-black tracking-wider uppercase mb-2">
                        Payment Amount (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={amountInRupees}
                          onChange={(e) => setAmountInRupees(e.target.value)}
                          disabled={loading}
                          required
                          className={`w-full pl-8 pr-4 py-3.5 text-sm font-bold rounded-2xl outline-none border transition-colors ${
                            isDark 
                              ? 'bg-slate-950 border-white/10 focus:border-brandCoral text-white' 
                              : 'bg-slate-50 border-orange-100 focus:border-brandCoral text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Pre-fill Prefs */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-black tracking-wider uppercase mb-1.5">
                          Billing Name
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          disabled={loading}
                          required
                          placeholder="Your Name"
                          className={`w-full px-4 py-3 text-xs font-semibold rounded-2xl outline-none border transition-colors ${
                            isDark 
                              ? 'bg-slate-950 border-white/10 focus:border-brandCoral text-white' 
                              : 'bg-slate-50 border-orange-100 focus:border-brandCoral text-slate-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black tracking-wider uppercase mb-1.5">
                          Billing Email
                        </label>
                        <input
                          type="email"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          disabled={loading}
                          required
                          placeholder="your.email@example.com"
                          className={`w-full px-4 py-3 text-xs font-semibold rounded-2xl outline-none border transition-colors ${
                            isDark 
                              ? 'bg-slate-950 border-white/10 focus:border-brandCoral text-white' 
                              : 'bg-slate-50 border-orange-100 focus:border-brandCoral text-slate-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black tracking-wider uppercase mb-1.5">
                          Billing Contact / Phone
                        </label>
                        <input
                          type="tel"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          disabled={loading}
                          placeholder="+91 9999999999"
                          className={`w-full px-4 py-3 text-xs font-semibold rounded-2xl outline-none border transition-colors ${
                            isDark 
                              ? 'bg-slate-950 border-white/10 focus:border-brandCoral text-white' 
                              : 'bg-slate-50 border-orange-100 focus:border-brandCoral text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-extrabold text-xs tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 ${
                          loading 
                            ? 'bg-slate-400 cursor-not-allowed text-white' 
                            : 'bg-brandCoral text-white shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.01] hover:bg-orange-600'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>
                              {status === 'created' && 'CREATING ORDER...'}
                              {status === 'opened' && 'CHECKOUT MODAL OPENED...'}
                              {status === 'verifying' && 'VERIFYING SIGNATURE...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>PAY SECURELY WITH RAZORPAY</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PCI-DSS Compliant 256-Bit SSL Encryption</span>
        </div>
      </div>
    </div>
  );
}
