import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Menu, X, LogOut, LayoutDashboard, LogIn, Sparkles, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowLogoutConfirm(false);
  };

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'ABOUT', path: '/about' },
    { name: 'COURSES', path: '/programs' },
    { name: 'LEARNING', path: '/lms' },
    { name: 'PRACTICE', path: '/practice' },
    { name: 'MEETINGS', path: '/meetings' },
    { name: 'GALLERY', path: '/gallery' },
    { name: 'CONTACT', path: '/contact' },
    { name: 'PAYMENT TEST', path: '/payment-demo' }
  ];

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/dashboard/admin';
    if (user.role === 'teacher') return '/dashboard/teacher';
    if (user.role === 'parent') return '/dashboard/parent';
    return '/lms/dashboard'; // 'user' role → student learning dashboard
  };

  return (
    <nav className={`sticky top-0 z-50 border-b px-4 py-3.5 backdrop-blur-2xl transition-colors duration-300 select-none print:hidden md:px-8 ${
      isDark
        ? 'border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] shadow-[0_12px_35px_rgba(2,6,23,0.65),0_0_0_1px_rgba(148,163,184,0.08)]'
        : 'border-orange-100 bg-white/85 shadow-[0_12px_35px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.06)]'
    }`}>
      <div className="relative flex items-center justify-between mx-auto max-w-7xl">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group">
         
          <div>
            <span className="text-[15px] font-extrabold font-quicksand block leading-none">
              <span className="text-[#E53935]">Apple</span>
              <span className="text-[#2E7D32]">Tree</span>
            </span>
            <p className="mt-[2px] text-[15px] font-black tracking-tight text-black dark:text-white leading-none">INFOTECH</p>
          </div>
        </Link>

        {/* Desktop Links (Clean list with sliding active underline) */}
        <div className="items-center hidden space-x-5 lg:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`font-quicksand font-extrabold text-xs tracking-wider relative py-1 transition-colors duration-200 hover:text-brandCoral ${isActive ? 'text-brandCoral' : isDark ? 'text-slate-200' : 'text-slate-600'
                  }`}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="activeUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-brandCoral to-brandSky"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA Buttons + Theme Toggle */}
        <div className="items-center hidden space-x-3 lg:flex">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all cursor-pointer ${
              isDark
                ? 'border-white/15 bg-white/10 text-amber-300 hover:bg-white/20'
                : 'border-orange-200 bg-brandCream text-slate-600 hover:bg-orange-100/40'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user ? (
            <>
              <Link
                to={getDashboardPath()}
                className={`flex items-center space-x-1.5 font-quicksand font-bold text-xs rounded-full border px-5 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                  isDark
                    ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100 shadow-[0_10px_24px_rgba(56,189,248,0.12)] hover:bg-cyan-400/20'
                    : 'border-brandSky/30 bg-brandSky/10 text-brandSky-dark shadow-sm hover:bg-brandSky/20'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>DASHBOARD</span>
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`flex items-center space-x-1.5 font-quicksand font-bold text-xs rounded-full border px-5 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                  isDark
                    ? 'border-rose-400/20 bg-rose-400/10 text-rose-100 shadow-[0_10px_24px_rgba(251,113,133,0.12)] hover:bg-rose-400/20'
                    : 'border-brandCoral/30 bg-brandCoral/10 text-brandCoral-dark shadow-sm hover:bg-brandCoral/20'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>LOGOUT</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`flex items-center space-x-1.5 font-quicksand font-bold text-xs rounded-full border px-5 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer text-center ${
                  isDark
                    ? 'border-indigo-400/20 bg-indigo-400/10 text-indigo-100 shadow-[0_10px_24px_rgba(129,140,248,0.12)] hover:bg-indigo-400/20'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm hover:bg-indigo-100'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>PORTAL LOGIN</span>
              </Link>
              <Link
                to="/contact"
                className={`font-quicksand font-bold text-xs rounded-full border px-5 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer flex items-center justify-center space-x-1.5 ${
                  isDark
                    ? 'border-amber-400/20 bg-amber-400/10 text-amber-100 shadow-[0_10px_24px_rgba(251,191,36,0.12)] hover:bg-amber-400/20'
                    : 'border-brandYellow bg-brandYellow/30 text-amber-800 shadow-sm hover:bg-brandYellow/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>ENROLL NOW →</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className={`p-2 transition-all border rounded-full outline-none cursor-pointer lg:hidden ${isDark ? 'text-slate-100 hover:bg-white/10 border-white/10 bg-white/5' : 'text-slate-700 hover:bg-slate-100 border-orange-200 bg-white'}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer (Clean Dropdown Panel) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`lg:hidden absolute top-full left-0 right-0 overflow-hidden z-40 ${
              isDark
                ? 'border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.99),rgba(15,23,42,0.98))] shadow-[0_20px_40px_rgba(2,6,23,0.65)]'
                : 'border-t border-orange-100 bg-white/95 shadow-[0_20px_40px_rgba(15,23,42,0.10)]'
            }`}
          >
            <div className="flex flex-col p-4 space-y-2.5">
              {/* Mobile theme toggle */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-between py-2 px-3 rounded-lg font-quicksand font-extrabold text-sm transition-all ${isDark ? 'bg-white/10 text-amber-200' : 'bg-brandCream text-slate-700'}`}
              >
                <span>{isDark ? 'LIGHT MODE' : 'DARK MODE'}</span>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`font-quicksand font-extrabold text-sm py-2 px-3 rounded-lg transition-all ${
                    location.pathname === link.path
                      ? (isDark ? 'text-cyan-200 bg-cyan-400/10' : 'text-brandCoral-dark bg-brandCoral/10')
                      : (isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <hr className={`my-1.5 ${isDark ? 'border-white/10' : 'border-orange-100'}`} />

              {user ? (
                <div className="flex flex-col space-y-2 pt-1.5">
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center space-x-2 font-quicksand font-bold text-sm rounded-xl bg-cyan-400/10 text-cyan-100 py-2.5 transition-all hover:bg-cyan-400/20"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>DASHBOARD</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex items-center justify-center space-x-2 font-quicksand font-bold text-sm rounded-xl bg-rose-400/10 text-rose-100 py-2.5 transition-all hover:bg-rose-400/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>LOGOUT</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 pt-1.5">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="font-quicksand font-bold text-sm text-center w-full rounded-xl bg-indigo-400/10 text-indigo-100 py-2.5 transition-all hover:bg-indigo-400/20"
                  >
                    PORTAL LOGIN
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setIsOpen(false)}
                    className="font-quicksand font-bold text-sm text-center w-full rounded-xl bg-amber-400/10 text-amber-100 py-2.5 transition-all hover:bg-amber-400/20"
                  >
                    BOOK A TOUR →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm to Logout"
        message="Are you sure you want to log out of your Appletree account?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        confirmText="Log Out"
        type="logout"
      />
    </nav>
  );
}



