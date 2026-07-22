import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Smile, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isDark } = useTheme();

  return (
    <footer className={`relative mt-16 border-t ${isDark
      ? 'border-white/10 bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] text-slate-300 shadow-[0_-18px_40px_rgba(15,23,42,0.45)]'
      : 'border-slate-200 bg-[linear-gradient(180deg,#F5EBE0_0%,#FFFFFF_45%,#FDFBF7_100%)] text-slate-600 shadow-[0_-18px_40px_rgba(224,204,190,0.15)]'
      } pt-16 pb-8 print:hidden`}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isDark ? 'via-cyan-400/50' : 'via-brandCoral/50'
        } to-transparent`} />
      <div className={`absolute left-0 right-0 top-0 h-24 ${isDark
        ? 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),transparent_35%)]'
        : 'bg-[radial-gradient(circle_at_top,_rgba(255,112,67,0.05),transparent_35%)]'
        }`} />

      <div className="grid grid-cols-1 gap-8 px-4 mx-auto max-w-7xl md:px-8 md:grid-cols-2 lg:grid-cols-4">

        {/* Info Column */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${isDark
              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-[0_8px_18px_rgba(14,165,233,0.18)]'
              : 'border-brandCoral/30 bg-brandCoral/10 text-brandCoral-dark shadow-[0_8px_18px_rgba(255,112,67,0.12)]'
              }`}>
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-lg  font-bold font-quicksand text-[#FF0000] ${isDark ? 'text-white' : 'text-slate-800'}`}>Apple </span>
              <span className={`text-lg   font-bold font-quicksand text-green-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Tree</span>

              <p className={`mt-[-2px] text-[15px] font-semibold tracking-wider ${isDark ? 'text-cyan-200' : 'text-brandCoral-dark'}`}>Infotech</p>
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Industry-focused dr. ravan coding education for students and professionals ready to grow in Java, MERN, C++, and frontend development.
          </p>
          {/* WhatsApp Chat Button */}
          <a
            href="https://wa.me/917503962162?text=Hello%20Appletree%20Coaching%20Centre%2C%20I%20have%20an%20inquiry."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-quicksand font-bold text-emerald-100 shadow-[0_10px_24px_rgba(16,185,129,0.18)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400/20"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-4">
          <h4 className={`inline-block pb-2 font-bold border-b text-md font-quicksand ${isDark ? 'text-white border-cyan-400/30' : 'text-slate-800 border-brandCoral/30'
            }`}>Quick Links</h4>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li><Link to="/" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Home</Link></li>
            <li><Link to="/about" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>About Us</Link></li>
            <li><Link to="/programs" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Programs</Link></li>
            <li><Link to="/practice" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Practice Hub</Link></li>
            <li><Link to="/contact" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Contact Desk</Link></li>
            <li><Link to="/facilities" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Facilities</Link></li>
            <li><Link to="/gallery" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Gallery</Link></li>
            <li><Link to="/calendar" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Calendar</Link></li>
            <li><Link to="/fees" className={`transition-colors ${isDark ? 'hover:text-cyan-200 text-slate-300' : 'hover:text-brandCoral text-slate-600'}`}>Pay Fees</Link></li>
          </ul>
        </div>

        {/* Contact Us Column */}
        <div className="space-y-4">
          <h4 className={`inline-block pb-2 font-bold border-b text-md font-quicksand ${isDark ? 'text-white border-cyan-400/30' : 'text-slate-800 border-brandCoral/30'
            }`}>Contact Us</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start space-x-2">
              <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? 'text-cyan-200' : 'text-brandCoral'}`} />
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>C-60 R.K tower 3rd Floor Rdc ghaziabad</span>
            </li>
            <li className="flex items-center space-x-2">
              <Phone className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-200' : 'text-brandCoral'}`} />
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>+91 7503962162</span>
            </li>
            <li className="flex items-center space-x-2">
              <Mail className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-200' : 'text-brandCoral'}`} />
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>hr@appletreeinfotech.in</span>
            </li>
          </ul>
        </div>

        {/* Newsletter / PWA Column */}
        <div className="space-y-4">
          <h4 className={`inline-block pb-2 font-bold border-b text-md font-quicksand ${isDark ? 'text-white border-cyan-400/30' : 'text-slate-800 border-brandCoral/30'
            }`}>Our Motto</h4>
          <p className={`text-sm italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            "Code. Build. Launch. Grow."
          </p>
          <div className="pt-2">
            <span className={`inline-block px-3 py-1 text-xs border rounded-full ${isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}>
              ✓ Accessibility Compliant
            </span>
          </div>
          <div>
            <span className={`inline-block px-3 py-1 mt-1 text-xs border rounded-full ${isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}>
              ✓ Progressive Web App (PWA)
            </span>
          </div>
        </div>

      </div>

      <hr className={`mx-auto my-8 max-w-7xl ${isDark ? 'border-white/10' : 'border-slate-200'}`} />

      {/* Copyright */}
      <div className={`flex flex-col items-center justify-between px-4 mx-auto space-y-2 text-xs max-w-7xl ${isDark ? 'text-slate-400' : 'text-slate-500'
        } md:flex-row md:px-8 md:space-y-0`}>
        <p>© {currentYear} Appletree Coaching Centre. All rights reserved.</p>
        <p className="flex items-center space-x-1">
          <span>Developed and design by Manish Kumar</span>
        </p>
      </div>
    </footer>
  );
}
