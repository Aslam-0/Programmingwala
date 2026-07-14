import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle,
  FileText,
  Download,
  MessageSquare,
  Bookmark,
  Share2,
  Menu,
  X,
  Clock,
  Award,
  Star,
  Lock,
  LogIn,
  Play,
  ArrowLeft
} from 'lucide-react';
import VideoPlayer from '../components/lms/VideoPlayer';
import ModuleList from '../components/lms/ModuleList';
import NoteSection from '../components/lms/NoteSection';
import ResourceCard from '../components/lms/ResourceCard';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const LearningPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isDark } = useTheme();

  // State
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Flattened list of all lessons for navigation (prev/next)
  const [allLessons, setAllLessons] = useState([]);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(-1);

  // Load Course and Enrollment details
  useEffect(() => {
    fetchLearningDetails();
  }, [id]);

  const fetchLearningDetails = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('token');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

      // 1. Fetch Course details
      const courseResponse = await fetch(`/api/lms/courses/${id}`, { headers });
      const courseData = await courseResponse.json();

      if (courseData.success) {
        setCourse(courseData.data);
        setEnrollment(courseData.data.enrollment);

        const hasEnrollment = !!courseData.data.enrollment;
        const isAdmin = user && user.role === 'admin';
        const isFree = !courseData.data.price || Number(courseData.data.price) <= 0;

        // Fetch modules when: enrolled, admin, OR free course (open access)
        if (hasEnrollment || isAdmin || isFree) {
          // Auto-enroll silently for free courses so progress tracking works
          if (isFree && !hasEnrollment && user) {
            try {
              await fetch(`/api/lms/courses/${id}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
              });
              // Re-fetch to get the new enrollment object
              const refreshRes = await fetch(`/api/lms/courses/${id}`, { headers });
              const refreshData = await refreshRes.json();
              if (refreshData.success) setEnrollment(refreshData.data.enrollment);
            } catch (e) {
              // Swallow
            }
          }

          // Fetch course modules & lessons
          const modulesResponse = await fetch(`/api/lms/courses/${id}/modules`, { headers });
          const modulesData = await modulesResponse.json();

          if (modulesData.success) {
            setModules(modulesData.data);
            if (modulesData.data.length > 0 && 
                modulesData.data[0].lessons && 
                modulesData.data[0].lessons.length > 0) {
              setSelectedLesson(modulesData.data[0].lessons[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading lms workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten lessons whenever modules change
  useEffect(() => {
    const list = [];
    modules.forEach(mod => {
      if (mod.lessons && Array.isArray(mod.lessons)) {
        list.push(...mod.lessons);
      }
    });
    setAllLessons(list);
  }, [modules]);

  // Track current index of the selected lesson
  useEffect(() => {
    if (selectedLesson && allLessons.length > 0) {
      const idx = allLessons.findIndex(l => l._id === selectedLesson._id);
      setCurrentLessonIdx(idx);
    }
  }, [selectedLesson, allLessons]);

  const handleLessonSelect = (lesson) => {
    setSelectedLesson(lesson);
    setSidebarOpen(false);
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson || !enrollment) return;
    const authToken = token || localStorage.getItem('token');

    try {
      const res = await fetch(`/api/lms/lessons/${selectedLesson._id}/progress`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      const data = await res.json();
      if (data.success) {
        // Update local enrollment state
        setEnrollment(prev => ({
          ...prev,
          completedLessons: data.data.completedLessons
        }));
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleProgressUpdate = async ({ percentage }) => {
    // Silently mark lesson complete if user watches > 90% of the duration
    if (percentage > 90 && enrollment && selectedLesson) {
      const isCompleted = enrollment.completedLessons?.includes(selectedLesson._id);
      if (!isCompleted) {
        handleMarkComplete();
      }
    }
  };

  const handleVideoEnd = () => {
    // Go to next lesson automatically on end
    if (currentLessonIdx !== -1 && currentLessonIdx < allLessons.length - 1) {
      handleLessonSelect(allLessons[currentLessonIdx + 1]);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-quicksand ${
        isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-800'
      }`}>
        <div className="text-center space-y-3">
          <div className="animate-spin text-brandCoral text-3xl">⏳</div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">Entering LMS classroom...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-quicksand ${
        isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-800'
      }`}>
        <div className="text-center space-y-4 max-w-sm p-8 border rounded-3xl bg-white/5 border-white/10">
          <p className="text-sm font-bold text-rose-500">Course not found.</p>
          <Link to="/lms" className="inline-block px-5 py-2.5 rounded-full bg-brandCoral text-white font-extrabold text-xs">
            BACK TO COURSES
          </Link>
        </div>
      </div>
    );
  }

  const isFree = !course.price || Number(course.price) <= 0;
  const isAdmin = user && user.role === 'admin';
  const hasAccess = !!enrollment || isFree || isAdmin;

  // ── ACCESS RESTRICTION LOCK VIEW ──
  if (!hasAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 font-quicksand ${
        isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-800'
      }`}>
        <div className={`w-full max-w-md p-8 text-center rounded-3xl border ${
          isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-orange-100/50 shadow-lg'
        }`}>
          <div className="w-16 h-16 bg-brandCoral/10 text-brandCoral rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">{course.title}</h2>
          <p className={`text-xs font-semibold mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            This is a locked paid course. Please enroll or purchase access to start watching lessons.
          </p>
          <p className="text-2xl font-black text-brandCoral mb-6">₹{course.price}</p>
          
          <Link
            to={`/lms/courses/${id}`}
            className="w-full py-3.5 bg-brandCoral hover:bg-orange-600 text-white font-extrabold text-xs tracking-wider rounded-2xl transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center"
          >
            Go to Course Page to Enroll
          </Link>
          <Link to="/lms" className="block mt-4 text-xs font-bold text-slate-400 hover:text-brandCoral">
            ← Browse Other Courses
          </Link>
        </div>
      </div>
    );
  }

  const isLessonCompleted = enrollment?.completedLessons?.includes(selectedLesson?._id);
  const totalLessons = allLessons.length;
  const completedLessons = enrollment?.completedLessons?.length || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const prevLesson = currentLessonIdx > 0 ? allLessons[currentLessonIdx - 1] : null;
  const nextLesson = currentLessonIdx < allLessons.length - 1 ? allLessons[currentLessonIdx + 1] : null;

  return (
    <div className={`min-h-screen font-quicksand pb-24 transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-brandCream text-slate-850'
    }`}>
      
      {/* 1. LMS HEADER BAR */}
      <div className={`border-b sticky top-0 z-30 backdrop-blur-md ${
        isDark ? 'bg-slate-950/80 border-white/5' : 'bg-white/85 border-orange-100/30 shadow-sm'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={`/lms/courses/${id}`}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
                title="Back to Course Details"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              
              <div>
                <h1 className="text-sm md:text-base font-black text-slate-800 dark:text-white line-clamp-1">
                  {course.title}
                </h1>
                <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  <span>Class Workspace</span>
                  <span className="mx-2">•</span>
                  <span>{progress}% Completed ({completedLessons} of {totalLessons} lessons)</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`lg:hidden p-2 rounded-xl transition-all ${
                  isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SPLIT CLASSROOM INTERFACE */}
      <div className="container mx-auto px-6 max-w-6xl mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* SIDEBAR: ACCORDION MODULES LIST */}
          <div className={`
            lg:col-span-1 border rounded-3xl p-6 transition-all duration-300
            ${isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-orange-100/50 shadow-sm'}
            fixed lg:static inset-y-0 left-0 z-40 w-85 max-w-[90vw] lg:w-auto
            transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            lg:max-h-[80vh] overflow-y-auto mt-[74px] lg:mt-0
          `}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Course Index</h2>
              {sidebarOpen && (
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/10 rounded-full">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Overall Progress Tracker */}
            <div className="mb-6 p-4 rounded-2xl bg-brandCoral/5 border border-brandCoral/10">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Learning Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brandCoral transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Modules / Lessons List component */}
            <ModuleList
              modules={modules}
              selectedLesson={selectedLesson}
              onLessonSelect={handleLessonSelect}
              enrollment={enrollment}
              isFree={isFree}
              isAdmin={isAdmin}
            />
          </div>

          {/* MAIN COLUMN: VIDEO PLAYER & LESSON CONTENT */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Player Container */}
            <div className={`border rounded-3xl overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-orange-100/50 shadow-sm'
            }`}>
              {selectedLesson ? (
                <>
                  <VideoPlayer
                    videoUrl={selectedLesson.videoUrl}
                    title={selectedLesson.title}
                    onProgressUpdate={handleProgressUpdate}
                    onVideoEnd={handleVideoEnd}
                    lessonId={selectedLesson._id}
                    autoPlayNext={true}
                  />
                  
                  {/* Lesson Metadata and Actions */}
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
                      <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">
                          {selectedLesson.title}
                        </h2>
                        <p className={`text-xs font-semibold mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {selectedLesson.description || 'Watch the lecture presentation video carefully. Take down notes and use downloadable resources below.'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2.5 shrink-0">
                        <button
                          onClick={() => setShowNotes(!showNotes)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center transition-all ${
                            showNotes
                              ? 'bg-brandCoral text-white shadow-md'
                              : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          <span>{showNotes ? 'Hide Notes' : 'Open Notes'}</span>
                        </button>
                        
                        <button
                          onClick={handleMarkComplete}
                          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center transition-all ${
                            isLessonCompleted
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          <CheckCircle className={`w-4 h-4 mr-2 ${isLessonCompleted ? 'fill-emerald-500/20' : ''}`} />
                          <span>{isLessonCompleted ? 'Completed' : 'Mark Complete'}</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Lesson Content markdown */}
                    {selectedLesson.content && (
                      <div className={`prose max-w-none text-xs font-semibold leading-relaxed ${isDark ? 'prose-invert text-slate-300' : 'text-slate-650'}`}>
                        <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-16 text-center space-y-4">
                  <BookOpen className="w-16 h-16 text-slate-400 mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                      Select a Lesson
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      Choose a module block from the sidebar playlist to begin learning
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section popup */}
            {showNotes && selectedLesson && (
              <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
                isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-orange-100/50 shadow-sm'
              }`}>
                <NoteSection
                  lessonId={selectedLesson._id}
                  courseId={course._id}
                />
              </div>
            )}

            {/* Downloadable Resources Cards */}
            <div className={`p-6 md:p-8 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-orange-100/50 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Lesson Materials
                </h3>
                <button className="text-xs font-black text-brandCoral flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  <span>DOWNLOAD ALL (.ZIP)</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResourceCard
                  icon={<FileText className="w-4 h-4" />}
                  title="Lesson Notes PDF"
                  type="PDF"
                  size="2.1 MB"
                />
                
                <ResourceCard
                  icon={<FileText className="w-4 h-4" />}
                  title="Practice Worksheets"
                  type="PDF"
                  size="3.4 MB"
                />
                
                <ResourceCard
                  icon={<FileText className="w-4 h-4" />}
                  title="Reference Guide"
                  type="PDF"
                  size="1.8 MB"
                />
                
                <ResourceCard
                  icon={<Download className="w-4 h-4" />}
                  title="Activity Templates"
                  type="ZIP"
                  size="12.5 MB"
                />
              </div>
            </div>

            {/* Lesson Navigation footer controls */}
            <div className="flex justify-between items-center pt-4">
              {prevLesson ? (
                <button
                  onClick={() => handleLessonSelect(prevLesson)}
                  className={`flex items-center px-5 py-3 rounded-2xl text-xs font-black transition-all ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 border border-orange-100/50 shadow-sm'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  <span>PREVIOUS LESSON</span>
                </button>
              ) : (
                <div />
              )}
              
              {nextLesson ? (
                <button
                  onClick={() => handleLessonSelect(nextLesson)}
                  className="flex items-center px-5 py-3 bg-brandCoral hover:bg-orange-600 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20"
                >
                  <span>NEXT LESSON</span>
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <Link
                  to={`/lms/courses/${id}`}
                  className={`flex items-center px-5 py-3 rounded-2xl text-xs font-black transition-all ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 border border-orange-100/50 shadow-sm'
                  }`}
                >
                  <span>GO TO HOME DETAILS</span>
                </Link>
              )}
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};

export default LearningPage;