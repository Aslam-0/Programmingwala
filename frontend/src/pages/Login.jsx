import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { User, Lock, Eye, EyeOff, Mail, ArrowRight, Code2, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ─────────────────────────────────────────────
   Animated Hanging Lamp SVG
   Pull string toggles light/dark mode.
   Shows a glow halo when light-mode is active.
───────────────────────────────────────────── */
function HangingLamp({ isDark, onToggle }) {
  const [pulled, setPulled] = useState(false);
  const [swing, setSwing] = useState(0); // string swing angle

  const handlePull = () => {
    setPulled(true);
    setSwing(18);
    onToggle();
    setTimeout(() => { setSwing(-10); }, 180);
    setTimeout(() => { setSwing(5);  }, 320);
    setTimeout(() => { setSwing(-3); }, 450);
    setTimeout(() => { setSwing(0); setPulled(false); }, 580);
  };

  const lampColor = isDark ? '#374151' : '#fef3c7';
  const capColor  = isDark ? '#1f2937' : '#d97706';
  const bulbColor = isDark ? '#6b7280' : '#fde68a';
  const glowColor = isDark ? 'transparent' : 'rgba(253,230,138,0.55)';
  const wireColor = isDark ? '#6b7280' : '#d97706';
  const stringColor = isDark ? '#9ca3af' : '#92400e';

  return (
    <div
      className="flex flex-col items-center cursor-pointer select-none"
      onClick={handlePull}
      title={isDark ? 'Click to turn on light' : 'Click to turn off light'}
    >
      {/* Wire from ceiling */}
      <motion.div
        animate={{ rotate: swing }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
        style={{ transformOrigin: 'top center' }}
        className="flex flex-col items-center"
      >
        {/* Ceiling wire */}
        <svg width="4" height="36" viewBox="0 0 4 36">
          <line x1="2" y1="0" x2="2" y2="36" stroke={wireColor} strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Lamp body */}
        <svg width="72" height="60" viewBox="0 0 72 60">
          {/* Glow halo (light mode only) */}
          {!isDark && (
            <ellipse cx="36" cy="52" rx="30" ry="12"
              fill={glowColor}
              filter="url(#blur)" />
          )}
          <defs>
            <filter id="blur"><feGaussianBlur stdDeviation="4" /></filter>
          </defs>

          {/* Lamp shade */}
          <polygon points="10,48 28,12 44,12 62,48"
            fill={lampColor}
            stroke={capColor}
            strokeWidth="1.5"
            strokeLinejoin="round" />

          {/* Shade highlight */}
          <polygon points="22,44 30,16 38,16 50,44"
            fill="rgba(255,255,255,0.08)" />

          {/* Cap on top */}
          <rect x="24" y="8" width="24" height="8" rx="3"
            fill={capColor} />

          {/* Bulb */}
          <ellipse cx="36" cy="50" rx="7" ry="8"
            fill={bulbColor}
            style={{ filter: isDark ? 'none' : 'drop-shadow(0 0 8px #fde68a)' }} />

          {/* Bulb shine */}
          {!isDark && (
            <ellipse cx="33" cy="46" rx="2.5" ry="3"
              fill="rgba(255,255,255,0.55)" />
          )}
        </svg>
      </motion.div>

      {/* Pull string */}
      <motion.div
        animate={{ scaleY: pulled ? 0.85 : 1, y: pulled ? -4 : 0 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center"
      >
        <svg width="2" height="28" viewBox="0 0 2 28">
          <line x1="1" y1="0" x2="1" y2="22"
            stroke={stringColor} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
        </svg>
        {/* Ring pull */}
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5"
            fill="none" stroke={stringColor} strokeWidth="2" />
        </svg>
      </motion.div>

      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest opacity-50"
         style={{ color: isDark ? '#9ca3af' : '#92400e' }}>
        {isDark ? 'Pull for light' : 'Pull for dark'}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Login / Register Page
───────────────────────────────────────────── */
export default function Login() {
  const { login, register, user, error, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/dashboard/admin');
      else if (user.role === 'teacher') navigate('/dashboard/teacher');
      else if (user.role === 'parent') navigate('/dashboard/parent');
      else navigate('/lms/dashboard');
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    const res = await login(email, password);
    if (res.success) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      if (res.user.role === 'admin') navigate('/dashboard/admin');
      else if (res.user.role === 'teacher') navigate('/dashboard/teacher');
      else if (res.user.role === 'parent') navigate('/dashboard/parent');
      else navigate('/lms/dashboard');
    } else {
      setValidationError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    if (!name.trim())   { setValidationError('Please enter your full name'); return; }
    if (!email.trim())  { setValidationError('Please enter your email'); return; }
    if (password.length < 6) { setValidationError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setValidationError('Passwords do not match'); return; }
    const res = await register(name, email, password, 'user');
    if (res.success) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      navigate('/lms/dashboard');
    } else {
      setValidationError(res.message || 'Registration failed. Email might already be in use.');
    }
  };

  /* ── Theme-aware colors ── */
  const bg        = isDark ? '#0f172a' : '#faf5ff';
  const panelBg   = isDark ? 'rgba(15,23,42,0.96)' : '#ffffff';
  const panelBdr  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const labelClr  = isDark ? '#94a3b8' : '#64748b';
  const inputBg   = isDark ? 'rgba(2,6,23,0.5)' : '#f8fafc';
  const inputClr  = isDark ? '#f1f5f9' : '#0f172a';
  const inputBdr  = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textClr   = isDark ? '#f1f5f9' : '#0f172a';
  const mutedClr  = isDark ? '#64748b' : '#94a3b8';

  /* Accent: coral gradient matching the design */
  const accentA = '#FF7043';
  const accentB = '#f43f5e';

  const inputBase = {
    backgroundColor: inputBg,
    color: inputClr,
    borderColor: inputBdr,
    border: '1.5px solid',
    caretColor: accentA,
    transition: 'border-color 0.2s',
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center py-8 px-4 transition-colors duration-500 font-quicksand"
      style={{ background: bg }}
    >
      {/* ── Main card ── */}
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        style={{ border: `1px solid ${panelBdr}`, background: panelBg }}
      >

        {/* ══════ LEFT PANEL — decorative ══════ */}
        <div
          className="relative hidden md:flex flex-col items-center justify-between py-10 px-8 md:w-2/5 overflow-hidden"
          style={{ background: `linear-gradient(145deg, ${accentA}, ${accentB})` }}
        >
          {/* Geometric shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20"
                 style={{ background: 'rgba(255,255,255,0.3)' }} />
            <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full opacity-15"
                 style={{ background: 'rgba(255,255,255,0.3)' }} />
            {/* Diagonal slashes like in the design */}
            <div className="absolute top-0 left-0 w-full h-full">
              <svg viewBox="0 0 200 400" className="w-full h-full opacity-20">
                <polygon points="-40,400 120,0 160,0 20,400" fill="white" />
                <polygon points="60,400 220,0 260,0 100,400" fill="white" />
              </svg>
            </div>
          </div>

          {/* Top: App logo */}
          <Link to="/" className="relative z-10 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-black text-lg tracking-wider">APPLETREE</span>
          </Link>

          {/* Center: Tab switcher */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* Active tab pill */}
            <div className="flex rounded-2xl overflow-hidden border-2 border-white/30">
              <button
                onClick={() => { setIsRegister(false); setValidationError(''); }}
                className={`px-6 py-2.5 text-sm font-black tracking-wider transition-all ${
                  !isRegister ? 'bg-white text-gray-800' : 'bg-transparent text-white'
                }`}
              >
                LOGIN
              </button>
              <button
                onClick={() => { setIsRegister(true); setValidationError(''); }}
                className={`px-6 py-2.5 text-sm font-black tracking-wider transition-all ${
                  isRegister ? 'bg-white text-gray-800' : 'bg-transparent text-white'
                }`}
              >
                SIGN UP
              </button>
            </div>

            <p className="text-white/70 text-xs font-semibold text-center max-w-[180px] leading-relaxed">
              {isRegister
                ? 'Join thousands of students learning Java, C++ & MERN'
                : 'Welcome back to your learning dashboard'}
            </p>

            {/* Mini course badges */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Java', 'C++', 'MERN', 'React'].map(c => (
                <span key={c} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom: Stats */}
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full">
            {[['500+','Students'],['95%','Placement'],['4.9★','Rating'],['50+','Projects']].map(([v,l]) => (
              <div key={l} className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-white font-black text-base">{v}</p>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════ RIGHT PANEL — form ══════ */}
        <div className="flex-1 flex flex-col relative py-8 px-6 md:px-10">

          {/* Lamp toggle — top right */}
          <div className="absolute top-0 right-6 z-20">
            <HangingLamp isDark={isDark} onToggle={toggleTheme} />
          </div>

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})` }}>
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base tracking-wider" style={{ color: accentA }}>APPLETREE</span>
          </div>

          {/* Header */}
          <div className="mb-7 pr-14">
            <AnimatePresence mode="wait">
              <motion.div key={isRegister ? 'reg' : 'log'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}>
                <h2 className="text-2xl md:text-3xl font-black" style={{ color: textClr }}>
                  {isRegister ? 'Create Account' : 'Welcome Back!'}
                </h2>
                <p className="mt-1 text-xs font-semibold" style={{ color: mutedClr }}>
                  {isRegister
                    ? 'Sign up to start your learning journey'
                    : 'Log in to access your courses & dashboard'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error */}
          {(validationError || error) && (
            <div className="mb-5 p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2"
                 style={{ backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}>
              <span>⚠️</span>
              <span>{validationError || error}</span>
            </div>
          )}

          {/* ── FORM ── */}
          <AnimatePresence mode="wait">
            <motion.div key={isRegister ? 'regform' : 'logform'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}>

              <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit}
                    className="space-y-4 text-xs font-bold">

                {isRegister && (
                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider" style={{ color: labelClr }}>Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedClr }} />
                      <input type="text" required value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                        style={inputBase}
                        onFocus={e => e.target.style.borderColor = accentA}
                        onBlur={e => e.target.style.borderColor = inputBdr}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 uppercase tracking-wider" style={{ color: labelClr }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedClr }} />
                    <input type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = accentA}
                      onBlur={e => e.target.style.borderColor = inputBdr}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 uppercase tracking-wider" style={{ color: labelClr }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedClr }} />
                    <input type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isRegister ? 'At least 6 characters' : '••••••••'}
                      className="w-full pl-10 pr-10 py-3 rounded-xl outline-none text-sm font-semibold"
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = accentA}
                      onBlur={e => e.target.style.borderColor = inputBdr}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: mutedClr }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider" style={{ color: labelClr }}>Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedClr }} />
                      <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                        style={inputBase}
                        onFocus={e => e.target.style.borderColor = accentA}
                        onBlur={e => e.target.style.borderColor = inputBdr}
                      />
                    </div>
                  </div>
                )}

                {/* Forgot password row (login only) */}
                {!isRegister && (
                  <div className="flex items-center justify-between pt-1">
                    <span style={{ color: mutedClr }}>Remember me</span>
                    <button type="button" className="hover:underline" style={{ color: accentA }}>
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 font-extrabold tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-white mt-2"
                  style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})`,
                           boxShadow: `0 8px 24px rgba(255,112,67,0.35)` }}
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isRegister ? 'CREATING...' : 'LOGGING IN...'}</span></>
                  ) : (
                    <><span>{isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}</span>
                      <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Demo accounts (login only) */}
          {!isRegister && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${inputBdr}` }}>
              <button type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full flex items-center justify-between text-[10px] font-black tracking-widest uppercase hover:underline"
                style={{ color: accentA }}>
                <span>Demo Accounts</span>
                <span>{showCredentials ? '▲' : '▼'}</span>
              </button>
              {showCredentials && (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[
                    ['🏢','Admin','admin@pranidha.edu','admin123'],
                    ['👩‍🏫','Teacher','teacher@pranidha.edu','teacher123'],
                    ['🧸','Parent','parent@pranidha.edu','parent123'],
                  ].map(([icon,label,em,pw]) => (
                    <button key={label} type="button"
                      onClick={() => { setEmail(em); setPassword(pw); }}
                      className="p-2 rounded-xl text-center text-[10px] font-bold transition-all hover:scale-105"
                      style={{ background: inputBg, border: `1.5px solid ${inputBdr}`, color: textClr }}>
                      <span className="block text-base mb-0.5">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Switch login/register */}
          <p className="mt-6 text-center text-xs font-semibold" style={{ color: mutedClr }}>
            {isRegister ? 'Already have an account? ' : 'New to Appletree? '}
            <button
              onClick={() => { setIsRegister(!isRegister); setValidationError(''); }}
              className="font-black hover:underline"
              style={{ color: accentA }}>
              {isRegister ? 'Log In' : 'Sign Up Free'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
