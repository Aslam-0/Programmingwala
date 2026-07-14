import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { User, Lock, Eye, EyeOff, Mail, ArrowRight, Code2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ── Hanging Lamp SVG with pull-string theme toggle ── */
function HangingLamp({ isDark, onToggle }) {
  const [swing, setSwing] = useState(0);
  const [pulled, setPulled] = useState(false);

  const pull = () => {
    setPulled(true);
    setSwing(16);
    onToggle();
    setTimeout(() => setSwing(-9),  200);
    setTimeout(() => setSwing(4),   370);
    setTimeout(() => setSwing(-2),  500);
    setTimeout(() => { setSwing(0); setPulled(false); }, 620);
  };

  const wire   = isDark ? '#78716c' : '#d97706';
  const cap    = isDark ? '#292524' : '#b45309';
  const shade  = isDark ? '#44403c' : '#fef3c7';
  const bulb   = isDark ? '#57534e' : '#fde68a';
  const str    = isDark ? '#a8a29e' : '#92400e';
  const glow   = isDark ? 'none'    : 'drop-shadow(0 0 10px #fbbf24)';

  return (
    <div className="flex flex-col items-center cursor-pointer select-none group" onClick={pull}
         title={isDark ? 'Turn on light' : 'Turn off light'}>
      <motion.div animate={{ rotate: swing }} transition={{ type:'spring', stiffness:280, damping:14 }}
                  style={{ transformOrigin:'top center' }} className="flex flex-col items-center">
        {/* Wire */}
        <svg width="3" height="32"><line x1="1.5" y1="0" x2="1.5" y2="32" stroke={wire} strokeWidth="2" strokeLinecap="round"/></svg>
        {/* Lamp */}
        <svg width="68" height="56" viewBox="0 0 68 56">
          {!isDark && <ellipse cx="34" cy="50" rx="28" ry="10" fill="rgba(251,191,36,0.4)" filter="url(#gblur)"/>}
          <defs><filter id="gblur"><feGaussianBlur stdDeviation="4"/></filter></defs>
          <rect x="22" y="6" width="24" height="7" rx="3" fill={cap}/>
          <polygon points="8,46 24,10 44,10 60,46" fill={shade} stroke={cap} strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="20,42 28,14 40,14 50,42" fill="rgba(255,255,255,0.1)"/>
          <ellipse cx="34" cy="48" rx="6.5" ry="7" fill={bulb} style={{ filter: glow }}/>
          {!isDark && <ellipse cx="31" cy="44" rx="2.5" ry="3" fill="rgba(255,255,255,0.6)"/>}
        </svg>
      </motion.div>
      {/* String */}
      <motion.div animate={{ scaleY: pulled ? 0.82 : 1, y: pulled ? -3 : 0 }} transition={{ duration:0.14 }}
                  className="flex flex-col items-center">
        <svg width="2" height="26"><line x1="1" y1="0" x2="1" y2="20" stroke={str} strokeWidth="1.5" strokeDasharray="3 2"/></svg>
        <svg width="13" height="13"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke={str} strokeWidth="2"/></svg>
      </motion.div>
      <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5 opacity-60 group-hover:opacity-90 transition-opacity"
            style={{ color: str }}>
        {isDark ? 'Light on' : 'Light off'}
      </span>
    </div>
  );
}

/* ── Course tech badge — visible in both light and dark ── */
const TECH_BADGES = [
  { label: 'Java',  bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  { label: 'C++',   bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  { label: 'MERN',  bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  { label: 'React', bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
];

/* ── Main component ── */
export default function Login() {
  const { login, register, user, error, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [valErr, setValErr]         = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showDemo, setShowDemo]     = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin')   navigate('/dashboard/admin');
    else if (user.role === 'teacher') navigate('/dashboard/teacher');
    else if (user.role === 'parent')  navigate('/dashboard/parent');
    else navigate('/lms/dashboard');
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setValErr('');
    const res = await login(email, password);
    if (res.success) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      if (res.user.role === 'admin')        navigate('/dashboard/admin');
      else if (res.user.role === 'teacher') navigate('/dashboard/teacher');
      else if (res.user.role === 'parent')  navigate('/dashboard/parent');
      else navigate('/lms/dashboard');
    } else setValErr(res.message || 'Login failed. Check your credentials.');
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setValErr('');
    if (!name.trim())          { setValErr('Enter your full name'); return; }
    if (password.length < 6)   { setValErr('Password must be ≥ 6 chars'); return; }
    if (password !== confirm)  { setValErr('Passwords do not match'); return; }
    const res = await register(name, email, password, 'user');
    if (res.success) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      navigate('/lms/dashboard');
    } else setValErr(res.message || 'Registration failed.');
  };

  /* ── Colors ── */
  const pageBg   = isDark ? '#0f172a'              : '#f1f5f9';
  const cardBg   = isDark ? 'rgba(15,23,42,0.97)'  : '#ffffff';
  const cardBdr  = isDark ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.08)';
  const labelClr = isDark ? '#94a3b8'              : '#475569';
  const inputBg  = isDark ? 'rgba(2,6,23,0.55)'   : '#f8fafc';
  const inputClr = isDark ? '#f1f5f9'              : '#0f172a';
  const inputBdr = isDark ? 'rgba(255,255,255,0.1)': '#e2e8f0';
  const textClr  = isDark ? '#f1f5f9'              : '#0f172a';
  const mutedClr = isDark ? '#64748b'              : '#94a3b8';
  const accentA  = '#FF7043';
  const accentB  = '#f43f5e';

  const inp = {
    backgroundColor: inputBg, color: inputClr,
    border: `1.5px solid ${inputBdr}`, caretColor: accentA, transition: 'border-color .2s',
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-8 px-4 transition-colors duration-500 font-quicksand relative"
         style={{ background: pageBg }}>

      {/* ── Home button ── */}
      <Link to="/"
        className="absolute top-5 left-5 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 z-20"
        style={{ background: `linear-gradient(135deg,${accentA},${accentB})`, color:'#fff', boxShadow:`0 4px 14px rgba(255,112,67,0.4)` }}>
        <Home className="w-3.5 h-3.5"/> Back to Home
      </Link>

      {/* ── Card ── */}
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
           style={{ border:`1px solid ${cardBdr}`, background: cardBg }}>

        {/* ════ LEFT PANEL ════ */}
        <div className="relative hidden md:flex flex-col items-center justify-between py-10 px-8 md:w-[42%] overflow-hidden"
             style={{ background:`linear-gradient(150deg,${accentA} 0%,${accentB} 100%)` }}>

          {/* Geometric decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full" style={{ background:'rgba(255,255,255,0.15)' }}/>
            <div className="absolute -bottom-24 -right-12 w-80 h-80 rounded-full" style={{ background:'rgba(255,255,255,0.10)' }}/>
            <svg viewBox="0 0 200 450" className="absolute inset-0 w-full h-full opacity-15">
              <polygon points="-40,450 130,0 170,0 30,450" fill="white"/>
              <polygon points="50,450 220,0 260,0 90,450" fill="white"/>
            </svg>
          </div>

          {/* Logo */}
          <Link to="/" className="relative z-10 flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'rgba(255,255,255,0.25)' }}>
              <Code2 className="w-5 h-5 text-white"/>
            </div>
            <span className="text-white font-black text-lg tracking-widest">APPLETREE</span>
          </Link>

          {/* Tab switcher */}
          <div className="relative z-10 flex flex-col items-center gap-5 w-full">
            <div className="flex rounded-2xl overflow-hidden p-1" style={{ background:'rgba(255,255,255,0.2)' }}>
              {['LOGIN','SIGN UP'].map((t,i) => (
                <button key={t} onClick={() => { setIsRegister(i===1); setValErr(''); }}
                  className="px-6 py-2.5 text-sm font-black tracking-wider rounded-xl transition-all"
                  style={(!isRegister && i===0)||(isRegister && i===1)
                    ? { background:'#fff', color:'#111827', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }
                    : { background:'transparent', color:'rgba(255,255,255,0.85)' }}>
                  {t}
                </button>
              ))}
            </div>

            <p className="text-white/75 text-xs font-semibold text-center max-w-[190px] leading-relaxed">
              {isRegister ? 'Join thousands of students learning to code' : 'Welcome back to your learning dashboard'}
            </p>

            {/* Tech badges — colored so visible on ANY background */}
            <div className="flex flex-wrap gap-2 justify-center">
              {TECH_BADGES.map(({ label }) => (
                <span key={label}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full border"
                  style={{ background:'rgba(255,255,255,0.92)', color:'#1e293b', border:'1.5px solid rgba(255,255,255,0.6)' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 w-full">
            {[['500+','Students'],['95%','Placement'],['4.9★','Rating'],['50+','Projects']].map(([v,l]) => (
              <div key={l} className="rounded-2xl p-3 text-center" style={{ background:'rgba(255,255,255,0.18)' }}>
                <p className="text-white font-black text-base leading-none">{v}</p>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="flex-1 flex flex-col relative py-8 px-6 md:px-10 overflow-hidden"
             style={{ background: cardBg }}>

          {/* Lamp — top right */}
          <div className="absolute top-0 right-5 z-20">
            <HangingLamp isDark={isDark} onToggle={toggleTheme}/>
          </div>

          {/* Mobile logo + home */}
          <div className="flex md:hidden items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background:`linear-gradient(135deg,${accentA},${accentB})` }}>
                <Code2 className="w-4 h-4 text-white"/>
              </div>
              <span className="font-black text-base tracking-wider" style={{ color: accentA }}>APPLETREE</span>
            </div>
            <Link to="/" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background:`linear-gradient(135deg,${accentA},${accentB})`, color:'#fff' }}>
              <Home className="w-3 h-3"/> Home
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6 pr-14">
            <AnimatePresence mode="wait">
              <motion.div key={isRegister?'r':'l'}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-8 }} transition={{ duration:0.22 }}>
                <h2 className="text-2xl md:text-3xl font-black" style={{ color: textClr }}>
                  {isRegister ? 'Create Account' : 'Welcome Back!'}
                </h2>
                <p className="mt-1 text-xs font-semibold" style={{ color: mutedClr }}>
                  {isRegister ? 'Sign up to start your coding journey' : 'Log in to access your courses & dashboard'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error */}
          {(valErr || error) && (
            <div className="mb-4 p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2"
                 style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.25)', color:'#fb7185' }}>
              <span>⚠️</span><span>{valErr || error}</span>
            </div>
          )}

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form key={isRegister?'rf':'lf'}
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}
              onSubmit={isRegister ? handleRegister : handleLogin}
              className="space-y-4 text-xs font-bold">

              {isRegister && (
                <div>
                  <label className="block mb-1.5 uppercase tracking-wider" style={{ color:labelClr }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:mutedClr }}/>
                    <input type="text" required value={name} onChange={e=>setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                      style={inp}
                      onFocus={e=>e.target.style.borderColor=accentA}
                      onBlur={e=>e.target.style.borderColor=inputBdr}/>
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1.5 uppercase tracking-wider" style={{ color:labelClr }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:mutedClr }}/>
                  <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                    style={inp}
                    onFocus={e=>e.target.style.borderColor=accentA}
                    onBlur={e=>e.target.style.borderColor=inputBdr}/>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 uppercase tracking-wider" style={{ color:labelClr }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:mutedClr }}/>
                  <input type={showPw?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder={isRegister?'At least 6 characters':'••••••••'}
                    className="w-full pl-10 pr-10 py-3 rounded-xl outline-none text-sm font-semibold"
                    style={inp}
                    onFocus={e=>e.target.style.borderColor=accentA}
                    onBlur={e=>e.target.style.borderColor=inputBdr}/>
                  <button type="button" onClick={()=>setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:mutedClr }}>
                    {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block mb-1.5 uppercase tracking-wider" style={{ color:labelClr }}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:mutedClr }}/>
                    <input type={showPw?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-semibold"
                      style={inp}
                      onFocus={e=>e.target.style.borderColor=accentA}
                      onBlur={e=>e.target.style.borderColor=inputBdr}/>
                  </div>
                </div>
              )}

              {!isRegister && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer" style={{ color:mutedClr }}>
                    <input type="checkbox" className="accent-orange-500 w-3.5 h-3.5"/> Remember me
                  </label>
                  <button type="button" className="hover:underline font-bold" style={{ color:accentA }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 font-extrabold tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 text-white mt-1"
                style={{ background:`linear-gradient(135deg,${accentA},${accentB})`,
                         boxShadow:`0 8px 24px rgba(255,112,67,0.4)`,
                         opacity: loading ? 0.75 : 1 }}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      <span>{isRegister?'CREATING...':'LOGGING IN...'}</span></>
                  : <><span>{isRegister?'CREATE ACCOUNT':'LOGIN'}</span><ArrowRight className="w-4 h-4"/></>
                }
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Demo accounts */}
          {!isRegister && (
            <div className="mt-5 pt-4" style={{ borderTop:`1px solid ${inputBdr}` }}>
              <button type="button" onClick={()=>setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between text-[10px] font-black tracking-widest uppercase hover:underline"
                style={{ color:accentA }}>
                <span>Demo Accounts</span><span>{showDemo?'▲':'▼'}</span>
              </button>
              {showDemo && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[['🏢','Admin','admin@pranidha.edu','admin123'],
                    ['👩‍🏫','Teacher','teacher@pranidha.edu','teacher123'],
                    ['🧸','Parent','parent@pranidha.edu','parent123']
                  ].map(([icon,label,em,pw]) => (
                    <button key={label} type="button"
                      onClick={()=>{ setEmail(em); setPassword(pw); }}
                      className="p-2.5 rounded-xl text-center font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background:inputBg, border:`1.5px solid ${inputBdr}`, color:textClr }}>
                      <span className="block text-xl mb-0.5">{icon}</span>
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Switch login/register */}
          <p className="mt-5 text-center text-xs font-semibold" style={{ color:mutedClr }}>
            {isRegister ? 'Already have an account? ' : 'New to Appletree? '}
            <button onClick={()=>{ setIsRegister(!isRegister); setValErr(''); }}
              className="font-black hover:underline" style={{ color:accentA }}>
              {isRegister ? 'Log In' : 'Sign Up Free'}
            </button>
          </p>

          {/* Mobile — tech badges */}
          <div className="flex md:hidden flex-wrap gap-2 justify-center mt-5">
            {TECH_BADGES.map(({ label, bg, text, border }) => (
              <span key={label} className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background:bg, color:text, border:`1.5px solid ${border}` }}>
                {label}
              </span>
            ))}
          </div>

        </div>{/* end right panel */}
      </div>{/* end card */}
    </div>
  );
}
