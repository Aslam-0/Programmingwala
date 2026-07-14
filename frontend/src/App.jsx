import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';

// Public Pages
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Admissions from './pages/Admissions.jsx';
import Programs from './pages/Programs.jsx';
import Facilities from './pages/Facilities.jsx';
import Gallery from './pages/Gallery.jsx';
import Calendar from './pages/Calendar.jsx';
import Meetings from './pages/Meetings.jsx';
import Fees from './pages/Fees.jsx';
import Brochure from './pages/Brochure.jsx';
import FeeStructurePage from './pages/FeeStructurePage.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Practice from './pages/Practice.jsx';
import RazorpayTestPage from './pages/RazorpayTestPage.jsx';

// LMS Pages
import LMS from './pages/LMS.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import LearningPage from './pages/LearningPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';

// Portal Dashboards
import ParentDashboard from './portals/ParentDashboard.jsx';
import TeacherDashboard from './portals/TeacherDashboard.jsx';
import AdminDashboard from './portals/AdminDashboard.jsx';

// Layout Components
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

// Private Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brandCream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce font-quicksand font-bold text-3xl text-brandCoral">🧸</div>
          <p className="mt-2 text-slate-500 font-quicksand font-medium">Entering School gates...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/dashboard/teacher" replace />;
    if (user.role === 'parent') return <Navigate to="/dashboard/parent" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppInner() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 400], [0, 24]);
  const glowX = useTransform(scrollY, [0, 400], [0, -18]);
  const { isDark } = useTheme();

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <AuthProvider>
      <Router>
        <div
          onMouseMove={handlePointerMove}
          className={`relative flex min-h-screen flex-col overflow-x-hidden transition-colors duration-300 ${
            isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-800'
          }`}
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 opacity-80"
            style={{
              background: isDark
                ? `radial-gradient(380px circle at ${pointer.x}px ${pointer.y}px, rgba(56, 189, 248, 0.14), transparent 35%), radial-gradient(420px circle at 85% 18%, rgba(99, 102, 241, 0.12), transparent 26%), linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.98))`
                : `radial-gradient(420px circle at ${pointer.x}px ${pointer.y}px, rgba(255, 112, 67, 0.10), transparent 35%), radial-gradient(460px circle at 85% 12%, rgba(79, 195, 247, 0.12), transparent 28%), linear-gradient(135deg, rgba(252, 251, 247, 0.96), rgba(243, 239, 233, 0.98))`
            }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed left-[8%] top-[12%] h-40 w-40 rounded-full bg-cyan-400/8 blur-3xl"
            style={{ y: glowY, x: glowX }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed bottom-[10%] right-[6%] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
            style={{ y: glowY, x: glowX }}
          />
          <Navbar />
          <main className="relative z-10 flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/admissions" element={<Navigate to="/" replace />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/facilities" element={<Facilities />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/fee-structure" element={<Navigate to="/fees" replace />} />
              <Route path="/brochure" element={<Brochure />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/payment-demo" element={<RazorpayTestPage />} />

              {/* LMS Routes */}
              <Route path="/lms" element={<LMS />} />
              <Route path="/lms/courses/:id" element={<CourseDetail />} />
              <Route path="/lms/learn/:id" element={<LearningPage />} />
              <Route 
                path="/lms/dashboard" 
                element={<StudentDashboard />}
              />

              {/* Protected Portal Dashboards */}
              <Route 
                path="/dashboard/parent" 
                element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/teacher" 
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
