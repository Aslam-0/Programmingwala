import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Smile, Award, Clock, CreditCard, Clipboard, CheckCircle, FileText, Download, BookOpen, Layers, Split, QrCode, Loader, Banknote, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ResultCardModal from '../components/ResultCardModal.jsx';

// ── Inline fee payment modal for parent (Razorpay + Full/Installment) ──
function FeePayModal({ fee, allFees = [], studentName, onClose, onSuccess }) {
  const [payMode, setPayMode] = useState('single'); // 'single' | 'full'
  const [stage, setStage] = useState('choose');     // choose | processing | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [rzpKey, setRzpKey] = useState(null);
  const pollRef = useRef(null);
  const token = localStorage.getItem('token');

  const pendingFees = allFees.filter(f => f.status !== 'paid');
  const singleAmount = fee.amount || 0;
  const fullBalance  = pendingFees.reduce((sum, f) => sum + (f.amount || 0), 0) || singleAmount;
  const activeAmount = payMode === 'full' ? fullBalance : singleAmount;

  useEffect(() => {
    fetch('/api/razorpay/config').then(r => r.json()).then(d => { if (d.success) setRzpKey(d.keyId); }).catch(() => {});
    if (!document.getElementById('rzp-script')) {
      const s = document.createElement('script');
      s.id = 'rzp-script';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(s);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const markFeePaid = async (feeId, paymentMethod, paymentId = '') => {
    await fetch(`/api/portal/parent/child/pay-fee/${feeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentMethod, paymentId })
    });
  };

  const handleRazorpay = async () => {
    setStage('processing');
    try {
      // Create order
      const orderRes = await fetch('/api/razorpay/create-fee-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feeId: fee._id, studentId: fee.studentId?._id || fee.studentId, amount: activeAmount })
      });
      const orderData = await orderRes.json();

      // Mock mode — no live keys
      if (!orderData.success || !orderData.order || orderData.mode === 'mock') {
        // Dev simulation
        if (payMode === 'full') {
          for (const f of pendingFees) await markFeePaid(f._id, 'Razorpay (Simulated Full)');
        } else {
          await markFeePaid(fee._id, 'Razorpay (Simulated)');
        }
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setStage('success');
        setTimeout(() => onSuccess?.(), 1200);
        return;
      }

      // Live Razorpay
      if (!window.Razorpay) { setStage('error'); setErrorMsg('Payment gateway not loaded. Try again.'); return; }
      setStage('choose'); // Go back while modal is open

      const options = {
        key: rzpKey || orderData.keyId,
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'Pranidha International School',
        description: payMode === 'full' ? `Full Fee Balance — ${studentName}` : fee.term,
        order_id: orderData.order.id,
        prefill: { name: studentName },
        theme: { color: '#FF7043' },
        handler: async (response) => {
          setStage('processing');
          try {
            // Verify + mark paid
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
            if (payMode === 'full' && pendingFees.length > 1) {
              for (const f of pendingFees.filter(f => f._id !== fee._id)) {
                await markFeePaid(f._id, `Razorpay Full (${response.razorpay_payment_id})`);
              }
            }
          } catch (e) { console.error(e); }
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setStage('success');
          setTimeout(() => onSuccess?.(), 1200);
        },
        modal: { ondismiss: () => setStage('choose') }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      setStage('error');
      setErrorMsg(err.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center border-b border-slate-100 pb-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-brandCoral/10 text-brandCoral flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="font-quicksand font-bold text-slate-800 text-base">{studentName}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">{fee.term}</p>
          <p className="text-3xl font-extrabold text-brandCoral font-quicksand mt-2">
            ₹{activeAmount.toLocaleString('en-IN')}
          </p>
        </div>

        {stage === 'choose' && (
          <div className="space-y-3">
            {/* Pay mode */}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Payment Amount</p>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <button onClick={() => setPayMode('single')}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-xs transition-all ${payMode === 'single' ? 'border-brandCoral bg-brandCoral/5' : 'border-slate-100 hover:border-slate-200'}`}>
                <Split className="w-5 h-5 text-brandCoral" />
                <span className="font-bold text-slate-800">This Installment</span>
                <span className="text-[10px] text-slate-500">₹{singleAmount.toLocaleString('en-IN')}</span>
              </button>
              <button onClick={() => setPayMode('full')}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-xs transition-all ${payMode === 'full' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <Layers className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-slate-800">Pay Full Balance</span>
                <span className="text-[10px] text-indigo-600 font-bold">₹{fullBalance.toLocaleString('en-IN')}</span>
                {pendingFees.length > 0 && <span className="text-[9px] text-slate-400">Clears {pendingFees.length} dues</span>}
              </button>
            </div>

            <button onClick={handleRazorpay}
              className="w-full py-3 rounded-2xl bg-brandCoral hover:bg-brandCoral-dark text-white font-quicksand font-bold text-sm flex items-center justify-center gap-2 shadow transition-all">
              <CreditCard className="w-4 h-4" />
              Pay ₹{activeAmount.toLocaleString('en-IN')} Online
            </button>
            <p className="text-center text-[10px] text-slate-400">Powered by Razorpay · UPI, Cards, NetBanking</p>
          </div>
        )}

        {stage === 'processing' && (
          <div className="py-8 text-center">
            <Loader className="w-8 h-8 mx-auto animate-spin text-brandCoral" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Processing payment…</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="font-quicksand font-bold text-slate-800">Payment Successful!</p>
            <p className="text-xs text-slate-500">
              {payMode === 'full' ? 'Full balance cleared.' : 'Installment paid.'}
            </p>
          </div>
        )}

        {stage === 'error' && (
          <div className="py-6 text-center space-y-3">
            <p className="text-xs text-red-500">{errorMsg}</p>
            <button onClick={() => setStage('choose')} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs">TRY AGAIN</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [child, setChild] = useState(null);
  
  // Fee states
  const [fees, setFees] = useState([]);
  const [libraryNotes, setLibraryNotes] = useState([]);
  const [payingFeeId, setPayingFeeId] = useState(null);
  const [activeResultCard, setActiveResultCard] = useState(null);
  const [feePayModal, setFeePayModal] = useState(null); // { fee } | null

  useEffect(() => {
    // Parent profile children fetch
    if (profile && profile._id) {
      fetch('/api/portal/parent/children', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.children.length > 0) {
            setChild(data.children[0]); // Load first child
            fetchFees(data.children[0]._id);
          }
        })
        .catch(err => console.error(err));
    }

    fetchLibraryNotes();
  }, [profile]);

  const fetchFees = (childId) => {
    fetch(`/api/portal/parent/child/${childId}/fees`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFees(data.fees);
        }
      })
      .catch(err => console.error(err));
  };

  const fetchLibraryNotes = () => {
    fetch('/api/public/library-notes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLibraryNotes(data.data || []);
        }
      })
      .catch(err => console.error('Error fetching library notes:', err));
  };

  const handleDownloadLibraryNote = (note) => {
    if (!note?.pdfUrl) {
      alert('This note is not yet available as a PDF download.');
      return;
    }

    const link = document.createElement('a');
    link.href = note.pdfUrl.startsWith('http') ? note.pdfUrl : `${window.location.origin}${note.pdfUrl}`;
    link.download = note.fileName || `${(note.title || 'course-note').replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'submit',
    onConfirm: () => {}
  });

  const triggerConfirm = (title, message, type, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handlePayFee = (feeId) => {
    const feeObj = fees.find(f => f._id === feeId);
    if (!feeObj) return;
    setFeePayModal({ fee: feeObj });
  };

  const handleFeePaySuccess = () => {
    setFeePayModal(null);
    if (child) fetchFees(child._id);
  };

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleViewReceipt = async (feeId) => {
    setReceiptLoading(true);
    try {
      const res = await fetch(`/api/portal/parent/receipt/${feeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setReceiptLoading(false);
      if (data.success) {
        setActiveReceipt(data.receipt);
      } else {
        alert(data.message || 'Receipt not found');
      }
    } catch (err) {
      console.error(err);
      setReceiptLoading(false);
      alert('Error fetching receipt');
    }
  };



  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 font-quicksand font-medium">Fetching parent credentials...</p>
      </div>
    );
  }

  // Calculate Attendance Percentage
  const getAttendancePercent = () => {
    if (!child || !child.attendance || child.attendance.length === 0) return 100;
    const presents = child.attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    return Math.round((presents / child.attendance.length) * 100);
  };

  return (
    <div className="min-h-screen -m-4 md:-m-8 p-4 md:p-8 space-y-6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.13),transparent_24%),linear-gradient(135deg,#020617_0%,#111827_45%,#172554_100%)]">
      
      {/* Top Welcome Bar */}
      <div className="rounded-[32px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95))] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-brandYellow to-yellow-400 border-4 border-white shadow flex items-center justify-center text-slate-800 text-xl font-bold font-quicksand">
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[#9F92EC] font-bold text-xs uppercase tracking-wider block">PARENT HUB</span>
            <h1 className="text-3xl font-quicksand font-bold text-slate-800 leading-tight">Hello, {profile.name}! 👋</h1>
            <p className="text-xs text-slate-500 mt-0.5">Review your child's schedule, daily logs, and teacher notes.</p>
          </div>
        </div>
        {child && (
          <div className="bg-white border-2 border-white/60 px-4 py-3.5 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#9F92EC] flex items-center justify-center text-white shrink-0 font-bold font-quicksand">
              {child.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-quicksand font-bold text-xs text-slate-800 leading-none">{child.name}</h4>
              <span className="text-[10px] text-slate-400 font-bold mt-1 inline-block">{child.class} Program</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3 rounded-[30px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] p-6 space-y-2 text-white shadow-[0_24px_55px_rgba(2,6,23,0.45)]">
          <div className="flex flex-col items-center pb-4 border-b border-white/20 mb-4 space-y-2">
            <div className="w-16 h-16 rounded-full bg-white/25 border-4 border-white shadow-sm flex items-center justify-center font-bold text-lg font-quicksand text-white">
              PA
            </div>
            <span className="font-quicksand font-bold text-sm text-white block">Hi, Parent! 👋</span>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'profile' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Smile className="w-4.5 h-4.5" />
            <span>Child Profile</span>
          </button>
          
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'attendance' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clipboard className="w-4.5 h-4.5" />
            <span>Attendance Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'activities' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4.5 h-4.5" />
            <span>Daily Activities</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'progress' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className="w-4.5 h-4.5" />
            <span>Progress Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'library' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span>Library Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('fees')}
            className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${
              activeTab === 'fees' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4.5 h-4.5" />
            <span>Fee Ledger</span>
          </button>
        </div>

        {/* Contents Column */}
        <div className="lg:col-span-9 rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(17,24,39,0.94))] p-6 md:p-8 min-h-[350px] shadow-[0_24px_55px_rgba(2,6,23,0.4)]">
          
          {!child ? (
            <div className="text-center py-12">
              <p className="text-xs text-slate-500 font-quicksand">No child student linked to this parent account.</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Child Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="font-quicksand font-bold text-lg text-slate-800 border-b border-orange-50 pb-3">Student Profile</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <p>Name: <span className="text-slate-800">{child.name}</span></p>
                    <p>Date of Birth: <span className="text-slate-800">{new Date(child.dateOfBirth).toLocaleDateString()}</span></p>
                    <p>Gender: <span className="text-slate-800">{child.gender}</span></p>
                    <p>Class: <span className="text-slate-800">{child.class}</span></p>
                    <p>Enrollment Date: <span className="text-slate-800">{new Date(child.createdAt).toLocaleDateString()}</span></p>
                    <p>Class Teacher: <span className="text-slate-800">{child.teacherId?.name || 'Miss Emily Stone'}</span></p>
                  </div>
                </div>
              )}

              {/* Tab 2: Attendance Logs */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-orange-50 pb-3">
                    <h3 className="font-quicksand font-bold text-lg text-slate-800">Attendance Tracker</h3>
                    <span className="text-xs font-bold text-brandCoral">Percentage: {getAttendancePercent()}%</span>
                  </div>
                  
                  {child.attendance && child.attendance.length > 0 ? (
                    <div className="space-y-2">
                      {child.attendance.map((att, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                           <span className="font-bold text-slate-600">{new Date(att.date).toLocaleDateString()}</span>
                           <span className={`px-3 py-1 text-[10px] font-bold uppercase ${
                             att.status === 'present' ? 'clay-badge-blue' : 'clay-badge-pink'
                           }`}>
                             {att.status}
                           </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No attendance logs found yet.</p>
                  )}
                </div>
              )}

              {/* Tab 3: Daily Activities */}
              {activeTab === 'activities' && (
                <div className="space-y-6">
                  <h3 className="font-quicksand font-bold text-lg text-slate-800 border-b border-orange-50 pb-3">Daily Activity Log</h3>
                  {child.activities && child.activities.length > 0 ? (
                    <div className="space-y-4">
                      {child.activities.map((act, idx) => (
                        <div key={idx} className="bg-brandCream border border-orange-100 p-4 rounded-2xl text-xs space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-brandCoral uppercase tracking-wider text-[10px]">{act.category}</span>
                            <span className="text-slate-400">{act.time}</span>
                          </div>
                          <h4 className="font-quicksand font-bold text-slate-800 text-sm">{act.title}</h4>
                          <p className="text-slate-600 leading-relaxed font-medium">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No activity logs recorded for today.</p>
                  )}
                </div>
              )}

              {/* Tab 4: Progress Reports */}
              {activeTab === 'progress' && (
                <div className="space-y-6">
                  <h3 className="font-quicksand font-bold text-lg text-slate-800 border-b border-orange-50 pb-3">Evaluation Progress Cards</h3>
                  {child.progressReports && child.progressReports.length > 0 ? (
                    <div className="space-y-4">
                      {child.progressReports.map((rep, idx) => {
                        const total = Number(rep.cognitive) + Number(rep.social) + Number(rep.creative) + Number(rep.motorSkills);
                        const percentage = (total / 4).toFixed(1);
                        return (
                          <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                              <div>
                                <h4 className="font-quicksand font-bold text-slate-800 text-sm">{rep.term}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Student: {child.name} | Class: {child.class}</p>
                              </div>
                              <span className="text-[10px] bg-[#EAE8FC] text-[#7C3AED] font-bold px-3 py-0.5 rounded-full">Official Report Card</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                              <div className="bg-slate-50 border p-3 rounded-xl space-y-0.5">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">English</span>
                                <span className="text-base font-extrabold text-slate-800">{rep.cognitive} / 100</span>
                              </div>
                              <div className="bg-slate-50 border p-3 rounded-xl space-y-0.5">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Mathematics</span>
                                <span className="text-base font-extrabold text-slate-800">{rep.social} / 100</span>
                              </div>
                              <div className="bg-slate-50 border p-3 rounded-xl space-y-0.5">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Science</span>
                                <span className="text-base font-extrabold text-slate-800">{rep.creative} / 100</span>
                              </div>
                              <div className="bg-slate-50 border p-3 rounded-xl space-y-0.5">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Arts & Crafts</span>
                                <span className="text-base font-extrabold text-slate-800">{rep.motorSkills} / 100</span>
                              </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 gap-4 text-center pt-1">
                              <div className="bg-[#E0F2FE] p-3 rounded-xl border border-sky-100">
                                <span className="text-[9px] font-bold text-sky-600 block uppercase">Total Score</span>
                                <span className="text-base font-extrabold text-sky-800">{total} / 400</span>
                              </div>
                              <div className="bg-[#FEF3C7] p-3 rounded-xl border border-amber-100">
                                <span className="text-[9px] font-bold text-amber-600 block uppercase">Percentage</span>
                                <span className="text-base font-extrabold text-amber-800">{percentage}%</span>
                              </div>
                            </div>

                            <div className="bg-brandCream p-3.5 border rounded-xl text-xs space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Teacher Observation Notes</span>
                              <p className="text-slate-700 font-medium leading-relaxed italic">"{rep.notes || 'No remarks recorded.'}"</p>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setActiveResultCard({ student: child, report: rep, parentName: profile?.name })}
                                className="px-4 py-2 bg-[#5B468C] hover:bg-[#4A3970] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View / Print Result Card</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No progress reports published for this academic term.</p>
                  )}
                </div>
              )}

              {/* Tab 5: Library Notes */}
              {activeTab === 'library' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2 border-b border-orange-50 pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="font-quicksand font-bold text-lg text-slate-800">Downloadable Course Notes</h3>
                      <p className="text-xs text-slate-500">Students can open and download PDF revision notes published by the coaching team.</p>
                    </div>
                    <span className="rounded-full bg-[#EAE8FC] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.35em] text-[#7C3AED]">{libraryNotes.length} PDFs</span>
                  </div>

                  {libraryNotes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-xs text-slate-500">No notes are available yet. New PDF notes will appear here as soon as the admin saves them.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {libraryNotes.map((note) => (
                        <article key={note._id} className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-[#7C3AED] font-bold">{note.course}</p>
                              <h4 className="mt-1 text-sm font-bold font-quicksand text-slate-800">{note.title}</h4>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-600">PDF</span>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-slate-600">{note.content}</p>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Saved {new Date(note.createdAt).toLocaleString()}</p>
                            <button
                              type="button"
                              onClick={() => handleDownloadLibraryNote(note)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#5B468C] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-sm transition-all hover:bg-[#4A3970]"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PDF
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Fee Ledger */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  <h3 className="font-quicksand font-bold text-lg text-slate-800 border-b border-orange-50 pb-3">Outstanding Dues & Receipts</h3>
                  {fees.length > 0 ? (
                    <div className="space-y-4">
                      {fees.map((fee) => (
                        <div key={fee._id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                          <div className="space-y-1.5 flex-1">
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border inline-block ${
                              fee.status === 'paid' ? 'bg-brandMint/10 text-brandMint-dark border-brandMint/30' :
                              'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {fee.status}
                            </span>
                            <h4 className="font-quicksand font-bold text-slate-800 text-sm">{fee.term}</h4>
                            <p className="text-slate-500">Amount: <span className="text-slate-800 font-bold">₹{fee.amount.toLocaleString('en-IN')}</span></p>
                            <p className="text-slate-400 font-medium">Due Date: {new Date(fee.dueDate).toLocaleDateString()}</p>
                            {fee.status === 'paid' && (
                              <div className="space-y-2 pt-1">
                                <p className="text-[10px] text-slate-400 font-semibold font-mono">
                                  Txn ID: {fee.transactionId} ({fee.paymentMethod})
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(fee._id)}
                                  className="inline-flex items-center space-x-1.5 font-bold text-[10px] bg-[#EAE8FC] hover:bg-[#DED9FA] text-[#7C3AED] px-4 py-2 rounded-full border border-white shadow-sm hover:scale-105 transition-all cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>View Receipt</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {fee.status !== 'paid' && (
                            <button
                              onClick={() => handlePayFee(fee._id)}
                              className="font-quicksand font-bold text-xs bg-brandCoral hover:bg-brandCoral-dark text-white px-5 py-2.5 rounded-full shadow transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              PAY ONLINE
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No invoices generated for this student registry.</p>
                  )}
                </div>
              )}


            </>
          )}

        </div>

      </div>

      {/* Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative text-slate-800">
            <button
              onClick={() => setActiveReceipt(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 transition-colors"
            >
              ×
            </button>

            <div className="border-b-2 border-slate-100 pb-3 text-center space-y-1">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-[inset_1px_1px_2px_white] mb-1">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-extrabold tracking-widest text-[#7C3AED] bg-[#EAE8FC] px-2.5 py-0.5 rounded-full">OFFICIAL RECEIPT</span>
              <h4 className="font-quicksand font-bold text-[#5B468C] text-sm mt-2">Pranidha International School</h4>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">Receipt No: {activeReceipt.receiptNumber}</p>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-y-2.5 border-b pb-3 text-slate-500 font-semibold">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Student Name</span>
                  <span className="text-slate-800 font-bold">{child?.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Class</span>
                  <span className="text-slate-800 font-bold">{child?.class}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Term</span>
                  <span className="text-slate-800 font-bold">{activeReceipt.feeId?.term || 'Tuition Fee Invoice'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Date Paid</span>
                  <span className="text-slate-800 font-bold">{new Date(activeReceipt.paymentDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-[#FAF9F5] border border-[#E9E5D9]/40 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-slate-600 font-bold">Amount Paid (Rupees)</span>
                <span className="text-xl font-extrabold text-emerald-600">₹{activeReceipt.amountPaid.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-slate-50 border p-3 rounded-2xl text-[10px] font-semibold text-slate-500 font-mono space-y-0.5">
                <p>Transaction ID: <span className="text-slate-800">{activeReceipt.transactionId}</span></p>
                <p>Payment Method: <span className="text-slate-800">{activeReceipt.paymentMethod}</span></p>
                <p>Status: <span className="text-emerald-600 uppercase font-bold">Cleared</span></p>
              </div>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 px-6 rounded-2xl bg-[#9F92EC] hover:bg-[#8C7EB5] text-white font-quicksand font-bold text-xs shadow transition-all active:scale-[0.98] cursor-pointer"
            >
              CLOSE RECEIPT
            </button>
          </div>
        </div>
      )}

      {activeResultCard && (
        <ResultCardModal
          activeResult={activeResultCard}
          onClose={() => setActiveResultCard(null)}
        />
      )}

      {/* Fee Payment Modal — Razorpay with Full/Installment choice */}
      {feePayModal && (
        <FeePayModal
          fee={feePayModal.fee}
          allFees={fees.filter(f => f.status !== 'paid')}
          studentName={child?.name || ''}
          onClose={() => setFeePayModal(null)}
          onSuccess={handleFeePaySuccess}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />
    </div>
  );
}
