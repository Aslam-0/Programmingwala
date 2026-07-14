import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ClipboardList, Users, CreditCard, Bell, Image as ImageIcon, MessageCircle, CheckCircle, XCircle, Trash2, Plus, Clock, Search, FileText, Printer, Edit, Download, Contact, X, Sparkles, BookOpen, Video, Wallet, Eye, EyeOff, Upload, AlertCircle, ChevronDown, ChevronUp, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal.jsx';
import FeeStructureMaster from '../components/FeeStructureMaster.jsx';
import AdmissionPaymentModal from '../components/AdmissionPaymentModal.jsx';
import CollectPaymentModal from '../components/CollectPaymentModal.jsx';

const COURSE_OPTIONS = ['Java Development', 'MERN Developer', 'Python Developer', 'Frontend Developer'];

function AttachmentManager({ attachments = [], onAdd, onDelete }) {
  const [uploading, setUploading] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('materialFile', file);
      const res = await fetch('/api/admin/upload-material', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        onAdd(data.data);
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2 border border-slate-200/60 p-3 rounded-2xl bg-white text-slate-800">
      <div className="flex items-center justify-between">
        <label className="font-bold text-[10px] text-slate-600 uppercase tracking-wider">Materials / PDFs</label>
        <label className="text-[10px] font-black text-brandSky cursor-pointer hover:underline flex items-center gap-1">
          <Upload className="w-3.5 h-3.5" />
          <span>{uploading ? 'UPLOADING...' : 'UPLOAD'}</span>
          <input type="file" accept=".pdf,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic">No attachments.</p>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold truncate text-slate-700" title={att.name}>{att.name}</span>
                <span className="text-slate-400 shrink-0">({formatSize(att.size)})</span>
              </div>
              <button type="button" onClick={() => onDelete(idx)} className="text-red-500 hover:text-red-700 p-0.5 shrink-0 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);

  // Dynamic lists
  const [admissions, setAdmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [fees, setFees] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Remarks for approval reviews
  const [remarks, setRemarks] = useState('');

  // Subtabs configuration
  const [admissionsSubTab, setAdmissionsSubTab] = useState('review');
  const [usersSubTab, setUsersSubTab] = useState('registry');

  // Form states for New Admission Entry
  const [admStdName, setAdmStdName] = useState('');
  const [admStdDob, setAdmStdDob] = useState('');
  const [admStdGender, setAdmStdGender] = useState('Male');
  const [admStdClass, setAdmStdClass] = useState(COURSE_OPTIONS[0]);
  const [admParentFather, setAdmParentFather] = useState('');
  const [admParentMother, setAdmParentMother] = useState('');
  const [admParentEmail, setAdmParentEmail] = useState('');
  const [admParentPhone, setAdmParentPhone] = useState('');
  const [admParentAddress, setAdmParentAddress] = useState('');
  const [admParentPassword, setAdmParentPassword] = useState('');
  const [admBirthCertificate, setAdmBirthCertificate] = useState(null);
  const [admPhoto, setAdmPhoto] = useState(null);

  // New document fields
  const [admReportCard, setAdmReportCard] = useState(null);
  const [admTransferCertificate, setAdmTransferCertificate] = useState(null);
  const [admAadhaarCard, setAdmAadhaarCard] = useState(null);
  const [admFatherAadhaarCard, setAdmFatherAadhaarCard] = useState(null);
  const [admMotherAadhaarCard, setAdmMotherAadhaarCard] = useState(null);
  const [admAddressProofType, setAdmAddressProofType] = useState('Aadhaar Card');
  const [admAddressProof, setAdmAddressProof] = useState(null);
  const [admissionFee, setAdmissionFee] = useState('');

  // Admission payment modal (Cash / UPI → auto-saves student on verified payment)
  const [admissionPaymentOpen, setAdmissionPaymentOpen] = useState(false);
  const [collectPaymentOpen, setCollectPaymentOpen] = useState(false);
  const [selectedCollectFee, setSelectedCollectFee] = useState(null);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [activeIdCard, setActiveIdCard] = useState(null);
  const [idPhotoError, setIdPhotoError] = useState(false);

  // Form states for Direct Student Registration
  const [regStdName, setRegStdName] = useState('');
  const [regStdDob, setRegStdDob] = useState('');
  const [regStdGender, setRegStdGender] = useState('Male');
  const [regStdClass, setRegStdClass] = useState(COURSE_OPTIONS[0]);
  const [regParentName, setRegParentName] = useState('');
  const [regParentEmail, setRegParentEmail] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regParentAddress, setRegParentAddress] = useState('');
  const [regParentPassword, setRegParentPassword] = useState('');

  // Search & Filtering for Student Registry
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // Modal control states
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form states for Editing Student
  const [editStdName, setEditStdName] = useState('');
  const [editStdDob, setEditStdDob] = useState('');
  const [editStdGender, setEditStdGender] = useState('Male');
  const [editStdClass, setEditStdClass] = useState(COURSE_OPTIONS[0]);
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editParentAddress, setEditParentAddress] = useState('');

  // Creation forms inputs states
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tQual, setTQual] = useState('');
  const [tClass, setTClass] = useState(COURSE_OPTIONS[0]);

  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [parentPassword, setParentPassword] = useState('');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'submit',
    onConfirm: () => { }
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

  const [feeStdId, setFeeStdId] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('');
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [feeTerm, setFeeTerm] = useState('Month 1 Installment');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');
  const [listFeeStatusFilter, setListFeeStatusFilter] = useState('all');
  const [listFeeClassFilter, setListFeeClassFilter] = useState('');
  const [listFeeSearchName, setListFeeSearchName] = useState('');

  const [feesSubTab, setFeesSubTab] = useState('billing');
  const [fineRules, setFineRules] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeFormBreakdown, setFeeFormBreakdown] = useState(null);

  // Fine Rules CRUD states
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [editingFineId, setEditingFineId] = useState(null);
  const [fineFormData, setFineFormData] = useState({
    minDays: 1,
    maxDays: 10,
    fineAmount: 50
  });

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCat, setAnnCat] = useState('general');
  const [annAudience, setAnnAudience] = useState('all');

  const [libraryNotes, setLibraryNotes] = useState([]);
  const [libraryTitle, setLibraryTitle] = useState('');
  const [libraryCourse, setLibraryCourse] = useState('Java Development');
  const [libraryContent, setLibraryContent] = useState('');
  const [libraryPdfFile, setLibraryPdfFile] = useState(null);

  const [galTitle, setGalTitle] = useState('');
  const [galDesc, setGalDesc] = useState('');
  const [galFile, setGalFile] = useState(null);
  const [galCat, setGalCat] = useState('classroom');
  const [galItems, setGalItems] = useState([]);

  // Course manager states
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseDuration, setCourseDuration] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseMilestones, setCourseMilestones] = useState('');
  const [courseCategory, setCourseCategory] = useState('development');
  const [courseColor, setCourseColor] = useState('brandMint');
  const [courseImage, setCourseImage] = useState(null);
  const [courseSchedules, setCourseSchedules] = useState([{ time: '', activity: '' }]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleAttachments, setModuleAttachments] = useState([]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonVideoFile, setLessonVideoFile] = useState(null);
  const [lessonVideoDuration, setLessonVideoDuration] = useState('');
  const [lessonAttachments, setLessonAttachments] = useState([]);

  // LMS upload + edit state
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonDescription, setEditLessonDescription] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState('');
  const [editLessonVideoFile, setEditLessonVideoFile] = useState(null);
  const [editLessonVideoDuration, setEditLessonVideoDuration] = useState('');
  const [editLessonPublished, setEditLessonPublished] = useState(false);
  const [editLessonAttachments, setEditLessonAttachments] = useState([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [lessonIsPublished, setLessonIsPublished] = useState(true);

  const [editingModule, setEditingModule] = useState(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');
  const [editModuleAttachments, setEditModuleAttachments] = useState([]);

  // Job Posting Form States
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobDepartment, setJobDepartment] = useState('teaching');
  const [jobPosition, setJobPosition] = useState('junior');
  const [jobSalary, setJobSalary] = useState('');
  const [jobQualifications, setJobQualifications] = useState('');
  const [jobExperience, setJobExperience] = useState('');
  const [jobResponsibilities, setJobResponsibilities] = useState('');
  const [jobBenefits, setJobBenefits] = useState('');
  const [jobLocation, setJobLocation] = useState('On-site');
  const [jobDeadline, setJobDeadline] = useState('');
  const [jobsList, setJobsList] = useState([]);

  // Google Meet states
  const [meetings, setMeetings] = useState([]);
  const [mtgTitle, setMtgTitle] = useState('');
  const [mtgDescription, setMtgDescription] = useState('');
  const [mtgStartTime, setMtgStartTime] = useState('');
  const [mtgDuration, setMtgDuration] = useState('60');
  const [mtgAudience, setMtgAudience] = useState('all');
  const [mtgClassFilter, setMtgClassFilter] = useState('');
  const [mtgJoinUrl, setMtgJoinUrl] = useState('');

  // Course options are dynamic: pulled from the published courses (so new courses
  // added via the Courses Manager tab appear in every dropdown automatically).
  // Hardcoded COURSE_OPTIONS are kept as a fallback in case the API is empty.
  const courseOptions = courses.length > 0
    ? Array.from(new Set([
        ...courses.map((c) => c.title),
        ...COURSE_OPTIONS
      ]))
    : COURSE_OPTIONS;
  const audienceOptions = ['specific student', 'group chat', 'all learners'];

  const [aiQuizCourse, setAiQuizCourse] = useState('Java Development');
  const [aiQuizModule, setAiQuizModule] = useState('Core concepts');
  const [aiQuizLevel, setAiQuizLevel] = useState('Beginner');
  const [aiQuizStudentName, setAiQuizStudentName] = useState('');
  const [aiQuizAudience, setAiQuizAudience] = useState('specific student');
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [aiAssignmentCourse, setAiAssignmentCourse] = useState('Java Development');
  const [aiAssignmentModule, setAiAssignmentModule] = useState('Core concepts');
  const [aiAssignmentStudentName, setAiAssignmentStudentName] = useState('');
  const [aiAssignmentAudience, setAiAssignmentAudience] = useState('group chat');
  const [aiAssignmentDifficulty, setAiAssignmentDifficulty] = useState('Intermediate');
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchAdmissions();
    fetchStudents();
    fetchTeachers();
    fetchFees();
    fetchQueries();
    fetchGallery();
    fetchFeeStructures();
    fetchFineRules();
    fetchJobs();
    fetchLibraryNotes();
    fetchMeetings();
    fetchCourses();
  }, [activeTab]);

  useEffect(() => {
    if (courses && courses.length > 0) {
      const selectedCourse = courses.find((c) => c.title === admStdClass);
      if (selectedCourse) {
        setAdmissionFee(selectedCourse.price !== undefined ? String(selectedCourse.price) : '0');
      } else {
        // If not found (e.g. it is the initial fallback state), try to set it to the first course
        const firstCourse = courses[0];
        if (firstCourse && firstCourse.title) {
          setAdmStdClass(firstCourse.title);
          setAdmissionFee(firstCourse.price !== undefined ? String(firstCourse.price) : '0');
        }
      }
    }
  }, [courses, admStdClass]);

  const fetchFeeStructures = () => {
    fetch('/api/admin/fee-structures', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setFeeStructures(data.data); })
      .catch(err => console.error(err));
  };

  const fetchFineRules = () => {
    fetch('/api/admin/fine-rules', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setFineRules(data.data); })
      .catch(err => console.error(err));
  };

  const fetchStats = () => {
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data.stats); })
      .catch(err => console.error(err));
  };

  const fetchAdmissions = () => {
    fetch('/api/admin/admissions', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setAdmissions(data.data); })
      .catch(err => console.error(err));
  };

  const fetchStudents = () => {
    fetch('/api/admin/students', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setStudents(data.data); })
      .catch(err => console.error(err));
  };

  const fetchTeachers = () => {
    fetch('/api/admin/teachers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setTeachers(data.data); })
      .catch(err => console.error(err));
  };

  const fetchFees = () => {
    fetch('/api/admin/fees', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setFees(data.data); })
      .catch(err => console.error(err));
  };

  const fetchQueries = () => {
    fetch('/api/admin/queries', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setQueries(data.data); })
      .catch(err => console.error(err));
  };

  // Admissions Action
  const handleAdmissionDecision = async (id, status, pswd) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/admissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, remarks, password: pswd })
      });
      const data = await res.json();
      setLoading(false);
      setRemarks('');
      setParentPassword('');
      setSelectedAdmission(null);
      if (data.success) {
        alert(`Admission application successfully marked ${status}!`);
        fetchAdmissions();
        if (status === 'approved') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        }
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = (id) => {
    triggerConfirm(
      "Are you sure you want to delete?",
      "This will permanently remove the student record from the database.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/students/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Student record deleted');
            fetchStudents();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Register Teacher
  const handleCreateTeacher = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Are you sure you want to submit?",
      `This will hire and register ${tName} as a staff teacher.`,
      "submit",
      async () => {
        try {
          const res = await fetch('/api/admin/teachers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: tName,
              email: tEmail,
              password: tPassword,
              phone: tPhone,
              qualifications: tQual,
              classesAssigned: [tClass]
            })
          });
          const data = await res.json();
          if (data.success) {
            alert('Teacher hired successfully!');
            setTName(''); setTEmail(''); setTPassword(''); setTPhone(''); setTQual('');
            fetchTeachers();
          } else {
            alert(data.message);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Generate invoice
  const handleCreateFee = (e) => {
    e.preventDefault();
    if (!feeStdId) return alert('Please select a student');
    triggerConfirm(
      "Are you sure you want to submit?",
      "This will issue a new tuition fee invoice for the student.",
      "submit",
      async () => {
        try {
          const res = await fetch('/api/admin/fees', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ studentId: feeStdId, amount: Number(feeAmount), term: feeTerm, dueDate: feeDueDate })
          });
          const data = await res.json();
          if (data.success) {
            alert('Tuition invoice billed!');
            setFeeStdId('');
            setFeeDueDate('');
            setFeeAmount('');
            setFeeTerm('Month 1 Installment');
            setFeeFormBreakdown(null);
            fetchFees();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Resolve a student's photo into a renderable URL for the ID card.
  // Payment-created students (and any without an uploaded photo) resolve to the
  // student-photo endpoint so the profile image still shows.
  const resolveStudentPhoto = (std) => {
    if (!std) return '';
    if (std.photo && /^https?:\/\//.test(std.photo)) return std.photo;
    return `/api/admin/students/photo/${std._id}`;
  };

  // Open the printable ID card with the photo pre-resolved.
  const handleViewIdCard = (std) => {
    setIdPhotoError(false);
    setActiveIdCard({ ...std, photo: resolveStudentPhoto(std) });
  };

  const getStudentInfo = (f) => {
    if (f.studentId && typeof f.studentId === 'object') {
      return { name: f.studentId.name, class: f.studentId.class, id: f.studentId._id };
    }
    const found = students.find(s => s._id === f.studentId);
    if (found) {
      return { name: found.name, class: found.class, id: found._id };
    }
    return { name: 'Unknown Student', class: 'N/A', id: f.studentId };
  };

  const handleViewReceipt = async (feeId) => {
    try {
      const res = await fetch(`/api/admin/receipt/${feeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        let matchedStructure = null;
        if (data.student?.class) {
          matchedStructure = feeStructures.find(fs => fs.class === data.student.class && fs.isActive);
        }
        setActiveReceipt({
          ...data,
          feeStructure: matchedStructure
        });
      } else {
        alert(data.message || 'Receipt not found');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load receipt');
    }
  };

  const handleCollectPayment = (feeId) => {
    const feeObj = fees.find(f => f._id === feeId);
    if (!feeObj) return;
    setSelectedCollectFee(feeObj);
    setCollectPaymentOpen(true);
  };

  const handleCollectPaymentSuccess = (data) => {
    setCollectPaymentOpen(false);
    fetchFees(); // refresh fee list
    if (data.receipt) {
      const fee = selectedCollectFee;
      const studentInfo = getStudentInfo(fee);
      let matchedStructure = null;
      if (studentInfo.class) {
        matchedStructure = feeStructures.find(fs => fs.class === studentInfo.class && fs.isActive);
      }
      setActiveReceipt({
        receipt: data.receipt,
        student: {
          name: studentInfo.name,
          class: studentInfo.class,
          studentId: studentInfo.id
        },
        fee: {
          term: fee.term,
          amount: fee.amount,
          fine: fee.fine || 0
        },
        feeStructure: matchedStructure
      });
    }
  };

  // Library notes workflow
  const handleCreateLibraryNote = async (e) => {
    e.preventDefault();
    if (!libraryTitle.trim()) return alert('Please provide a note title.');
    if (!libraryContent.trim() && !libraryPdfFile) return alert('Please provide note content or choose a PDF file.');

    try {
      const formData = new FormData();
      formData.append('title', libraryTitle.trim());
      formData.append('course', libraryCourse);
      if (libraryContent.trim()) formData.append('content', libraryContent.trim());
      if (libraryPdfFile) formData.append('pdfFile', libraryPdfFile);

      const response = await fetch('/api/admin/library-notes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to save the note');
      }

      setLibraryNotes(prev => [data.data, ...prev]);
      setLibraryTitle('');
      setLibraryContent('');
      setLibraryCourse('Java Development');
      setLibraryPdfFile(null);
      e.target.reset();
      alert(data.message || 'Course note saved to the library dashboard.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save the note');
    }
  };

  const handleDeleteLibraryNote = (id) => {
    triggerConfirm(
      'Delete note?',
      'This will remove the course note from the library panel.',
      'delete',
      async () => {
        try {
          const response = await fetch(`/api/admin/library-notes/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (!data.success) throw new Error(data.message || 'Failed to delete the note');
          setLibraryNotes(prev => prev.filter(item => item._id !== id));
        } catch (err) {
          console.error(err);
          alert(err.message || 'Failed to delete the note');
        }
      }
    );
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setQuizLoading(true);
    setQuizResult(null);

    try {
      const response = await fetch('/api/public/ai-quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: aiQuizCourse,
          module: aiQuizModule,
          level: aiQuizLevel,
          studentName: aiQuizStudentName || 'Student',
          audience: aiQuizAudience
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to generate quiz.');
      }

      setQuizResult(data.data);
      alert('AI quiz content generated successfully.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to generate quiz content.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateAssignment = async (e) => {
    e.preventDefault();
    setAssignmentLoading(true);
    setAssignmentResult(null);

    try {
      const response = await fetch('/api/public/ai-assignment-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: aiAssignmentCourse,
          module: aiAssignmentModule,
          studentName: aiAssignmentStudentName || 'Student',
          audience: aiAssignmentAudience,
          difficulty: aiAssignmentDifficulty
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to generate assignment.');
      }

      setAssignmentResult(data.data);
      alert('AI assignment content generated successfully.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to generate assignment content.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Create notice
  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Are you sure you want to submit?",
      "This will post a new bulletin notice to all parents.",
      "submit",
      async () => {
        try {
          const res = await fetch('/api/admin/announcements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title: annTitle, content: annContent, category: annCat, targetAudience: annAudience })
          });
          const data = await res.json();
          if (data.success) {
            alert('Circular bulletin published!');
            setAnnTitle(''); setAnnContent('');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Fetch Jobs
  const fetchJobs = () => {
    fetch('/api/admin/jobs', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJobsList(data.data || []);
        }
      })
      .catch(err => console.error('Error fetching jobs:', err));
  };

  // Fetch Google Meet Meetings
  const fetchMeetings = () => {
    fetch('/api/meetings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMeetings(data.data || []);
        }
      })
      .catch(err => console.error('Error fetching meetings:', err));
  };

  // Create Google Meet Meeting
  const handleCreateMeeting = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Schedule New Meeting?",
      "This will publish the meeting so participants can join at the scheduled time.",
      "submit",
      async () => {
        try {
          const res = await fetch('/api/meetings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              title: mtgTitle,
              description: mtgDescription,
              startTime: mtgStartTime,
              durationMinutes: mtgDuration,
              targetAudience: mtgAudience,
              classFilter: mtgClassFilter,
              joinUrl: mtgJoinUrl
            })
          });
          const data = await res.json();
          if (data.success) {
            alert('Meeting scheduled successfully!');
            setMtgTitle(''); setMtgDescription(''); setMtgStartTime('');
            setMtgDuration('60'); setMtgAudience('all'); setMtgClassFilter('');
            setMtgJoinUrl('');
            fetchMeetings();
          } else {
            alert(data.message || 'Failed to schedule meeting');
          }
        } catch (err) {
          console.error(err);
          alert('Error scheduling meeting: ' + err.message);
        }
      }
    );
  };

  // Delete Google Meet Meeting
  const handleDeleteMeeting = (meetingId) => {
    triggerConfirm(
      "Delete Meeting?",
      "This will remove the meeting and cancel it for all participants.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/meetings/${meetingId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Meeting deleted!');
            fetchMeetings();
          } else {
            alert(data.message || 'Failed to delete meeting');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const fetchLibraryNotes = () => {
    fetch('/api/admin/library-notes', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLibraryNotes(data.data || []);
        }
      })
      .catch(err => console.error('Error fetching library notes:', err));
  };

  // Create Job Posting
  const handleCreateJob = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Post New Job Vacancy?",
      "This will publish the job posting to the careers section.",
      "submit",
      async () => {
        try {
          const res = await fetch('/api/admin/jobs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              title: jobTitle,
              description: jobDescription,
              department: jobDepartment,
              position: jobPosition,
              salary: parseInt(jobSalary),
              qualifications: jobQualifications,
              experience: jobExperience,
              responsibilities: jobResponsibilities,
              benefits: jobBenefits,
              location: jobLocation,
              applicationDeadline: jobDeadline
            })
          });
          const data = await res.json();
          if (data.success) {
            alert('Job posting published successfully!');
            setJobTitle(''); setJobDescription(''); setJobSalary('');
            setJobQualifications(''); setJobExperience(''); setJobResponsibilities('');
            setJobBenefits(''); setJobDeadline('');
            fetchJobs();
          } else {
            alert(data.message || 'Failed to post job');
          }
        } catch (err) {
          console.error(err);
          alert('Error posting job: ' + err.message);
        }
      }
    );
  };

  // Delete Job Posting
  const handleDeleteJob = (jobId) => {
    triggerConfirm(
      "Delete Job Posting?",
      "This action cannot be undone.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Job posting deleted!');
            fetchJobs();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Fine Rules CRUD
  const handleSaveFineRule = async (e) => {
    e.preventDefault();
    const { minDays, maxDays, fineAmount } = fineFormData;
    if (minDays === '' || maxDays === '' || fineAmount === '') {
      return alert('All fields are required');
    }

    try {
      const url = editingFineId
        ? `/api/admin/fine-rules/${editingFineId}`
        : '/api/admin/fine-rules';
      const method = editingFineId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          minDays: Number(minDays),
          maxDays: Number(maxDays),
          fineAmount: Number(fineAmount)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(editingFineId ? 'Fine rule updated successfully!' : 'Fine rule created successfully!');
        setEditingFineId(null);
        setFineFormData({ minDays: 1, maxDays: 10, fineAmount: 50 });
        setIsFineModalOpen(false);
        fetchFineRules();
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with server');
    }
  };

  const handleDeleteFineRule = (id) => {
    triggerConfirm(
      "Delete Fine Rule?",
      "Are you sure you want to delete this fine rule?",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/fine-rules/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Fine rule deleted successfully.');
            fetchFineRules();
          } else {
            alert(data.message || 'Failed to delete fine rule');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Create gallery item
  const handleCreateGallery = (e) => {
    e.preventDefault();
    if (!galFile) return alert('Please select an image file to upload');
    triggerConfirm(
      "Are you sure you want to submit?",
      "This will upload the image to the public school gallery.",
      "submit",
      async () => {
        try {
          const formData = new FormData();
          formData.append('title', galTitle);
          formData.append('description', galDesc);
          formData.append('category', galCat);
          formData.append('file', galFile);

          const res = await fetch('/api/admin/gallery', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            alert('Media added to school gallery!');
            setGalTitle(''); setGalDesc(''); setGalFile(null);
            const fileInput = document.getElementById('gallery-file-input');
            if (fileInput) fileInput.value = '';
            fetchGallery();
          } else {
            alert(data.message || 'Failed to add media');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const fetchGallery = () => {
    fetch('/api/public/gallery')
      .then(res => res.json())
      .then(data => { if (data.success) setGalItems(data.data); })
      .catch(err => console.error(err));
  };

  const handleDeleteGallery = (id) => {
    triggerConfirm(
      "Are you sure you want to delete?",
      "This will remove the media item from the gallery.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/gallery/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Gallery item removed');
            fetchGallery();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // ===== Course management =====
  const fetchCourses = () => {
    fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setCourses(data.data); })
      .catch(err => console.error(err));
  };

  const addScheduleRow = () => setCourseSchedules(prev => [...prev, { time: '', activity: '' }]);
  const updateScheduleRow = (idx, field, value) => setCourseSchedules(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  const removeScheduleRow = (idx) => setCourseSchedules(prev => prev.filter((_, i) => i !== idx));

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseDescription.trim()) return alert('Course title and description are required');
    triggerConfirm(
      "Are you sure you want to submit?",
      `This will publish the "${courseTitle}" course to the Programs page.`,
      "submit",
      async () => {
        try {
          const milestones = courseMilestones.split('\n').map(m => m.trim()).filter(Boolean);
          const cleanSchedule = courseSchedules.filter(r => r.time.trim() || r.activity.trim());

          const formData = new FormData();
          formData.append('title', courseTitle);
          formData.append('description', courseDescription);
          formData.append('duration', courseDuration);
          formData.append('price', coursePrice);
          formData.append('milestones', JSON.stringify(milestones));
          formData.append('schedule', JSON.stringify(cleanSchedule));
          formData.append('category', courseCategory);
          formData.append('color', courseColor);
          if (courseImage) formData.append('file', courseImage);

          const res = await fetch('/api/admin/courses', {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            alert('Course created successfully!');
            setCourseTitle(''); setCourseDescription(''); setCourseDuration(''); setCoursePrice('');
            setCourseMilestones(''); setCourseCategory('development'); setCourseColor('brandMint');
            setCourseImage(null); setCourseSchedules([{ time: '', activity: '' }]);
            const fileInput = document.getElementById('course-file-input');
            if (fileInput) fileInput.value = '';
            fetchCourses();
          } else {
            alert(data.message || 'Failed to create course');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleDeleteCourse = (id) => {
    triggerConfirm(
      "Are you sure you want to delete?",
      "This will permanently remove the course from the Programs page.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/courses/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Course deleted');
            fetchCourses();
            if (selectedCourse?._id === id) {
              setSelectedCourse(null);
              setModules([]);
              setSelectedModule(null);
              setLessons([]);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // ===== LMS Management (Modules & Lessons) =====
  const fetchModules = async (courseId) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setModules(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setSelectedModule(null);
    setLessons([]);
    fetchModules(course._id);
  };

  const handleUploadMaterial = async (file, onUploaded) => {
    try {
      const formData = new FormData();
      formData.append('materialFile', file);
      
      const res = await fetch('/api/admin/upload-material', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        onUploaded(data.data);
      } else {
        alert(data.message || 'File upload failed');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('File upload failed — server error');
    }
  };

  const handleEditModule = (module) => {
    setEditingModule(module);
    setEditModuleTitle(module.title);
    setEditModuleDescription(module.description || '');
    setEditModuleAttachments(module.attachments || []);
  };

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    if (!editingModule) return;
    try {
      const res = await fetch(`/api/admin/modules/${editingModule._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: editModuleTitle,
          description: editModuleDescription,
          attachments: editModuleAttachments
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Module updated!');
        setEditingModule(null);
        fetchModules(selectedCourse._id);
      } else {
        alert(data.message || 'Failed to update module');
      }
    } catch (err) {
      console.error(err);
      alert('Server error updating module');
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!moduleTitle.trim() || !selectedCourse) return;
    try {
      const res = await fetch(`/api/admin/courses/${selectedCourse._id}/modules`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          title: moduleTitle,
          description: moduleDescription,
          attachments: moduleAttachments
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Module created!');
        setModuleTitle('');
        setModuleDescription('');
        setModuleAttachments([]);
        fetchModules(selectedCourse._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    triggerConfirm(
      "Delete Module?",
      "This will remove the module and all its lessons.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/modules/${moduleId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Module deleted');
            fetchModules(selectedCourse._id);
            if (selectedModule?._id === moduleId) {
              setSelectedModule(null);
              setLessons([]);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const fetchLessons = async (moduleId) => {
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/lessons`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setLessons(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectModule = (module) => {
    setSelectedModule(module);
    fetchLessons(module._id);
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !selectedModule) return;

    const formData = new FormData();
    formData.append('title', lessonTitle);
    formData.append('description', lessonDescription);
    formData.append('content', lessonContent);
    formData.append('videoUrl', lessonVideoUrl);
    formData.append('videoDuration', lessonVideoDuration);
    formData.append('isPublished', String(lessonIsPublished));
    formData.append('attachments', JSON.stringify(lessonAttachments));
    if (lessonVideoFile) formData.append('videoFile', lessonVideoFile);

    // Use XHR so we can track upload progress for large video files
    setVideoUploading(true);
    setVideoUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/modules/${selectedModule._id}/lessons`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable) {
        setVideoUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.onload = () => {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          setLessonTitle('');
          setLessonDescription('');
          setLessonContent('');
          setLessonVideoUrl('');
          setLessonVideoFile(null);
          setLessonVideoDuration('');
          setLessonIsPublished(true);
          setLessonAttachments([]);
          setVideoPreviewUrl('');
          const fileInput = document.getElementById('lesson-video-input');
          if (fileInput) fileInput.value = '';
          fetchLessons(selectedModule._id);
        } else {
          alert(data.message || 'Failed to create lesson');
        }
      } catch {
        alert('Upload failed — server error');
      }
    };

    xhr.onerror = () => {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      alert('Upload failed — network error');
    };

    xhr.send(formData);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description || '');
    setEditLessonContent(lesson.content || '');
    setEditLessonVideoUrl(lesson.videoUrl || '');
    setEditLessonVideoFile(null);
    setEditLessonVideoDuration(lesson.videoDuration ? String(lesson.videoDuration) : '');
    setEditLessonPublished(lesson.isPublished ?? true);
    setEditLessonAttachments(lesson.attachments || []);
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!editingLesson) return;

    const formData = new FormData();
    formData.append('title', editLessonTitle);
    formData.append('description', editLessonDescription);
    formData.append('content', editLessonContent);
    formData.append('videoUrl', editLessonVideoUrl);
    formData.append('videoDuration', editLessonVideoDuration);
    formData.append('isPublished', String(editLessonPublished));
    formData.append('attachments', JSON.stringify(editLessonAttachments));
    if (editLessonVideoFile) formData.append('videoFile', editLessonVideoFile);

    setVideoUploading(true);
    setVideoUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/admin/lessons/${editingLesson._id}`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable) {
        setVideoUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.onload = () => {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          setEditingLesson(null);
          fetchLessons(selectedModule._id);
        } else {
          alert(data.message || 'Failed to update lesson');
        }
      } catch {
        alert('Update failed — server error');
      }
    };

    xhr.onerror = () => {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      alert('Update failed — network error');
    };

    xhr.send(formData);
  };

  const handleToggleLessonPublish = async (lesson) => {
    try {
      const res = await fetch(`/api/admin/lessons/${lesson._id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isPublished: !lesson.isPublished })
      });
      const data = await res.json();
      if (data.success) fetchLessons(selectedModule._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleModulePublish = async (module) => {
    try {
      const res = await fetch(`/api/admin/modules/${module._id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isPublished: !module.isPublished })
      });
      const data = await res.json();
      if (data.success) fetchModules(selectedCourse._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCoursePublish = async (course) => {
    try {
      const res = await fetch(`/api/admin/courses/${course._id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isPublished: !course.isPublished })
      });
      const data = await res.json();
      if (data.success) fetchCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    triggerConfirm(
      "Delete Lesson?",
      "This will remove the lesson permanently.",
      "delete",
      async () => {
        try {
          const res = await fetch(`/api/admin/lessons/${lessonId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          if (data.success) {
            alert('Lesson deleted');
            fetchLessons(selectedModule._id);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Resolve query
  const handleResolveQuery = (id) => {
    triggerConfirm(
      "Are you sure you want to submit?",
      "This will mark the query ticket as resolved.",
      "submit",
      async () => {
        try {
          const res = await fetch(`/api/admin/queries/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'resolved' })
          });
          const data = await res.json();
          if (data.success) {
            alert('Query ticket resolved');
            fetchQueries();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Open the admission payment modal (Cash / UPI). Validates required fields first.
  const handleOpenAdmissionPayment = () => {
    if (!admStdName.trim() || !admStdDob) return alert('Please fill in the student details (name + date of birth).');
    if (!admParentFather.trim() || !admParentMother.trim() || !admParentEmail || !admParentPhone || !admParentAddress.trim()) {
      return alert('Please fill in all parent details before paying.');
    }
    if (!admissionFee || Number(admissionFee) <= 0) return alert('Please enter an admission fee amount to collect.');
    setAdmissionPaymentOpen(true);
  };

  // Called when the payment modal reports a successful (verified) payment.
  // The backend has already auto-saved the student, so just refresh lists + reset.
  const handleAdmissionPaymentSuccess = (result) => {
    setAdmissionPaymentOpen(false);
    alert(`Admission confirmed! Application No: ${result?.applicationNumber || ''}`);
    // Reset the New Admission form
    setAdmStdName(''); setAdmStdDob(''); setAdmStdGender('Male');
    setAdmStdClass(COURSE_OPTIONS[0]);
    setAdmParentFather(''); setAdmParentMother(''); setAdmParentEmail('');
    setAdmParentPhone(''); setAdmParentAddress(''); setAdmParentPassword('');
    setAdmBirthCertificate(null); setAdmPhoto(null); setAdmReportCard(null);
    setAdmTransferCertificate(null); setAdmAadhaarCard(null); setAdmFatherAadhaarCard(null);
    setAdmMotherAadhaarCard(null); setAdmAddressProofType('Aadhaar Card'); setAdmAddressProof(null);
    setAdmissionFee('');
    const inputs = ['adm-cert-input', 'adm-photo-input', 'adm-report-input', 'adm-tc-input', 'adm-aadhaar-input', 'adm-father-aadhaar-input', 'adm-mother-aadhaar-input', 'adm-address-proof-input'];
    inputs.forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });

    setAdmissionsSubTab('history');
    fetchAdmissions();
    fetchStudents();
    fetchFees();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  // Submit New Admission Form (Multipart Form Data)
  const handleCreateAdmission = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Submit New Admission?",
      "This will create student and parent records, and generate the admission fee and 12 monthly fee invoices.",
      "submit",
      async () => {
        try {
          const formData = new FormData();
          const studentDetails = {
            name: admStdName,
            dateOfBirth: admStdDob,
            gender: admStdGender,
            class: admStdClass
          };
          const parentDetails = {
            fatherName: admParentFather,
            motherName: admParentMother,
            email: admParentEmail,
            phone: admParentPhone,
            address: admParentAddress
          };

          formData.append('studentDetails', JSON.stringify(studentDetails));
          formData.append('parentDetails', JSON.stringify(parentDetails));
          formData.append('password', admParentPassword);
          formData.append('admissionFee', admissionFee || '0');
          formData.append('addressProofType', admAddressProofType);

          if (admBirthCertificate) {
            formData.append('birthCertificate', admBirthCertificate);
          }
          if (admPhoto) {
            formData.append('photo', admPhoto);
          }
          if (admReportCard) {
            formData.append('reportCard', admReportCard);
          }
          if (admTransferCertificate) {
            formData.append('transferCertificate', admTransferCertificate);
          }
          if (admAadhaarCard) {
            formData.append('aadhaarCard', admAadhaarCard);
          }
          if (admFatherAadhaarCard) {
            formData.append('fatherAadhaarCard', admFatherAadhaarCard);
          }
          if (admMotherAadhaarCard) {
            formData.append('motherAadhaarCard', admMotherAadhaarCard);
          }
          if (admAddressProof) {
            formData.append('addressProof', admAddressProof);
          }

          const res = await fetch('/api/admin/admissions/create', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            alert('Admission recorded successfully!');

            // Set active receipt for printing if returned
            if (data.receipt) {
              setActiveReceipt({
                receipt: data.receipt,
                student: {
                  name: studentDetails.name,
                  class: studentDetails.class,
                  studentId: 'New Admission'
                },
                fee: {
                  term: 'Admission Fee'
                }
              });
            }

            // Reset form
            setAdmStdName('');
            setAdmStdDob('');
            setAdmStdGender('Male');
            setAdmStdClass(COURSE_OPTIONS[0]);
            setAdmParentFather('');
            setAdmParentMother('');
            setAdmParentEmail('');
            setAdmParentPhone('');
            setAdmParentAddress('');
            setAdmParentPassword('');
            setAdmBirthCertificate(null);
            setAdmPhoto(null);
            setAdmReportCard(null);
            setAdmTransferCertificate(null);
            setAdmAadhaarCard(null);
            setAdmFatherAadhaarCard(null);
            setAdmMotherAadhaarCard(null);
            setAdmAddressProofType('Aadhaar Card');
            setAdmAddressProof(null);
            setAdmissionFee('');

            const certInput = document.getElementById('adm-cert-input');
            const photoInput = document.getElementById('adm-photo-input');
            const reportInput = document.getElementById('adm-report-input');
            const tcInput = document.getElementById('adm-tc-input');
            const aadhaarInput = document.getElementById('adm-aadhaar-input');
            const fatherAadhaarInput = document.getElementById('adm-father-aadhaar-input');
            const motherAadhaarInput = document.getElementById('adm-mother-aadhaar-input');
            const addressProofInput = document.getElementById('adm-address-proof-input');

            if (certInput) certInput.value = '';
            if (photoInput) photoInput.value = '';
            if (reportInput) reportInput.value = '';
            if (tcInput) tcInput.value = '';
            if (aadhaarInput) aadhaarInput.value = '';
            if (fatherAadhaarInput) fatherAadhaarInput.value = '';
            if (motherAadhaarInput) motherAadhaarInput.value = '';
            if (addressProofInput) addressProofInput.value = '';

            setAdmissionsSubTab('history');
            fetchAdmissions();
            fetchStudents();
            fetchFees();
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          } else {
            alert(data.message || 'Error occurred while creating admission');
          }
        } catch (err) {
          console.error(err);
          alert(err.message || 'Error occurred while creating admission');
        }
      }
    );
  };

  // Submit Direct Student Registration
  const handleRegisterStudent = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Register Student Directly?",
      "This will manually register an existing student and provision their parent credentials.",
      "submit",
      async () => {
        try {
          const res = await fetch('/api/admin/students/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: regStdName,
              dateOfBirth: regStdDob,
              gender: regStdGender,
              studentClass: regStdClass,
              parentName: regParentName,
              parentEmail: regParentEmail,
              parentPhone: regParentPhone,
              parentAddress: regParentAddress,
              password: regParentPassword
            })
          });
          const data = await res.json();
          if (data.success) {
            alert('Student registered directly successfully!');
            // Reset form
            setRegStdName('');
            setRegStdDob('');
            setRegStdGender('Male');
            setRegStdClass(COURSE_OPTIONS[0]);
            setRegParentName('');
            setRegParentEmail('');
            setRegParentPhone('');
            setRegParentAddress('');
            setRegParentPassword('');

            setUsersSubTab('registry');
            fetchStudents();
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          } else {
            alert(data.message || 'Error occurred while registering student');
          }
        } catch (err) {
          console.error(err);
          alert(err.message || 'Error occurred while registering student');
        }
      }
    );
  };

  // Pre-fill fields and start editing student
  const handleStartEditStudent = (std) => {
    setEditingStudent(std);
    setEditStdName(std.name || '');
    const dobFormatted = std.dateOfBirth ? new Date(std.dateOfBirth).toISOString().split('T')[0] : '';
    setEditStdDob(dobFormatted);
    setEditStdGender(std.gender || 'Male');
    setEditStdClass(std.class || COURSE_OPTIONS[0]);
    setEditParentName(std.parentId?.name || std.parentDetails?.fatherName || std.parentDetails?.motherName || '');
    setEditParentPhone(std.parentId?.phone || std.parentDetails?.phone || '');
    setEditParentAddress(std.parentId?.address || std.parentDetails?.address || '');
  };

  // Save changes to Student Profile
  const handleEditStudent = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Save Changes?",
      `This will update the profile details of ${editStdName}.`,
      "submit",
      async () => {
        try {
          const res = await fetch(`/api/admin/students/${editingStudent._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: editStdName,
              dateOfBirth: editStdDob,
              gender: editStdGender,
              studentClass: editStdClass,
              parentName: editParentName,
              parentPhone: editParentPhone,
              parentAddress: editParentAddress
            })
          });
          const data = await res.json();
          if (data.success) {
            alert('Student profile updated successfully!');
            setEditingStudent(null);
            fetchStudents();
          } else {
            alert(data.message || 'Error occurred while updating student');
          }
        } catch (err) {
          console.error(err);
          alert(err.message || 'Error occurred while updating student');
        }
      }
    );
  };

  // Export filtered students as CSV
  const handleExportCSV = () => {
    const filtered = students.filter(s => {
      const classMatch = studentClassFilter ? s.class === studentClassFilter : true;
      const nameMatch = s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
      return classMatch && nameMatch;
    });

    const headers = ['Student ID', 'Student Name', 'Course', 'Gender', 'DOB', 'Parent Name', 'Parent Email', 'Parent Phone', 'Parent Address'];
    const rows = filtered.map(s => [
      s.studentId || '',
      s.name || '',
      s.class || '',
      s.gender || '',
      s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '',
      s.parentId?.name || '',
      s.parentId?.email || '',
      s.parentId?.phone || '',
      s.parentId?.address || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open printable student registry overview
  const handlePrintPDF = () => {
    const filtered = students.filter(s => {
      const classMatch = studentClassFilter ? s.class === studentClassFilter : true;
      const nameMatch = s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
      return classMatch && nameMatch;
    });
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Registry Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 30px; }
            h1 { text-align: center; color: #5B468C; margin-bottom: 5px; }
            p.subtitle { text-align: center; font-size: 13px; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #ECEAFE; font-weight: bold; color: #5B468C; }
            tr:nth-child(even) { background-color: #fcfcfc; }
            .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <h1>Pranidha International School</h1>
          <p class="subtitle">Active Student Database Report — Generated on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Course</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Parent Contact Info</th>
              </tr>
            </thead>
            <tbody>
              \${filtered.map(s => \`
                <tr>
                  <td><strong>\${s.studentId || 'N/A'}</strong></td>
                  <td>\${s.name}</td>
                  <td>\${s.class}</td>
                  <td>\${s.gender}</td>
                  <td>\${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    Name: \${s.parentId?.name || 'N/A'}<br/>
                    Phone: \${s.parentId?.phone || 'N/A'}<br/>
                    Email: \${s.parentId?.email || 'N/A'}
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
          <div class="footer">Page total: \${filtered.length} students</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen p-4 -m-4 space-y-6 admin-dashboard-shell md:-m-8 md:p-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      <div className="space-y-6 print:hidden">
        {/* Welcome Bar */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.55)] backdrop-blur-xl md:p-8 md:flex-row text-slate-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-16 h-16 text-xl font-bold border border-cyan-400/30 rounded-full shadow-[0_10px_30px_rgba(56,189,248,0.18)] bg-cyan-400/10 text-cyan-100 font-quicksand">
              PR
            </div>
            <div>
              <span className="block text-xs font-bold tracking-wider uppercase text-cyan-200">ADMIN CONTROL HUB</span>
              <h1 className="text-3xl font-bold leading-tight text-white font-quicksand">Good Morning, Admin! ☀️</h1>
              <p className="mt-0.5 text-xs text-slate-300">Let's manage courses, review admissions, and publish premium notes today.</p>
            </div>
          </div>
          <div>
            <button
              onClick={() => setActiveTab('stats')}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-6 py-2.5 font-quicksand font-bold text-xs text-cyan-100 shadow-[0_10px_24px_rgba(56,189,248,0.12)] transition hover:bg-cyan-400/20"
            >
              VIEW REPORT OVERVIEW
            </button>
          </div>
        </div>

        {/* Tabs Layout */}
        <div className="grid items-start grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Sidebar tabs */}
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.55)] backdrop-blur-xl lg:col-span-3">
            <div className="flex flex-col items-center pb-4 mb-4 space-y-2 border-b border-white/20">
              <div className="flex items-center justify-center w-16 h-16 text-lg font-bold text-white border-4 border-white rounded-full shadow-sm bg-white/25 font-quicksand">
                AD
              </div>
              <span className="block text-sm font-bold text-white font-quicksand">Hi, Admin! 👋</span>
            </div>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'stats' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('admissions')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'admissions' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <ClipboardList className="w-4.5 h-4.5" />
              <span>Enrollment Applications</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'users' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Students & Teachers</span>
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'fees' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <CreditCard className="w-4.5 h-4.5" />
              <span>Fees & Billing</span>
            </button>


            <button
              onClick={() => setActiveTab('announcements')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'announcements' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <Bell className="w-4.5 h-4.5" />
              <span>Notices Board</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'library' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Library & Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'jobs' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>Job Postings</span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'courses' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Courses Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'gallery' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <ImageIcon className="w-4.5 h-4.5" />
              <span>Gallery Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('meetings')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'meetings' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <Video className="w-4.5 h-4.5" />
              <span>Google Meet</span>
            </button>

            <button
              onClick={() => setActiveTab('queries')}
              className={`w-full text-left font-quicksand font-bold text-xs p-3 flex items-center space-x-3 transition-all ${activeTab === 'queries' ? 'clay-sidebar-item-active' : 'rounded-2xl text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              <MessageCircle className="w-4.5 h-4.5" />
              <span>Visitor Queries</span>
            </button>
          </div>

          {/* Content panel */}
          <div className="min-h-[400px] rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.55)] backdrop-blur-xl md:p-8 lg:col-span-9">

            {/* TAB 1: Overview stats */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="pb-3 text-lg font-bold border-b font-quicksand text-slate-800 border-orange-50">Analytics Overview</h3>
                {stats ? (
                  <div className="space-y-8">
                    {/* Grid cards */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                      <div className="bg-sky-50 border-4 border-white rounded-[2rem] p-6 shadow-md shadow-sky-100/40 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="block text-xs font-bold tracking-wider uppercase text-sky-500">Total Students</span>
                          <span className="text-sky-400 bg-sky-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">+18% this week</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-800 font-quicksand">{stats.students}</p>
                      </div>
                      <div className="bg-rose-50 border-4 border-white rounded-[2rem] p-6 shadow-md shadow-rose-100/40 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="block text-xs font-bold tracking-wider uppercase text-rose-500">Pending Forms</span>
                          <span className="text-rose-400 bg-rose-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">Admissions</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-800 font-quicksand">{stats.pendingAdmissions}</p>
                      </div>
                      <div className="bg-emerald-50 border-4 border-white rounded-[2rem] p-6 shadow-md shadow-emerald-100/40 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="block text-xs font-bold tracking-wider uppercase text-emerald-500">Total Revenue</span>
                          <span className="text-emerald-400 bg-emerald-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">Paid Fees</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-800 font-quicksand">₹{stats.totalRevenue}</p>
                      </div>
                      <div className="bg-amber-50 border-4 border-white rounded-[2rem] p-6 shadow-md shadow-amber-100/40 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="block text-xs font-bold tracking-wider uppercase text-amber-500">Hired Teachers</span>
                          <span className="text-amber-400 bg-amber-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">Staff Registry</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-800 font-quicksand">{stats.teachers}</p>
                      </div>
                      <div className="bg-indigo-50 border-4 border-white rounded-[2rem] p-6 shadow-md shadow-indigo-100/40 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <span className="block text-xs font-bold tracking-wider text-indigo-500 uppercase">Unread Queries</span>
                          <span className="text-indigo-400 bg-indigo-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">Visitor Tickets</span>
                        </div>
                        <p className="mt-4 text-3xl font-extrabold text-slate-800 font-quicksand">{stats.unreadQueries} unread</p>
                      </div>
                    </div>

                    {/* 3D Charts Split */}
                    <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
                      <div className="bg-white border-4 border-slate-50 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold font-quicksand text-slate-800">Weekly Activity Logs</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full">This Week</span>
                        </div>

                        <div className="flex items-end justify-between h-40 px-2 pt-4">
                          {[
                            { day: 'Mon', val: 'h-[40%]', bg: 'bg-[#9F92EC]' },
                            { day: 'Tue', val: 'h-[60%]', bg: 'bg-[#FFB3D1]' },
                            { day: 'Wed', val: 'h-[50%]', bg: 'bg-[#FCD34D]' },
                            { day: 'Thu', val: 'h-[80%]', bg: 'bg-[#FCD34D]' },
                            { day: 'Fri', val: 'h-[45%]', bg: 'bg-[#86EFAC]' },
                            { day: 'Sat', val: 'h-[70%]', bg: 'bg-[#93C5FD]' },
                            { day: 'Sun', val: 'h-[65%]', bg: 'bg-[#9F92EC]' }
                          ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center w-full gap-2">
                              <div className="flex items-end w-5 overflow-hidden rounded-full shadow-inner h-28 bg-slate-100">
                                <div className={`w-full ${item.val} ${item.bg} clay-bar`} />
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{item.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border-4 border-slate-50 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold font-quicksand text-slate-800">Enrolled Programs Split</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full">All Students</span>
                        </div>

                        <div className="flex items-center justify-around h-40 pt-2">
                          <div className="relative flex items-center justify-center border-8 rounded-full shadow-inner w-28 h-28 border-slate-100">
                            <div className="absolute inset-0 rounded-full border-8 border-[#9F92EC] border-t-transparent border-r-transparent" />
                            <div className="absolute inset-0 rounded-full border-8 border-[#FFB3D1] border-b-transparent border-l-transparent" />
                            <div className="text-center">
                              <span className="text-slate-400 text-[8px] font-bold uppercase block leading-none">Total</span>
                              <span className="text-sm font-bold text-slate-800 font-quicksand block mt-0.5">{stats?.students || 0}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[9px] font-bold text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#9F92EC] shadow-sm" />
                              <span>Java Development: 45%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#FFB3D1] shadow-sm" />
                              <span>MERN Developer: 35%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#FCD34D] shadow-sm" />
                              <span>Python Developer: 20%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Loading metrics...</p>
                )}
              </div>
            )}


            {/* TAB 2: Admissions reviews */}

            {activeTab === 'admissions' && (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 pb-4 border-b sm:flex-row sm:items-center border-orange-50">
                  <h3 className="text-lg font-bold font-quicksand text-slate-800">Enrollment & Admissions Manager</h3>

                  {/* Sub-tabs selection */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAdmissionsSubTab('review')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${admissionsSubTab === 'review'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Pending Reviews ({admissions.filter(a => a.status === 'pending').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdmissionsSubTab('new')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${admissionsSubTab === 'new'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      New Admission Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdmissionsSubTab('history')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${admissionsSubTab === 'history'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Admissions History ({admissions.filter(a => a.status !== 'pending').length})
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Pending Reviews */}
                {admissionsSubTab === 'review' && (
                  <div className="space-y-4">
                    {admissions.filter(adm => adm.status === 'pending').length === 0 ? (
                      <p className="py-10 text-xs font-medium text-center text-slate-500">No pending admission applications to review.</p>
                    ) : (
                      admissions.filter(adm => adm.status === 'pending').map(adm => (
                        <div key={adm._id} className="flex flex-col items-start justify-between gap-4 p-5 text-xs border bg-slate-50 border-slate-100 rounded-2xl sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <span className="block font-mono font-bold text-brandCoral">{adm.applicationNumber}</span>
                            <h4 className="text-sm font-bold font-quicksand text-slate-800">{adm.studentDetails?.name}</h4>
                            <p className="font-medium text-slate-500">Course: <span className="font-bold text-slate-800">{adm.studentDetails?.class}</span> | Parent: <span className="font-bold text-slate-800">{adm.parentDetails?.fatherName || adm.parentDetails?.motherName}</span></p>
                          </div>
                          <div className="flex items-center justify-between w-full gap-3 sm:w-auto sm:justify-end">
                            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border bg-brandYellow/10 text-brandYellow-dark border border-brandYellow/30">
                              {adm.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setParentPassword('');
                                setRemarks(adm.remarks || '');
                              }}
                              className="font-quicksand font-bold text-xs bg-[#9F92EC] hover:bg-[#8C7EB5] text-white px-4 py-2.5 rounded-xl shadow cursor-pointer transition-all active:scale-[0.98]"
                            >
                              REVIEW & DECIDE
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-tab 2: New Admission Entry Form */}
                {admissionsSubTab === 'new' && (
                  <form onSubmit={handleCreateAdmission} className="p-5 space-y-6 text-xs border bg-slate-50/50 border-slate-100 rounded-3xl">
                    <div>
                      <h4 className="text-sm font-bold font-quicksand text-[#5B468C] mb-1">Record New Admission Application</h4>
                      <p className="text-slate-500">Submit student credentials, parent details, and upload documents directly. This will automatically approve the admission, generate a Student ID, and provision the parent portal.</p>
                    </div>

                    {/* Student Details Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">1. Student Details</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Student Name</label>
                          <input
                            type="text" required placeholder="e.g. Tommy Jenkins"
                            value={admStdName} onChange={e => setAdmStdName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Date of Birth</label>
                          <input
                            type="date" required
                            value={admStdDob} onChange={e => setAdmStdDob(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-slate-600 font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Gender</label>
                          <select
                            value={admStdGender} onChange={e => setAdmStdGender(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Course</label>
                          <select
                            value={admStdClass} onChange={e => setAdmStdClass(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                          >
                            {courseOptions.map((course) => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Parent Details Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">2. Parent / Guardian Details</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Father's Full Name</label>
                          <input
                            type="text" required placeholder="e.g. John Jenkins"
                            value={admParentFather} onChange={e => setAdmParentFather(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Mother's Full Name</label>
                          <input
                            type="text" required placeholder="e.g. Clara Jenkins"
                            value={admParentMother} onChange={e => setAdmParentMother(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Email Address (Login Username)</label>
                          <input
                            type="email" required placeholder="e.g. parent@email.com"
                            value={admParentEmail} onChange={e => setAdmParentEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Phone Number</label>
                          <input
                            type="text" required placeholder="e.g. +91 98765 43210"
                            value={admParentPhone} onChange={e => setAdmParentPhone(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-bold text-slate-600">Home Address</label>
                          <input
                            type="text" required placeholder="e.g. 123 Sunshine Street, Sector 5"
                            value={admParentAddress} onChange={e => setAdmParentAddress(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <label className="font-bold text-slate-600">Provision Portal Password (defaults to "parent123" if empty)</label>
                          <input
                            type="text" placeholder="Provision login password for the parent..."
                            value={admParentPassword} onChange={e => setAdmParentPassword(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">3. Required Documents & Identity Proofs</h5>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-slate-600">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Birth Certificate (PDF / Image)</label>
                          <input
                            id="adm-cert-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmBirthCertificate(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Student Passport Size Photo (Image)</label>
                          <input
                            id="adm-photo-input"
                            type="file" accept=".png,.jpg,.jpeg"
                            onChange={e => setAdmPhoto(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Previous School Report Card / Marksheet (PDF / Image)</label>
                          <input
                            id="adm-report-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmReportCard(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Transfer Certificate (TC) (PDF / Image) (if applicable)</label>
                          <input
                            id="adm-tc-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmTransferCertificate(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Student Aadhaar Card (PDF / Image) (if available)</label>
                          <input
                            id="adm-aadhaar-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmAadhaarCard(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Father's Aadhaar Card (PDF / Image)</label>
                          <input
                            id="adm-father-aadhaar-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmFatherAadhaarCard(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Mother's Aadhaar Card (PDF / Image)</label>
                          <input
                            id="adm-mother-aadhaar-input"
                            type="file" accept=".pdf,.png,.jpg,.jpeg"
                            onChange={e => setAdmMotherAadhaarCard(e.target.files[0])}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-3 space-y-1 border sm:col-span-2 sm:grid-cols-2 bg-slate-100/50 rounded-2xl border-slate-200/50">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600">Address Proof Document Type</label>
                            <select
                              value={admAddressProofType}
                              onChange={e => setAdmAddressProofType(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600 text-xs"
                            >
                              <option value="Aadhaar Card">Aadhaar Card</option>
                              <option value="Electricity Bill">Electricity Bill</option>
                              <option value="Water Bill">Water Bill</option>
                              <option value="Rent Agreement">Rent Agreement</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600">Upload Selected Address Proof (PDF / Image)</label>
                            <input
                              id="adm-address-proof-input"
                              type="file" accept=".pdf,.png,.jpg,.jpeg"
                              onChange={e => setAdmAddressProof(e.target.files[0])}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admission Fees Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">4. Admission Fees Collection</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Admission Fee Amount (₹) (Not a dropdown)</label>
                          <input
                            type="number"
                            placeholder="Enter fee amount (e.g. 5000)"
                            value={admissionFee}
                            onChange={e => setAdmissionFee(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-700 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Primary action: collect payment (Cash / UPI) → student auto-saved */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleOpenAdmissionPayment}
                        className="flex items-center justify-center w-full gap-2 py-3 text-xs font-bold text-white transition-all shadow bg-brandCoral hover:bg-brandCoral-dark font-quicksand rounded-xl"
                      >
                        <Wallet className="w-4 h-4" />
                        PAY & CONFIRM ADMISSION (CASH / UPI)
                      </button>
                      <p className="text-[10px] text-center text-slate-400">
                        Collecting payment auto-registers the student. Use the option below to record without payment.
                      </p>
                      <button
                        type="submit"
                        className="w-full py-2.5 text-[11px] font-bold text-slate-500 transition-all border border-slate-200 bg-white hover:bg-slate-50 font-quicksand rounded-xl"
                      >
                        CREATE ADMISSION RECORD & PROVISION STUDENT
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-tab 3: Admissions History */}
                {admissionsSubTab === 'history' && (
                  <div className="space-y-4">
                    {admissions.filter(adm => adm.status !== 'pending').length === 0 ? (
                      <p className="py-10 text-xs font-medium text-center text-slate-500">No historic admission entries found.</p>
                    ) : (
                      admissions.filter(adm => adm.status !== 'pending').map(adm => (
                        <div key={adm._id} className="flex flex-col items-start justify-between gap-4 p-5 text-xs border bg-slate-50 border-slate-100 rounded-2xl sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <span className="block font-mono font-bold text-brandCoral">{adm.applicationNumber}</span>
                            <h4 className="text-sm font-bold font-quicksand text-slate-800">{adm.studentDetails?.name}</h4>
                            <p className="font-medium text-slate-500">Course: <span className="font-bold text-slate-800">{adm.studentDetails?.class}</span> | Parent: <span className="font-bold text-slate-800">{adm.parentDetails?.fatherName || adm.parentDetails?.motherName}</span></p>
                          </div>
                          <div className="flex items-center justify-between w-full gap-3 sm:w-auto sm:justify-end">
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${adm.status === 'approved' ? 'bg-brandMint/10 text-brandMint-dark border-brandMint/30' :
                              'bg-red-50 text-red-600 border border-red-100'
                              }`}>
                              {adm.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setParentPassword('');
                                setRemarks(adm.remarks || '');
                              }}
                              className="font-quicksand font-bold text-xs bg-[#9F92EC] hover:bg-[#8C7EB5] text-white px-4 py-2.5 rounded-xl shadow cursor-pointer transition-all active:scale-[0.98]"
                            >
                              VIEW DETAILS
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Users catalog */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 pb-4 border-b sm:flex-row sm:items-center border-orange-50">
                  <h3 className="text-lg font-bold font-quicksand text-slate-800">Students & Teachers Hub</h3>

                  {/* Sub-tabs selection */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUsersSubTab('registry')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${usersSubTab === 'registry'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Student Registry ({students.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsersSubTab('direct')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${usersSubTab === 'direct'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Direct Registration
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsersSubTab('teacher_form')}
                      className={`px-4 py-2 text-xs font-bold font-quicksand rounded-xl transition-all ${usersSubTab === 'teacher_form'
                        ? 'bg-[#9F92EC] text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Staff Teachers ({teachers.length})
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Student Registry Database */}
                {usersSubTab === 'registry' && (
                  <div className="space-y-4">
                    {/* Search and Filters panel */}
                    <div className="flex flex-col gap-3 p-4 text-xs border bg-slate-50 border-slate-100 rounded-3xl sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col flex-1 gap-2 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                          <Search className="absolute w-4 h-4 text-slate-400 left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Search student by name..."
                            value={studentSearchQuery}
                            onChange={e => setStudentSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                          />
                        </div>
                        <select
                          value={studentClassFilter}
                          onChange={e => setStudentClassFilter(e.target.value)}
                          className="bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                        >
                          <option value="">-- All Courses --</option>
                          {courseOptions.map((course) => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className="px-4 py-2.5 bg-slate-900 text-white font-quicksand font-bold rounded-xl flex items-center space-x-1.5 shadow hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintPDF}
                          className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-quicksand font-bold rounded-xl flex items-center space-x-1.5 shadow hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print List</span>
                        </button>
                      </div>
                    </div>

                    {/* Student Grid / List Table */}
                    <div className="overflow-x-auto bg-white border shadow-sm border-slate-100 rounded-3xl">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="p-4">Student ID</th>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Course</th>
                            <th className="p-4">Gender</th>
                            <th className="p-4">Parent Details</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium divide-y divide-slate-100 text-slate-700">
                          {students.filter(s => {
                            const classMatch = studentClassFilter ? s.class === studentClassFilter : true;
                            const nameMatch = s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
                            return classMatch && nameMatch;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-10 text-center text-slate-400">
                                No matching students found in the database.
                              </td>
                            </tr>
                          ) : (
                            students.filter(s => {
                              const classMatch = studentClassFilter ? s.class === studentClassFilter : true;
                              const nameMatch = s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
                              return classMatch && nameMatch;
                            }).map(std => (
                              <tr key={std._id} className="transition-all hover:bg-slate-50/50">
                                <td className="p-4 font-mono font-bold text-slate-850">
                                  {std.studentId || 'N/A'}
                                </td>
                                <td className="p-4">
                                  <span className="block text-sm font-bold text-slate-800 font-quicksand">{std.name}</span>
                                  <span className="text-[10px] text-slate-450 block mt-0.5">
                                    DOB: {std.dateOfBirth ? new Date(std.dateOfBirth).toLocaleDateString() : 'N/A'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#EAE8FC] text-[#7C3AED] border border-[#DEDAFB]">
                                    {std.class}
                                  </span>
                                </td>
                                <td className="p-4">{std.gender}</td>
                                <td className="p-4">
                                  <span className="block font-bold text-slate-800">
                                    {std.parentId?.name || std.parentDetails?.fatherName || std.parentDetails?.motherName || 'N/A'}
                                  </span>
                                  <span className="text-[10px] text-slate-450 block mt-0.5 font-mono">
                                    {std.parentId?.phone || std.parentDetails?.phone || 'N/A'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setSelectedStudentProfile(std)}
                                      className="px-3 py-1.5 font-bold text-[10px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                                    >
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleViewIdCard(std)}
                                      className="px-3 py-1.5 font-bold text-[10px] rounded-lg bg-[#FAF8F5] hover:bg-orange-50 text-brandCoral border border-orange-100/50 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Contact className="w-3 h-3" />
                                      <span>ID Card</span>
                                    </button>
                                    <button
                                      onClick={() => handleStartEditStudent(std)}
                                      className="px-3 py-1.5 font-bold text-[10px] rounded-lg bg-[#EAE8FC] hover:bg-[#DEDAFB] text-[#7C3AED] transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(std._id)}
                                      className="p-1.5 text-red-500 hover:text-red-705 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Direct Student Registration Form */}
                {usersSubTab === 'direct' && (
                  <form onSubmit={handleRegisterStudent} className="p-5 space-y-6 text-xs border bg-slate-50/50 border-slate-100 rounded-3xl">
                    <div>
                      <h4 className="text-sm font-bold font-quicksand text-[#5B468C] mb-1">Direct Student Registration Entry</h4>
                      <p className="font-semibold text-slate-500">Manually register an existing student directly into the active database. This assigns a unique Student ID and provisions parent credentials immediately.</p>
                    </div>

                    {/* Student Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">1. Student Profile</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Student Full Name</label>
                          <input
                            type="text" required placeholder="Full Name"
                            value={regStdName} onChange={e => setRegStdName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Date of Birth</label>
                          <input
                            type="date" required
                            value={regStdDob} onChange={e => setRegStdDob(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none text-slate-600 font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Gender</label>
                          <select
                            value={regStdGender} onChange={e => setRegStdGender(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Course</label>
                          <select
                            value={regStdClass} onChange={e => setRegStdClass(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                          >
                            {courseOptions.map((course) => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Parent Section */}
                    <div className="space-y-3">
                      <h5 className="pb-1 font-bold border-b text-slate-800 font-quicksand">2. Parent / Guardian Credentials</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Parent Full Name</label>
                          <input
                            type="text" required placeholder="Parent Full Name"
                            value={regParentName} onChange={e => setRegParentName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Email Address (Login Username)</label>
                          <input
                            type="email" required placeholder="parent@email.com"
                            value={regParentEmail} onChange={e => setRegParentEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Contact Phone Number</label>
                          <input
                            type="text" required placeholder="e.g. +91 99887 76655"
                            value={regParentPhone} onChange={e => setRegParentPhone(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Home Address</label>
                          <input
                            type="text" required placeholder="Home Address"
                            value={regParentAddress} onChange={e => setRegParentAddress(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-bold text-slate-600">Parent Password (defaults to "parent123" if empty)</label>
                          <input
                            type="text" placeholder="Set login password for parent portal..."
                            value={regParentPassword} onChange={e => setRegParentPassword(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 text-xs font-bold text-white transition-all shadow cursor-pointer bg-slate-900 hover:bg-slate-800 font-quicksand rounded-xl"
                    >
                      REGISTER STUDENT RECORD
                    </button>
                  </form>
                )}

                {/* Sub-tab 3: Staff Teachers & Hiring */}
                {usersSubTab === 'teacher_form' && (
                  <div className="space-y-6 text-xs">
                    {/* Hire Teacher Form */}
                    <form onSubmit={handleCreateTeacher} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                      <h4 className="font-quicksand font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                        <Plus className="w-4.5 h-4.5 text-brandCoral" />
                        <span>Hire & Register a New Teacher</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Full Name</label>
                          <input
                            type="text" required placeholder="Full Name"
                            value={tName} onChange={e => setTName(e.target.value)}
                            className="w-full bg-white border rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Email Address</label>
                          <input
                            type="email" required placeholder="Email Address"
                            value={tEmail} onChange={e => setTEmail(e.target.value)}
                            className="w-full bg-white border rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Login Password</label>
                          <input
                            type="password" required placeholder="Password"
                            value={tPassword} onChange={e => setTPassword(e.target.value)}
                            className="w-full bg-white border rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Contact Number</label>
                          <input
                            type="text" required placeholder="Contact Number"
                            value={tPhone} onChange={e => setTPhone(e.target.value)}
                            className="w-full bg-white border rounded-xl p-2.5 outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Qualifications (e.g. M.Ed.)</label>
                          <input
                            type="text" required placeholder="Qualifications (e.g. M.Ed.)"
                            value={tQual} onChange={e => setTQual(e.target.value)}
                            className="w-full bg-white border rounded-xl p-2.5 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Assigned Course</label>
                          <select
                            value={tClass} onChange={e => setTClass(e.target.value)}
                            className="w-full bg-[#0f172a] border rounded-xl p-2.5 outline-none font-semibold text-slate-600"
                          >
                            {courseOptions.map((course) => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 hover:bg-slate-850 text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow cursor-pointer">
                        HIRE STAFF MEMBER
                      </button>
                    </form>

                    {/* Teachers Roster List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold font-quicksand text-slate-800">Active Teachers Roster</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {teachers.map(teach => (
                          <div key={teach._id} className="flex flex-col justify-between p-4 space-y-2 text-xs bg-white border border-slate-100 rounded-2xl">
                            <div>
                              <span className="text-[9px] font-extrabold tracking-widest text-[#7C3AED] bg-[#EAE8FC] px-2.5 py-0.5 rounded-full uppercase">
                                {teach.qualifications || 'Staff Teacher'}
                              </span>
                              <h5 className="mt-2 text-sm font-bold font-quicksand text-slate-800">{teach.name || teach.userId?.name}</h5>
                              <div className="mt-1 space-y-0.5 text-slate-500 font-semibold">
                                <p>Email: <span className="font-mono text-slate-700">{teach.email || teach.userId?.email}</span></p>
                                <p>Phone: <span className="text-slate-700">{teach.phone || 'N/A'}</span></p>
                                <p>Assigned Course: <span className="font-bold text-brandCoral">{(teach.classesAssigned && teach.classesAssigned.join(', ')) || 'None'}</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Fees Manager */}
            {activeTab === 'fees' && (
              <div className="space-y-8">
                {/* Sub Tab Navigation */}
                <div className="flex gap-2 pb-3 border-b border-slate-100 print:hidden">
                  <button
                    onClick={() => setFeesSubTab('billing')}
                    className={`px-4 py-2.5 font-quicksand font-bold text-xs rounded-xl transition-all cursor-pointer ${feesSubTab === 'billing'
                        ? 'bg-[#5B468C] text-white shadow-sm'
                        : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                      }`}
                  >
                    Invoices & Cash Desk
                  </button>
                  <button
                    onClick={() => setFeesSubTab('fineRules')}
                    className={`px-4 py-2.5 font-quicksand font-bold text-xs rounded-xl transition-all cursor-pointer ${feesSubTab === 'fineRules'
                        ? 'bg-[#5B468C] text-white shadow-sm'
                        : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                      }`}
                  >
                    Fine Configuration Module
                  </button>
                </div>

                {feesSubTab === 'billing' && (
                  <div className="space-y-8">

                    {/* Generate Fee Invoice Form */}
                    <form onSubmit={handleCreateFee} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                      <h4 className="text-sm font-bold font-quicksand text-slate-800">Create Student Fee Invoice</h4>
                      <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">1. Filter by Course</label>
                          <select
                            value={feeClassFilter}
                            onChange={e => {
                              setFeeClassFilter(e.target.value);
                              setFeeStdId(''); // Clear selection
                            }}
                            className="bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 w-full outline-none font-semibold text-slate-600"
                          >
                            <option value="">-- All Courses --</option>
                            {courseOptions.map((course) => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-bold text-slate-600">2. Search & Select Student</label>
                          <input
                            type="text"
                            value={feeSearchQuery}
                            onChange={e => setFeeSearchQuery(e.target.value)}
                            placeholder="Type name to search..."
                            className="bg-white border border-slate-200 rounded-xl p-2.5 w-full outline-none text-xs"
                          />

                          <div className="mt-2 overflow-y-auto bg-white border divide-y shadow-inner max-h-32 border-orange-50 rounded-xl divide-slate-100">
                            {students.filter(s => {
                              const classMatch = feeClassFilter ? s.class === feeClassFilter : true;
                              const nameMatch = s.name.toLowerCase().includes(feeSearchQuery.toLowerCase());
                              return classMatch && nameMatch;
                            }).length === 0 ? (
                              <p className="p-3 text-xs text-center text-slate-400">No matching students found.</p>
                            ) : (
                              students.filter(s => {
                                const classMatch = feeClassFilter ? s.class === feeClassFilter : true;
                                const nameMatch = s.name.toLowerCase().includes(feeSearchQuery.toLowerCase());
                                return classMatch && nameMatch;
                              }).map(s => {
                                const isSelected = feeStdId === s._id;
                                return (
                                  <button
                                    key={s._id}
                                    type="button"
                                    onClick={() => {
                                      setFeeStdId(s._id);
                                      const matchedCourse = courses.find(c => String(c.title).toLowerCase() === String(s.class).toLowerCase());
                                      if (matchedCourse) {
                                        const totalPrice = Number(matchedCourse.price) || 0;
                                        const monthlySum = Math.round(totalPrice / 3);
                                        setFeeAmount(monthlySum.toString());
                                        setFeeFormBreakdown({
                                          courseTitle: matchedCourse.title,
                                          totalPrice,
                                          duration: matchedCourse.duration || '3 Months',
                                          durationMonths: 3,
                                          monthlySum
                                        });
                                        setFeeTerm('Month 1 Installment');
                                      } else {
                                        const monthlySum = 5000;
                                        setFeeAmount(monthlySum.toString());
                                        setFeeFormBreakdown({
                                          courseTitle: s.class || 'Unknown Course',
                                          totalPrice: 15000,
                                          duration: '3 Months',
                                          durationMonths: 3,
                                          monthlySum
                                        });
                                        setFeeTerm('Month 1 Installment');
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-all ${isSelected ? 'bg-orange-50 text-brandCoral font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                                  >
                                    <span>{s.name} ({s.class})</span>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {s._id}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                          {feeStdId && (
                            <div className="mt-2 text-xs font-bold text-brandMint-dark bg-brandMint/10 px-3 py-1.5 rounded-lg border border-brandMint/20 flex justify-between items-center">
                              <span>Selected Student: {students.find(s => s._id === feeStdId)?.name}</span>
                              <button type="button" onClick={() => setFeeStdId('')} className="text-red-500 hover:text-red-700">Clear</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Fee Amount (₹)</label>
                          <input
                            type="number"
                            value={feeAmount}
                            readOnly
                            placeholder="Select student to auto-assign"
                            required
                            className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 w-full outline-none font-bold text-[#5B468C] cursor-not-allowed"
                          />
                          {feeStdId && !feeFormBreakdown && (
                            <div className="text-[9px] text-red-500 font-bold mt-1 animate-pulse">
                              ⚠️ No active course found. Configure course price first.
                            </div>
                          )}
                          {feeFormBreakdown && (
                            <div className="text-[9px] text-emerald-600 font-bold mt-1">
                              ✓ Auto-assigned by Course Price
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Installment Period</label>
                          <select
                            value={feeTerm} onChange={e => setFeeTerm(e.target.value)}
                            className="bg-[#0f172a] border border-slate-200 rounded-xl p-2.5 w-full outline-none font-semibold text-slate-600"
                          >
                            {feeFormBreakdown ? (
                              Array.from({ length: feeFormBreakdown.durationMonths || 3 }).map((_, i) => (
                                <option key={i} value={`Month ${i + 1} Installment`}>
                                  Month {i + 1} Installment
                                </option>
                              ))
                            ) : (
                              <>
                                <option>Month 1 Installment</option>
                                <option>Month 2 Installment</option>
                                <option>Month 3 Installment</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">Due Date</label>
                          <input
                            type="date" required
                            value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl p-2.5 w-full outline-none text-slate-600 font-semibold"
                          />
                        </div>
                      </div>

                      {feeFormBreakdown && (
                        <div className="bg-[#5B468C]/5 border border-[#5B468C]/15 rounded-2xl p-4 space-y-2 text-xs font-semibold text-slate-700">
                          <h5 className="font-bold text-[#5B468C] uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#5B468C] animate-pulse" />
                            Course Fee Installment Breakdown ({feeFormBreakdown.courseTitle})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-[10px] leading-relaxed">
                            <div className="px-2 py-1 bg-white border rounded-lg border-slate-150">Total Course Price: <span className="font-bold text-slate-800">₹{feeFormBreakdown.totalPrice}</span></div>
                            <div className="px-2 py-1 bg-white border rounded-lg border-slate-150">Course Duration: <span className="font-bold text-slate-800">{feeFormBreakdown.duration}</span></div>
                            <div className="px-2 py-1 bg-white border rounded-lg border-slate-150">Monthly Installments: <span className="font-bold text-slate-800">{feeFormBreakdown.durationMonths} Months</span></div>
                          </div>
                          <div className="border-t border-[#5B468C]/10 pt-2 flex justify-between items-center text-xs font-bold text-[#5B468C] mt-2">
                            <span>Installment Fee Amount:</span>
                            <span>₹{feeFormBreakdown.monthlySum.toLocaleString('en-IN')}.00</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={feeStdId && !feeFormBreakdown}
                        className="w-full bg-[#5B468C] hover:bg-[#4a3973] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        BILL STUDENT INVOICE
                      </button>
                    </form>

                    {/* Organized Invoices list */}
                    <div className="space-y-4">
                      <div className="pt-6 border-t">
                        <h3 className="mb-4 text-base font-bold font-quicksand text-slate-800">Issued Invoices Ledger</h3>

                        {/* Stats Summary Cards */}
                        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
                          <div className="bg-[#FAF8F5] border border-orange-100 p-4 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Invoiced</span>
                            <span className="block mt-1 font-mono text-lg font-extrabold text-slate-800">
                              ₹{fees.reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-4 border bg-brandMint/5 border-brandMint/10 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-brandMint-dark block tracking-wider">Total Collected (Paid)</span>
                            <span className="block mt-1 font-mono text-lg font-extrabold text-brandMint-dark">
                              ₹{fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-4 border bg-rose-50 border-rose-100 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-rose-500 block tracking-wider">Total Outstanding (Pending)</span>
                            <span className="block mt-1 font-mono text-lg font-extrabold text-rose-600">
                              ₹{fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-1 gap-3 p-4 mb-4 text-xs border sm:grid-cols-3 bg-slate-50 border-slate-100 rounded-2xl">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Search Student Name</label>
                            <input
                              type="text"
                              value={listFeeSearchName}
                              onChange={e => setListFeeSearchName(e.target.value)}
                              placeholder="Search student..."
                              className="w-full p-2 bg-white border outline-none border-slate-200 rounded-xl"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Filter by Course</label>
                            <select
                              value={listFeeClassFilter}
                              onChange={e => setListFeeClassFilter(e.target.value)}
                              className="w-full p-2 font-semibold bg-white border outline-none border-slate-200 rounded-xl text-slate-600"
                            >
                              <option value="">-- All Courses --</option>
                              {courseOptions.map((course) => (
                                <option key={course} value={course}>{course}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Filter by Status</label>
                            <select
                              value={listFeeStatusFilter}
                              onChange={e => setListFeeStatusFilter(e.target.value)}
                              className="w-full p-2 font-semibold bg-white border outline-none border-slate-200 rounded-xl text-slate-600"
                            >
                              <option value="all">-- All Statuses --</option>
                              <option value="paid">Paid</option>
                              <option value="pending">Pending</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        </div>

                        {/* List Table */}
                        <div className="overflow-x-auto bg-white border shadow-sm border-slate-100 rounded-2xl">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-100 text-slate-500">
                                <th className="p-3">Student Name</th>
                                <th className="p-3">Course</th>
                                <th className="p-3">Term / Invoice</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Due Date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fees.filter(f => {
                                const studentInfo = getStudentInfo(f);
                                const nameMatch = studentInfo.name.toLowerCase().includes(listFeeSearchName.toLowerCase());
                                const classMatch = listFeeClassFilter ? studentInfo.class === listFeeClassFilter : true;
                                const statusMatch = listFeeStatusFilter === 'all' ? true : f.status === listFeeStatusFilter;
                                return nameMatch && classMatch && statusMatch;
                              }).length === 0 ? (
                                <tr>
                                  <td colSpan="7" className="p-8 font-medium text-center text-slate-400">
                                    No matching issued invoices found.
                                  </td>
                                </tr>
                              ) : (
                                fees.filter(f => {
                                  const studentInfo = getStudentInfo(f);
                                  const nameMatch = studentInfo.name.toLowerCase().includes(listFeeSearchName.toLowerCase());
                                  const classMatch = listFeeClassFilter ? studentInfo.class === listFeeClassFilter : true;
                                  const statusMatch = listFeeStatusFilter === 'all' ? true : f.status === listFeeStatusFilter;
                                  return nameMatch && classMatch && statusMatch;
                                }).map(f => {
                                  const sInfo = getStudentInfo(f);
                                  const isPaid = f.status === 'paid';
                                  return (
                                    <tr key={f._id} className="font-medium transition-all border-b border-slate-50 hover:bg-slate-50/50 text-slate-700">
                                      <td className="p-3">
                                        <span className="block text-xs font-bold text-slate-800">{sInfo.name}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">ID: {sInfo.id}</span>
                                      </td>
                                      <td className="p-3 font-bold text-slate-500">{sInfo.class}</td>
                                      <td className="p-3 text-slate-800">{f.term}</td>
                                      <td className="p-3 font-mono">
                                        <div className="font-bold text-slate-800">₹{f.amount.toLocaleString('en-IN')}</div>
                                        {f.fine > 0 && (
                                          <div className="text-[9px] text-red-500 font-semibold mt-0.5">
                                            + Fine: ₹{f.fine.toLocaleString('en-IN')}
                                          </div>
                                        )}
                                        {f.fine > 0 && (
                                          <div className="text-[10px] text-[#5B468C] font-extrabold mt-0.5">
                                            Total: ₹{f.totalAmount.toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3 text-slate-500">{new Date(f.dueDate).toLocaleDateString()}</td>
                                      <td className="p-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold border ${isPaid ? 'bg-brandMint/10 text-brandMint-dark border-brandMint/30' :
                                          f.status === 'overdue' ? 'bg-red-50 text-red-600 border border-red-100' :
                                            'bg-brandYellow/10 text-brandYellow-dark border border-brandYellow/30'
                                          }`}>
                                          {f.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        {isPaid ? (
                                          <button
                                            type="button"
                                            onClick={() => handleViewReceipt(f._id)}
                                            className="font-quicksand font-bold text-[9px] bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                                          >
                                            Print Receipt
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleCollectPayment(f._id)}
                                            className="font-quicksand font-bold text-[9px] bg-brandMint hover:bg-brandMint-dark text-white px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                                          >
                                            Collect Payment
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && feesSubTab === 'fineRules' && (
              <div className="space-y-6 text-xs print:hidden">
                {/* Add Fine Rule Inline Card */}
                <div className="p-5 space-y-4 border border-slate-100 bg-slate-50/50 rounded-3xl">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#5B468C]" />
                    <span>{editingFineId ? 'Modify Overdue Fine Rule' : 'Add Overdue Fine Rule'}</span>
                  </h4>
                  <form onSubmit={handleSaveFineRule} className="grid items-end grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Start Delay (Days) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 1"
                        value={fineFormData.minDays}
                        onChange={e => setFineFormData(prev => ({ ...prev, minDays: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 w-full outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">End Delay (Days) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 10"
                        value={fineFormData.maxDays}
                        onChange={e => setFineFormData(prev => ({ ...prev, maxDays: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 w-full outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-650">Fine Amount (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 50"
                        value={fineFormData.fineAmount}
                        onChange={e => setFineFormData(prev => ({ ...prev, fineAmount: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 w-full outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-grow py-2.5 bg-[#5B468C] hover:bg-[#4a3973] text-white font-quicksand font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                      >
                        {editingFineId ? 'Update Rule' : 'Create Rule'}
                      </button>
                      {editingFineId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFineId(null);
                            setFineFormData({ minDays: 1, maxDays: 10, fineAmount: 50 });
                          }}
                          className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Fine Rules List Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800">Current Overdue Fine Brackets</h4>
                  <div className="overflow-x-auto bg-white border shadow-sm border-slate-100 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="font-bold border-b bg-slate-50 text-slate-500 border-slate-150">
                          <th className="p-3">Delay Minimum (Days)</th>
                          <th className="p-3">Delay Maximum (Days)</th>
                          <th className="p-3">Penalty / Fine Amount</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold divide-y divide-slate-100 text-slate-600">
                        {fineRules.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-8 font-medium text-center text-slate-400">No fine brackets configured. Late fees will default to zero.</td>
                          </tr>
                        ) : (
                          fineRules.map(rule => (
                            <tr key={rule._id} className="transition-colors hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-[#5B468C]">{rule.minDays} Days</td>
                              <td className="p-3 font-mono text-[#5B468C]">{rule.maxDays} Days</td>
                              <td className="p-3 font-bold text-red-500">₹{rule.fineAmount.toLocaleString('en-IN')}.00</td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingFineId(rule._id);
                                      setFineFormData({
                                        minDays: rule.minDays,
                                        maxDays: rule.maxDays,
                                        fineAmount: rule.fineAmount
                                      });
                                    }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-55 rounded-lg transition-all cursor-pointer"
                                    title="Edit fine rule"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFineRule(rule._id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-55 rounded-lg transition-all cursor-pointer"
                                    title="Delete fine rule"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Announcements notice board */}
            {activeTab === 'announcements' && (
              <form onSubmit={handleCreateAnnouncement} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                <h4 className="text-sm font-bold font-quicksand text-slate-800">Publish Notice Board Circular</h4>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-600">Notice Title</label>
                  <input
                    type="text" required placeholder="e.g. Independence Day Holiday Notification"
                    value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                    className="w-full p-3 bg-white border outline-none rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Category</label>
                    <select value={annCat} onChange={e => setAnnCat(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                      <option value="general">General</option>
                      <option value="circular">Official Circular</option>
                      <option value="event">PTM / Event Schedule</option>
                      <option value="emergency">Emergency Alert</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Audience Group</label>
                    <select value={annAudience} onChange={e => setAnnAudience(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                      <option value="all">Everyone (All Visitors)</option>
                      <option value="parents">Parents Only</option>
                      <option value="teachers">Teachers Only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-600">Bulletin Content</label>
                  <textarea
                    required rows={4} placeholder="Write announcement notices description..."
                    value={annContent} onChange={e => setAnnContent(e.target.value)}
                    className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                  />
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow">
                  PUBLISH BULLETIN NOTICE
                </button>
              </form>
            )}

            {/* TAB 5B: Library & Notes */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <div className="p-5 border shadow-sm rounded-3xl border-slate-200/70 bg-slate-50/70">
                  <div className="flex flex-col gap-2 pb-4 border-b border-slate-200/70 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#7C3AED] font-bold">Library & Notes</p>
                      <h3 className="text-lg font-bold font-quicksand text-slate-800">Course-wise notes and revision material</h3>
                      <p className="text-xs text-slate-500">Publish quick study notes for each course batch from the admin side.</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-600">{libraryNotes.length} saved notes</span>
                  </div>

                  <form onSubmit={handleCreateLibraryNote} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1 text-xs">
                        <label className="font-bold text-slate-600">Note Title</label>
                        <input
                          type="text" required
                          value={libraryTitle}
                          onChange={(e) => setLibraryTitle(e.target.value)}
                          placeholder="e.g. Java Revision Checklist"
                          className="w-full p-3 bg-white border outline-none rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <label className="font-bold text-slate-600">Target Course</label>
                        <select
                          value={libraryCourse}
                          onChange={(e) => setLibraryCourse(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#0f172a]  p-2.5 outline-none font-semibold text-slate-600"
                        >
                          {courseOptions.map((course) => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-slate-600">Note Content</label>
                      <textarea
                        rows={4}
                        value={libraryContent}
                        onChange={(e) => setLibraryContent(e.target.value)}
                        placeholder="Optional text summary. If you upload a PDF, this can stay blank."
                        className="w-full p-3 bg-white border outline-none resize-none rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-slate-600">Choose PDF File</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setLibraryPdfFile(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-violet-100 file:px-3 file:py-1 file:text-xs file:font-bold file:text-violet-700"
                      />
                      <p className="text-[11px] text-slate-500">Upload a PDF directly, or enter text notes and the system will create a PDF for you.</p>
                    </div>

                    <button type="submit" className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-slate-800">SAVE COURSE NOTE</button>
                  </form>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="p-5 border shadow-sm rounded-3xl border-slate-200/70 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#7C3AED] font-bold">AI Quiz Creator</p>
                        <h3 className="text-base font-bold font-quicksand text-slate-800">Generate quizzes from course modules</h3>
                        <p className="text-xs text-slate-500">Create quick revision quizzes for specific students, group chats, or admin review.</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-[#7C3AED]" />
                    </div>
                    <form onSubmit={handleGenerateQuiz} className="mt-4 space-y-3 text-xs">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Course</span>
                          <select value={aiQuizCourse} onChange={(e) => setAiQuizCourse(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Module</span>
                          <input value={aiQuizModule} onChange={(e) => setAiQuizModule(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none" placeholder="e.g. Arrays & Loops" />
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Level</span>
                          <select value={aiQuizLevel} onChange={(e) => setAiQuizLevel(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Audience</span>
                          <select value={aiQuizAudience} onChange={(e) => setAiQuizAudience(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            {audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-1">
                        <span className="font-bold text-slate-600">Student Name (optional)</span>
                        <input value={aiQuizStudentName} onChange={(e) => setAiQuizStudentName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none" placeholder="e.g. Aarav Sharma" />
                      </label>
                      <button type="submit" disabled={quizLoading} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{quizLoading ? 'Generating quiz...' : 'Generate AI Quiz'}</button>
                    </form>
                    {quizResult && (
                      <article className="p-4 mt-4 text-xs bg-white border shadow-sm rounded-3xl border-violet-200 text-slate-600">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-violet-600 font-bold">Preview</p>
                        <h4 className="mt-1 text-sm font-black text-slate-800">{quizResult.title}</h4>
                        <p className="mt-1 text-slate-500">{quizResult.summary}</p>
                        <ul className="pl-4 mt-3 space-y-1 list-disc text-slate-600">{quizResult.questions.slice(0, 3).map((item, index) => <li key={`${item.prompt}-${index}`}>{item.prompt}</li>)}</ul>
                      </article>
                    )}
                  </section>

                  <section className="p-5 border shadow-sm rounded-3xl border-slate-200/70 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#7C3AED] font-bold">AI Assignment Generator</p>
                        <h3 className="text-base font-bold font-quicksand text-slate-800">Auto-create practice assignments</h3>
                        <p className="text-xs text-slate-500">Generate assignment briefs for a course, a specific learner, or a group chat.</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-[#7C3AED]" />
                    </div>
                    <form onSubmit={handleGenerateAssignment} className="mt-4 space-y-3 text-xs">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Course</span>
                          <select value={aiAssignmentCourse} onChange={(e) => setAiAssignmentCourse(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Module</span>
                          <input value={aiAssignmentModule} onChange={(e) => setAiAssignmentModule(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none" placeholder="e.g. Problem Solving" />
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Audience</span>
                          <select value={aiAssignmentAudience} onChange={(e) => setAiAssignmentAudience(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            {audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">Difficulty</span>
                          <select value={aiAssignmentDifficulty} onChange={(e) => setAiAssignmentDifficulty(e.target.value)} className="w-full rounded-xl   bg-[#0f172a] p-2.5 outline-none font-semibold text-slate-600">
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-1">
                        <span className="font-bold text-slate-600">Student Name (optional)</span>
                        <input value={aiAssignmentStudentName} onChange={(e) => setAiAssignmentStudentName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none" placeholder="e.g. Student A" />
                      </label>
                      <button type="submit" disabled={assignmentLoading} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{assignmentLoading ? 'Generating assignment...' : 'Generate AI Assignment'}</button>
                    </form>
                    {assignmentResult && (
                      <article className="p-4 mt-4 text-xs bg-white border shadow-sm rounded-3xl border-emerald-200 text-slate-600">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-600 font-bold">Preview</p>
                        <h4 className="mt-1 text-sm font-black text-slate-800">{assignmentResult.title}</h4>
                        <p className="mt-1 text-slate-500">{assignmentResult.summary}</p>
                        <ul className="pl-4 mt-3 space-y-1 list-disc text-slate-600">{assignmentResult.tasks.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                      </article>
                    )}
                  </section>
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="pb-2 text-base font-bold border-b border-slate-200/70 font-quicksand text-slate-800">Recent Course Notes</h3>
                  {libraryNotes.length === 0 ? (
                    <div className="p-8 text-xs text-center border border-dashed rounded-3xl border-slate-200 bg-white/70 text-slate-500">No course notes yet. Add your first revision note above.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {libraryNotes.map(note => (
                        <article key={note._id} className="p-4 bg-white border shadow-sm rounded-3xl border-slate-200/70">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-[#7C3AED] font-bold">{note.course}</p>
                              <h4 className="mt-1 text-sm font-bold font-quicksand text-slate-800">{note.title}</h4>
                            </div>
                            <button
                              onClick={() => handleDeleteLibraryNote(note._id)}
                              className="p-2 text-red-500 transition-all border border-red-100 rounded-lg bg-red-50 hover:bg-red-100"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-slate-600">{note.content}</p>
                          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-slate-400">Saved {new Date(note.createdAt).toLocaleString()}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5B: Job Postings */}
            {activeTab === 'jobs' && (
              <div className="space-y-8">
                <form onSubmit={handleCreateJob} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800">Post New Job Vacancy</h4>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Job Title *</label>
                      <input
                        type="text" required placeholder="e.g. Senior Teacher - English"
                        value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Department *</label>
                      <select value={jobDepartment} onChange={e => setJobDepartment(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                        <option value="teaching">Teaching</option>
                        <option value="administration">Administration</option>
                        <option value="support">Support Staff</option>
                        <option value="management">Management</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Position Level *</label>
                      <select value={jobPosition} onChange={e => setJobPosition(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                        <option value="manager">Manager</option>
                        <option value="director">Director</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Salary (Monthly) *</label>
                      <input
                        type="number" required placeholder="e.g. 50000"
                        value={jobSalary} onChange={e => setJobSalary(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Job Description *</label>
                    <textarea
                      required rows={3} placeholder="Detailed job description..."
                      value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                      className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Required Qualifications *</label>
                    <textarea
                      required rows={2} placeholder="e.g. B.Ed with English specialization, M.A. preferred"
                      value={jobQualifications} onChange={e => setJobQualifications(e.target.value)}
                      className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Experience Required *</label>
                      <input
                        type="text" required placeholder="e.g. 5+ years"
                        value={jobExperience} onChange={e => setJobExperience(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Application Deadline *</label>
                      <input
                        type="date" required
                        value={jobDeadline} onChange={e => setJobDeadline(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Key Responsibilities *</label>
                    <textarea
                      required rows={2} placeholder="Main responsibilities for this role..."
                      value={jobResponsibilities} onChange={e => setJobResponsibilities(e.target.value)}
                      className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Benefits (Optional)</label>
                      <input
                        type="text" placeholder="e.g. Health insurance, professional development"
                        value={jobBenefits} onChange={e => setJobBenefits(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Location</label>
                      <input
                        type="text" placeholder="e.g. On-site"
                        value={jobLocation} onChange={e => setJobLocation(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-slate-900 text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow hover:bg-slate-800">
                    POST JOB VACANCY
                  </button>
                </form>

                {/* Job Listings */}
                <div className="space-y-4">
                  <h3 className="pb-2 text-base font-bold border-b font-quicksand text-slate-800">Active Job Postings</h3>
                  {jobsList && jobsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {jobsList.map(job => (
                        <div key={job._id} className="flex flex-col justify-between p-4 overflow-hidden text-xs bg-white border shadow-sm border-slate-100 rounded-xl">
                          <div>
                            <h5 className="mb-1 font-bold text-slate-800">{job.title}</h5>
                            <p className="mb-2 text-xs text-slate-600">{job.department} • {job.position}</p>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                              <div className="p-2 rounded bg-blue-50">
                                <span className="text-slate-600">Salary: </span>
                                <span className="font-bold text-slate-800">₹{job.salary}</span>
                              </div>
                              <div className="p-2 rounded bg-green-50">
                                <span className="text-slate-600">Deadline: </span>
                                <span className="font-bold text-slate-800">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <p className="mb-2 text-slate-600 line-clamp-2">{job.description}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {job.status.toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleDeleteJob(job._id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete job posting"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      <p className="text-sm">No job postings yet. Create your first opening above!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5C: Courses Manager */}
            {activeTab === 'courses' && (
              <div className="space-y-8">
                {/* Create Course Form */}
                <form onSubmit={handleCreateCourse} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800">Add New Course to Programs Page</h4>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Course Title</label>
                      <input
                        type="text" required placeholder="e.g. Java Development"
                        value={courseTitle} onChange={e => setCourseTitle(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Duration</label>
                      <input
                        type="text" placeholder="e.g. 1 month - 6 months"
                        value={courseDuration} onChange={e => setCourseDuration(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Price (INR)</label>
                      <input
                        type="number" required placeholder="e.g. 1500"
                        value={coursePrice} onChange={e => setCoursePrice(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Course Description</label>
                    <textarea
                      required rows={3} placeholder="Describe what this course covers..."
                      value={courseDescription} onChange={e => setCourseDescription(e.target.value)}
                      className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Category</label>
                      <select value={courseCategory} onChange={e => setCourseCategory(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                        <option value="development">Development</option>
                        <option value="design">Design</option>
                        <option value="marketing">Marketing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Card Color Theme</label>
                      <select value={courseColor} onChange={e => setCourseColor(e.target.value)} className="bg-white border rounded-xl p-2.5 w-full outline-none">
                        <option value="brandMint">Mint (Green)</option>
                        <option value="brandSky">Sky (Blue)</option>
                        <option value="brandCoral">Coral (Red)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Key Milestones (one per line)</label>
                    <textarea
                      rows={4} placeholder={"e.g.\nUnderstanding of java syntax\nAbility to write simple programs\nFamiliarity with OOP principles"}
                      value={courseMilestones} onChange={e => setCourseMilestones(e.target.value)}
                      className="w-full p-3 bg-white border outline-none resize-none rounded-xl"
                    />
                  </div>

                  {/* Schedule editor */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-600">Daily Schedule</label>
                      <button type="button" onClick={addScheduleRow} className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[10px]">
                        <Plus className="w-3 h-3" />
                        <span>ADD SLOT</span>
                      </button>
                    </div>
                    {courseSchedules.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text" placeholder="05:00 PM"
                          value={row.time} onChange={e => updateScheduleRow(idx, 'time', e.target.value)}
                          className="w-32 p-2.5 bg-white border outline-none rounded-xl"
                        />
                        <input
                          type="text" placeholder="Class / Activity description"
                          value={row.activity} onChange={e => updateScheduleRow(idx, 'activity', e.target.value)}
                          className="flex-1 p-2.5 bg-white border outline-none rounded-xl"
                        />
                        {courseSchedules.length > 1 && (
                          <button type="button" onClick={() => removeScheduleRow(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Course Image (optional, JPG/JPEG/PNG)</label>
                    <input
                      id="course-file-input"
                      type="file" accept=".jpg,.jpeg,.png"
                      onChange={e => setCourseImage(e.target.files?.[0] || null)}
                      className="w-full p-3 bg-white border border-orange-100 outline-none rounded-xl"
                    />
                  </div>

                  <button type="submit" className="w-full bg-slate-900 text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow">
                    PUBLISH COURSE
                  </button>
                </form>

                {/* Existing Courses List */}
                <div className="space-y-4">
                  <h3 className="pb-2 text-base font-bold border-b font-quicksand text-slate-800">Published Courses ({courses.length})</h3>
                  {courses.length === 0 ? (
                    <p className="py-10 text-xs text-center text-slate-500">No courses published yet. Add your first course above.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {courses.map(course => (
                        <div 
                          key={course._id} 
                          onClick={() => handleSelectCourse(course)}
                          className={`flex flex-col justify-between overflow-hidden text-xs bg-white border shadow-sm border-slate-100 rounded-xl cursor-pointer transition-all ${selectedCourse?._id === course._id ? 'ring-2 ring-brandSky' : ''}`}
                        >
                          {course.imageUrl && (
                            <div className="relative h-32 overflow-hidden">
                              <img src={course.imageUrl} alt={course.title} className="object-cover w-full h-full" />
                            </div>
                          )}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold leading-tight font-quicksand text-slate-800">{course.title}</h4>
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                course.color === 'brandMint' ? 'bg-brandMint/10 text-brandMint-dark' :
                                course.color === 'brandSky' ? 'bg-brandSky/10 text-brandSky-dark' :
                                'bg-brandCoral/10 text-brandCoral-dark'
                              }`}>{course.category}</span>
                            </div>
                            <p className="text-slate-500 line-clamp-3">{course.description}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              {course.duration && <span>⏱ {course.duration}</span>}
                              <span className="font-bold text-brandCoral-dark">₹{course.price || 0}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{course.milestones?.length || 0} milestones • {course.schedule?.length || 0} schedule slots • {modules.filter(m => m.course === course._id).length || 0} modules</p>
                          </div>
                          <div className="flex justify-end p-3 pt-0 gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCoursePublish(course);
                              }}
                              className={`px-3 py-1.5 rounded-lg transition-all border flex items-center space-x-1 font-bold text-[10px] ${
                                course.isPublished
                                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              }`}
                            >
                              {course.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{course.isPublished ? 'LIVE' : 'DRAFT'}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCourse(course._id);
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg transition-all border border-red-100 flex items-center space-x-1 font-bold text-[10px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>DELETE</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Module & Lesson Management */}
                {selectedCourse && (
                  <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
                      <h3 className="text-base font-bold font-quicksand">Managing: {selectedCourse.title}</h3>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/lms/learn/${selectedCourse._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold px-3 py-1 bg-brandSky/80 hover:bg-brandSky rounded-lg flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Preview Student View
                        </a>
                        <button
                          onClick={() => {
                            setSelectedCourse(null);
                            setModules([]);
                            setSelectedModule(null);
                            setLessons([]);
                          }}
                          className="text-xs font-bold px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Modules Section */}
                      <div className="space-y-4">
                        <form onSubmit={handleCreateModule} className="p-4 border bg-slate-50/50 border-slate-100 rounded-2xl">
                          <h4 className="text-sm font-bold font-quicksand text-slate-800 mb-3">Add Module</h4>
                          <div className="space-y-3 text-xs">
                            <input
                              type="text"
                              placeholder="Module Title"
                              value={moduleTitle}
                              onChange={e => setModuleTitle(e.target.value)}
                              className="w-full p-2.5 bg-white border rounded-xl outline-none"
                              required
                            />
                            <textarea
                              placeholder="Module Description"
                              value={moduleDescription}
                              onChange={e => setModuleDescription(e.target.value)}
                              className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none"
                              rows={2}
                            />
                            <AttachmentManager
                              attachments={moduleAttachments}
                              onAdd={fileObj => setModuleAttachments(prev => [...prev, fileObj])}
                              onDelete={idx => setModuleAttachments(prev => prev.filter((_, i) => i !== idx))}
                            />
                            <button type="submit" className="w-full bg-brandSky text-white font-bold py-2 rounded-xl">
                              ADD MODULE
                            </button>
                          </div>
                        </form>

                        <div className="space-y-2">
                          <h4 className="text-sm font-bold font-quicksand text-slate-800">Modules ({modules.length})</h4>
                          {modules.map(module => (
                            <div 
                              key={module._id} 
                              onClick={() => handleSelectModule(module)}
                              className={`p-3 border rounded-xl cursor-pointer transition-all ${selectedModule?._id === module._id ? 'border-brandSky bg-brandSky/5' : 'border-slate-200 bg-white'}`}
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs text-slate-800">{module.title}</h5>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${module.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {module.isPublished ? 'LIVE' : 'DRAFT'}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleModulePublish(module); }}
                                    title={module.isPublished ? 'Unpublish' : 'Publish'}
                                    className={`p-1 rounded-lg ${module.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                  >
                                    {module.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditModule(module); }}
                                    title="Edit Module"
                                    className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteModule(module._id);
                                    }}
                                    className="text-red-500 hover:text-red-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {module.description && <p className="text-[10px] text-slate-500 mt-1">{module.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Lessons Section */}
                      <div className="space-y-4">
                        {selectedModule ? (
                          <>
                            {/* Edit Module Modal */}
                            {editingModule && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                  <div className="flex items-center justify-between p-5 border-b text-slate-800">
                                    <h4 className="font-bold font-quicksand">Edit Module</h4>
                                    <button onClick={() => setEditingModule(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <form onSubmit={handleUpdateModule} className="p-5 space-y-4 text-xs text-slate-800">
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Module Title</label>
                                      <input type="text" required value={editModuleTitle} onChange={e => setEditModuleTitle(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Description</label>
                                      <textarea value={editModuleDescription} onChange={e => setEditModuleDescription(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none" rows={3} />
                                    </div>
                                    <AttachmentManager
                                      attachments={editModuleAttachments}
                                      onAdd={fileObj => setEditModuleAttachments(prev => [...prev, fileObj])}
                                      onDelete={idx => setEditModuleAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    />
                                    <div className="flex gap-2 pt-2">
                                      <button type="submit" className="flex-1 bg-brandSky text-white font-bold py-2.5 rounded-xl">
                                        Save Changes
                                      </button>
                                      <button type="button" onClick={() => setEditingModule(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold">Cancel</button>
                                    </div>
                                  </form>
                                </div>
                              </div>
                            )}

                            {/* Edit Lesson Modal */}
                            {editingLesson && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                  <div className="flex items-center justify-between p-5 border-b">
                                    <h4 className="font-bold font-quicksand text-slate-800">Edit Lesson</h4>
                                    <button onClick={() => setEditingLesson(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <form onSubmit={handleUpdateLesson} className="p-5 space-y-3 text-xs">
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Title</label>
                                      <input type="text" required value={editLessonTitle} onChange={e => setEditLessonTitle(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Description</label>
                                      <textarea value={editLessonDescription} onChange={e => setEditLessonDescription(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none" rows={2} />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Content (text or HTML)</label>
                                      <textarea value={editLessonContent} onChange={e => setEditLessonContent(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none" rows={3} />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Video URL (YouTube / external)</label>
                                      <input type="text" placeholder="https://..." value={editLessonVideoUrl} onChange={e => setEditLessonVideoUrl(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Replace Video File (MP4/WEBM/MOV, max 500MB)</label>
                                      <input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={e => setEditLessonVideoFile(e.target.files?.[0] || null)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="font-bold text-slate-600">Duration (seconds)</label>
                                      <input type="number" placeholder="e.g. 300" value={editLessonVideoDuration} onChange={e => setEditLessonVideoDuration(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={editLessonPublished} onChange={e => setEditLessonPublished(e.target.checked)} className="w-4 h-4 accent-green-500" />
                                      <span className="font-bold text-slate-600">Published (visible to students)</span>
                                    </label>
                                    <AttachmentManager
                                      attachments={editLessonAttachments}
                                      onAdd={fileObj => setEditLessonAttachments(prev => [...prev, fileObj])}
                                      onDelete={idx => setEditLessonAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    />
                                    {videoUploading && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                          <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Uploading video...</span>
                                          <span className="font-bold">{videoUploadProgress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-brandSky transition-all duration-200 rounded-full" style={{ width: `${videoUploadProgress}%` }} />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                      <button type="submit" disabled={videoUploading} className="flex-1 bg-brandSky text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
                                        {videoUploading ? `Uploading ${videoUploadProgress}%...` : 'Save Changes'}
                                      </button>
                                      <button type="button" onClick={() => setEditingLesson(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold">Cancel</button>
                                    </div>
                                  </form>
                                </div>
                              </div>
                            )}

                            <form onSubmit={handleCreateLesson} className="p-4 border bg-slate-50/50 border-slate-100 rounded-2xl">
                              <h4 className="text-sm font-bold font-quicksand text-slate-800 mb-3">Add Lesson to "{selectedModule.title}"</h4>
                              <div className="space-y-3 text-xs">
                                <input
                                  type="text"
                                  placeholder="Lesson Title *"
                                  value={lessonTitle}
                                  onChange={e => setLessonTitle(e.target.value)}
                                  className="w-full p-2.5 bg-white border rounded-xl outline-none"
                                  required
                                />
                                <textarea
                                  placeholder="Lesson Description"
                                  value={lessonDescription}
                                  onChange={e => setLessonDescription(e.target.value)}
                                  className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none"
                                  rows={2}
                                />
                                <textarea
                                  placeholder="Lesson Content (text or HTML, optional)"
                                  value={lessonContent}
                                  onChange={e => setLessonContent(e.target.value)}
                                  className="w-full p-2.5 bg-white border rounded-xl outline-none resize-none"
                                  rows={2}
                                />
                                {/* Video source — URL or file, mutually highlighted */}
                                <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                                  <p className="font-bold text-slate-700 text-[11px] flex items-center gap-1"><Video className="w-3.5 h-3.5 text-brandSky" /> Video Source (choose one)</p>
                                  <input
                                    type="text"
                                    placeholder="Option A: Paste YouTube / external URL"
                                    value={lessonVideoUrl}
                                    onChange={e => { setLessonVideoUrl(e.target.value); if (e.target.value) { setLessonVideoFile(null); const fi = document.getElementById('lesson-video-input'); if (fi) fi.value = ''; } }}
                                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none"
                                  />
                                  <div className="flex items-center gap-2 text-slate-400 text-[10px]"><span className="flex-1 h-px bg-slate-200"/><span>OR</span><span className="flex-1 h-px bg-slate-200"/></div>
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-600">Option B: Upload video file (MP4 / WEBM / MOV, max 500MB)</label>
                                    <input
                                      id="lesson-video-input"
                                      type="file"
                                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                      onChange={e => {
                                        const f = e.target.files?.[0] || null;
                                        setLessonVideoFile(f);
                                        if (f) {
                                          setLessonVideoUrl('');
                                          setVideoPreviewUrl(URL.createObjectURL(f));
                                        } else {
                                          setVideoPreviewUrl('');
                                        }
                                      }}
                                      className="w-full p-2 bg-slate-50 border rounded-xl outline-none"
                                    />
                                    {videoPreviewUrl && (
                                      <video src={videoPreviewUrl} controls className="w-full rounded-xl mt-1 max-h-36 object-contain bg-black" />
                                    )}
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  placeholder="Video Duration in seconds (e.g. 300 for 5 min)"
                                  value={lessonVideoDuration}
                                  onChange={e => setLessonVideoDuration(e.target.value)}
                                  className="w-full p-2.5 bg-white border rounded-xl outline-none"
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={lessonIsPublished} onChange={e => setLessonIsPublished(e.target.checked)} className="w-4 h-4 accent-green-500" />
                                  <span className="font-bold text-slate-600">Publish immediately (visible to enrolled students)</span>
                                </label>
                                <AttachmentManager
                                  attachments={lessonAttachments}
                                  onAdd={fileObj => setLessonAttachments(prev => [...prev, fileObj])}
                                  onDelete={idx => setLessonAttachments(prev => prev.filter((_, i) => i !== idx))}
                                />
                                {videoUploading && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                                      <span className="flex items-center gap-1"><Upload className="w-3 h-3 animate-bounce" /> Uploading video — please wait...</span>
                                      <span className="font-bold text-brandSky">{videoUploadProgress}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-brandSky to-blue-500 transition-all duration-300 rounded-full" style={{ width: `${videoUploadProgress}%` }} />
                                    </div>
                                    <p className="text-[9px] text-slate-400">Large files may take a few minutes. Don't close this tab.</p>
                                  </div>
                                )}
                                <button
                                  type="submit"
                                  disabled={videoUploading}
                                  className="w-full bg-brandMint text-brandMint-dark font-bold py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                  {videoUploading
                                    ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />{videoUploadProgress}% Uploading...</>
                                    : <><Plus className="w-4 h-4" />ADD LESSON</>
                                  }
                                </button>
                              </div>
                            </form>

                            <div className="space-y-2">
                              <h4 className="text-sm font-bold font-quicksand text-slate-800">Lessons ({lessons.length})</h4>
                              {lessons.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4">No lessons yet. Add one above.</p>
                              )}
                              {lessons.map(lesson => (
                                <div key={lesson._id} className="p-3 border border-slate-200 bg-white rounded-xl">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-bold text-xs text-slate-800 truncate">{lesson.title}</h5>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${lesson.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {lesson.isPublished ? 'LIVE' : 'DRAFT'}
                                        </span>
                                      </div>
                                      {lesson.description && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{lesson.description}</p>}
                                      {lesson.videoUrl && (
                                        <p className="text-[10px] text-brandSky mt-0.5 flex items-center gap-1">
                                          <Video className="w-3 h-3" />
                                          {lesson.videoUrl.startsWith('/uploads') ? 'Local video file' : lesson.videoUrl.substring(0, 40) + '...'}
                                        </p>
                                      )}
                                      {lesson.videoDuration > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />{Math.floor(lesson.videoDuration / 60)}m {lesson.videoDuration % 60}s
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleToggleLessonPublish(lesson)}
                                        title={lesson.isPublished ? 'Unpublish' : 'Publish'}
                                        className={`p-1.5 rounded-lg transition-all ${lesson.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                      >
                                        {lesson.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={() => handleEditLesson(lesson)}
                                        className="p-1.5 text-brandSky hover:bg-blue-50 rounded-lg transition-all"
                                        title="Edit lesson"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLesson(lesson._id)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Delete lesson"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500">
                            Select a module to add lessons
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: Gallery Manager */}
            {activeTab === 'gallery' && (
              <div className="space-y-8">
                <form onSubmit={handleCreateGallery} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800">Add Media Album to Gallery</h4>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Media Title</label>
                      <input
                        type="text" required placeholder="e.g. Toddler Sandbox Activities"
                        value={galTitle} onChange={e => setGalTitle(e.target.value)}
                        className="w-full p-3 bg-white border outline-none rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Category Tag</label>
                      <select value={galCat} onChange={e => setGalCat(e.target.value)} className="bg-[#0f172a] border rounded-xl p-2.5 w-full outline-none font-semibold text-slate-600">
                        <option value="classroom">Classroom</option>
                        <option value="events">Events</option>
                        <option value="sports">Sports</option>
                        <option value="celebrations">Celebrations</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Media Image File (JPG/JPEG/PNG)</label>
                    <input
                      id="gallery-file-input"
                      type="file" required accept=".jpg,.jpeg,.png"
                      onChange={e => setGalFile(e.target.files[0])}
                      className="w-full p-3 bg-white border border-orange-100 outline-none focus:border-brandCoral rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Description</label>
                    <input
                      type="text" placeholder="Short description of the photo event..."
                      value={galDesc} onChange={e => setGalDesc(e.target.value)}
                      className="w-full p-3 bg-white border outline-none rounded-xl"
                    />
                  </div>

                  <button type="submit" className="w-full bg-slate-900 text-white font-quicksand font-bold text-xs py-2.5 rounded-xl transition-all shadow">
                    ADD MEDIA FILE
                  </button>
                </form>

                {/* Gallery Items List */}
                <div className="space-y-4">
                  <h3 className="pb-2 text-base font-bold border-b font-quicksand text-slate-800">Existing Gallery Media</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {galItems.map(item => (
                      <div key={item._id} className="flex flex-col justify-between overflow-hidden text-xs bg-white border shadow-sm border-slate-100 rounded-xl">
                        <div>
                          <div className="relative h-32 overflow-hidden">
                            <img src={item.url} alt={item.title} className="object-cover w-full h-full" />
                            <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {item.category}
                            </span>
                          </div>
                          <div className="p-3 space-y-1">
                            <h4 className="text-sm font-bold leading-tight font-quicksand text-slate-800">{item.title}</h4>
                            <p className="text-slate-500 line-clamp-2">{item.description || 'No description'}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">Date posted: {new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex justify-end p-3 pt-0">
                          <button
                            onClick={() => handleDeleteGallery(item._id)}
                            className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg transition-all border border-red-100 flex items-center space-x-1 font-bold text-[10px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>DELETE</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: Queries Resolve */}
            {activeTab === 'queries' && (
              <div className="space-y-4 text-xs font-semibold text-slate-600">
                <h3 className="pb-3 text-lg font-bold border-b font-quicksand text-slate-800 border-orange-50">Visitor Query Tickets</h3>

                {queries.length === 0 ? (
                  <p className="py-10 text-xs text-center text-slate-500">No queries tickets generated yet.</p>
                ) : (
                  queries.map(q => (
                    <div key={q._id} className="p-4 space-y-3 border bg-slate-50 border-slate-100 rounded-xl">
                      <div className="flex items-start justify-between pb-2 border-b border-slate-200/50">
                        <div>
                          <h4 className="text-sm font-bold font-quicksand text-slate-800">{q.name}</h4>
                          <span className="font-medium text-slate-400">{q.email} | {q.phone}</span>
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${q.status === 'resolved' ? 'bg-brandMint/10 text-brandMint-dark border-brandMint/30' :
                          'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                          {q.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-brandCoral block uppercase font-bold">{q.subject}</span>
                        <p className="mt-1 font-normal leading-relaxed text-slate-600">{q.message}</p>
                      </div>

                      {q.status !== 'resolved' && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleResolveQuery(q._id)}
                            className="px-4 py-2 text-white transition-all shadow bg-brandMint hover:bg-brandMint-dark rounded-xl"
                          >
                            MARK RESOLVED
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'meetings' && (
              <div className="space-y-6">
                <h3 className="pb-3 text-lg font-bold border-b font-quicksand text-slate-800 border-orange-50">Google Meet Manager</h3>

                {/* Creation Form */}
                <form onSubmit={handleCreateMeeting} className="p-5 space-y-4 border bg-slate-50/50 border-slate-100 rounded-3xl">
                  <h4 className="text-sm font-bold font-quicksand text-slate-800">Schedule a New Meeting</h4>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Meeting Title</label>
                      <input
                        type="text"
                        required
                        value={mtgTitle}
                        onChange={(e) => setMtgTitle(e.target.value)}
                        placeholder="e.g. Term 1 PTM"
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={mtgStartTime}
                        onChange={(e) => setMtgStartTime(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Duration (min)</label>
                      <input
                        type="number"
                        min="5"
                        value={mtgDuration}
                        onChange={(e) => setMtgDuration(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Audience</label>
                      <select
                        value={mtgAudience}
                        onChange={(e) => setMtgAudience(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      >
                        <option value="all">Everyone</option>
                        <option value="parents">Parents</option>
                        <option value="teachers">Teachers</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Class Filter (optional)</label>
                      <select
                        value={mtgClassFilter}
                        onChange={(e) => setMtgClassFilter(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      >
                        <option value="">All classes</option>
                        {courseOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-600">Description (optional)</label>
                    <textarea
                      rows={2}
                      value={mtgDescription}
                      onChange={(e) => setMtgDescription(e.target.value)}
                      placeholder="Agenda or notes for attendees"
                      className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl resize-none"
                    />
                  </div>

                  <div className="p-3 space-y-2 text-xs border border-dashed border-slate-200 rounded-xl bg-white/50">
                    <p className="font-bold text-slate-500">
                      Google Meet link <span className="font-normal text-slate-400">(paste a https://meet.google.com/ link — auto-generated if a Google service account is configured)</span>
                    </p>
                      <input
                        type="url"
                        value={mtgJoinUrl}
                        onChange={(e) => setMtgJoinUrl(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="w-full p-2.5 border border-slate-200 outline-none bg-white focus:border-brandCoral rounded-xl"
                      />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 font-quicksand font-bold text-xs bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" />
                      SCHEDULE MEETING
                    </button>
                  </div>
                </form>

                {/* Meetings List */}
                <div className="space-y-3">
                  <h4 className="pb-2 text-sm font-bold border-b font-quicksand text-slate-800 border-slate-100">Scheduled Meetings ({meetings.length})</h4>
                  {meetings.length === 0 ? (
                    <p className="py-10 text-xs text-center text-slate-500">No meetings scheduled yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {meetings.map((m) => {
                        const start = new Date(m.startTime);
                        const isOwner = m.status !== 'cancelled';
                        return (
                          <div key={m._id} className="flex flex-col justify-between p-4 space-y-3 bg-white border shadow-sm border-slate-100 rounded-xl">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${m.targetAudience === 'parents' ? 'bg-brandSky/10 text-brandSky-dark border-brandSky/30' : m.targetAudience === 'teachers' ? 'bg-brandLavender/10 text-brandLavender-dark border-brandLavender/30' : 'bg-brandMint/10 text-brandMint-dark border-brandMint/30'}`}>
                                  {m.targetAudience}
                                </span>
                                <span className="text-[9px] uppercase font-bold text-slate-400">{m.status}</span>
                              </div>
                              <h5 className="text-sm font-bold font-quicksand text-slate-800">{m.title}</h5>
                              <p className="text-[11px] text-slate-500">
                                {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.durationMinutes || 60} min
                              </p>
                              {m.hostName && <p className="text-[10px] text-slate-400">Host: {m.hostName}</p>}
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                              <a
                                href={m.joinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white transition-all rounded-lg bg-brandSky hover:bg-brandSky-dark"
                              >
                                <Video className="w-3.5 h-3.5" /> JOIN
                              </a>
                              {isOwner && (
                                <button
                                  onClick={() => handleDeleteMeeting(m._id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition-all rounded-lg hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> DELETE
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}


          </div>

        </div>
      </div>

      {/* Admission Detail Modal */}
      {selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-xl p-6 md:p-8 shadow-2xl relative text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAdmission(null)}
              className="absolute flex items-center justify-center w-8 h-8 font-bold transition-colors rounded-full top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500"
            >
              ×
            </button>

            <div className="pb-3 space-y-1 text-center border-b-2 border-slate-100">
              <span className="text-[9px] font-extrabold tracking-widest text-[#7C3AED] bg-[#EAE8FC] px-2.5 py-0.5 rounded-full">APPLICATION REVIEW</span>
              <h4 className="font-quicksand font-bold text-[#5B468C] text-lg mt-2">Appletree Infotech Institute</h4>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">App No: {selectedAdmission.applicationNumber}</p>
            </div>

            <div className="py-4 space-y-5 text-xs">
              {/* Section 1: Student Profile */}
              <div className="space-y-2.5">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">1. Student Profile Details</h5>
                <div className="grid grid-cols-2 gap-3 font-semibold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Student Name</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.studentDetails?.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Course</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.studentDetails?.class}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Gender</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.studentDetails?.gender}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Date of Birth</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedAdmission.studentDetails?.dateOfBirth).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Parent Profile */}
              <div className="space-y-2.5">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">2. Parent / Guardian Details</h5>
                <div className="grid grid-cols-2 gap-3 font-semibold text-slate-500 text-slate-600">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Father's Name</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.parentDetails?.fatherName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Mother's Name</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.parentDetails?.motherName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Email Address</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAdmission.parentDetails?.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Phone Number</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.parentDetails?.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 uppercase block">Home Address</span>
                    <span className="font-bold text-slate-800">{selectedAdmission.parentDetails?.address}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Documents */}
              <div className="space-y-2.5">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">3. Attached Documents & Verification Proofs</h5>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  {Object.entries({
                    'Birth Certificate': selectedAdmission.documents?.birthCertificate,
                    'Student Photograph': selectedAdmission.documents?.photo,
                    'Previous Report Card / Marksheet': selectedAdmission.documents?.reportCard,
                    'Transfer Certificate (TC)': selectedAdmission.documents?.transferCertificate,
                    'Student Aadhaar Card': selectedAdmission.documents?.aadhaarCard,
                    'Father\'s Aadhaar Card': selectedAdmission.documents?.fatherAadhaarCard,
                    'Mother\'s Aadhaar Card': selectedAdmission.documents?.motherAadhaarCard,
                    [`Address Proof (${selectedAdmission.documents?.addressProofType || 'Proof'})`]: selectedAdmission.documents?.addressProof
                  }).map(([label, path]) => {
                    return (
                      <div key={label} className="flex flex-col justify-between p-2 space-y-1 border bg-slate-50 border-slate-100 rounded-xl">
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">{label}</span>
                          <span className="font-semibold text-slate-700 truncate block text-[9px]" title={path ? path.split('/').pop() : 'Not Uploaded'}>
                            {path ? path.split('/').pop() : 'Not Uploaded'}
                          </span>
                        </div>
                        {path ? (
                          <div className="flex gap-2 pt-0.5">
                            <a
                              href={path}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] font-bold text-[#5B468C] hover:underline"
                            >
                              Open File
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const w = window.open(path);
                                if (w) {
                                  w.onload = () => {
                                    w.print();
                                  };
                                }
                              }}
                              className="text-[9px] font-bold text-slate-500 hover:text-slate-700"
                            >
                              Print
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Fields (Only for pending) */}
              {selectedAdmission.status === 'pending' ? (
                <div className="bg-[#FAF9F5] border border-orange-100 p-4 rounded-3xl space-y-4">
                  <h5 className="text-xs font-bold font-quicksand text-slate-800">Approval Decisions & Provisioning</h5>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Reviewer Remarks</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Documents verified. Approved for Java Development start."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Provision Login Password (for parent to login)
                    </label>
                    <input
                      type="text"
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      placeholder="Enter parent login password (e.g. securePass123)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border p-4 rounded-3xl text-[10px] font-semibold text-slate-500 font-mono space-y-1">
                  <p>Status: <span className={`uppercase font-bold ${selectedAdmission.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>{selectedAdmission.status}</span></p>
                  <p>Remarks: <span className="font-sans italic text-slate-800">"{selectedAdmission.remarks || 'No remarks recorded.'}"</span></p>
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 pt-2">
              {selectedAdmission.status === 'pending' ? (
                <>
                  <button
                    onClick={() => {
                      if (!parentPassword.trim()) {
                        alert('Please fill out a password for the student/parent login account before approving.');
                        return;
                      }
                      triggerConfirm(
                        "Are you sure you want to submit?",
                        "This will approve the student and provision their parent portal account.",
                        "submit",
                        () => handleAdmissionDecision(selectedAdmission._id, 'approved', parentPassword)
                      );
                    }}
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-brandMint hover:bg-brandMint-dark text-white font-quicksand font-bold text-xs shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>APPROVE & PROVISION</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Are you sure you want to delete?",
                        "This will reject the student application and close the file.",
                        "delete",
                        () => handleAdmissionDecision(selectedAdmission._id, 'rejected')
                      );
                    }}
                    disabled={loading}
                    className="py-3 px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-quicksand font-bold text-xs shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>REJECT</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedAdmission(null)}
                  className="w-full py-3 px-6 rounded-2xl bg-[#9F92EC] hover:bg-[#8C7EB5] text-white font-quicksand font-bold text-xs shadow transition-all active:scale-[0.98] cursor-pointer"
                >
                  CLOSE WINDOW
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-xl p-6 md:p-8 shadow-2xl relative text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedStudentProfile(null)}
              className="absolute flex items-center justify-center w-8 h-8 text-xl font-bold transition-colors rounded-full top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500"
            >
              ×
            </button>

            <div className="pb-4 space-y-1 text-center border-b-2 border-slate-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7C3AED] bg-[#EAE8FC] px-3 py-1 rounded-full">STUDENT CARD</span>
              <h4 className="font-quicksand font-bold text-[#5B468C] text-xl mt-3">{selectedStudentProfile.name}</h4>
              <p className="font-mono text-xs font-semibold text-slate-400">ID: {selectedStudentProfile.studentId || 'N/A'}</p>
            </div>

            <div className="py-6 space-y-5 text-xs font-semibold text-slate-600">
              {/* Basic Details */}
              <div className="space-y-3">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">1. Academic & Personal Details</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Gender</span>
                    <span className="text-sm font-bold text-slate-850">{selectedStudentProfile.gender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Course</span>
                    <span className="font-bold text-[#7C3AED] text-sm">{selectedStudentProfile.class}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Date of Birth</span>
                    <span className="text-sm font-bold text-slate-850">
                      {selectedStudentProfile.dateOfBirth ? new Date(selectedStudentProfile.dateOfBirth).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">System Database ID</span>
                    <span className="font-mono text-slate-850">{selectedStudentProfile._id}</span>
                  </div>
                </div>
              </div>

              {/* Parent Details */}
              <div className="space-y-3">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">2. Parent / Guardian Contacts</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Parent Name</span>
                    <span className="text-sm font-bold text-slate-855">{selectedStudentProfile.parentId?.name || selectedStudentProfile.parentDetails?.fatherName || selectedStudentProfile.parentDetails?.motherName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Phone Number</span>
                    <span className="text-sm font-bold text-slate-855">{selectedStudentProfile.parentId?.phone || selectedStudentProfile.parentDetails?.phone || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Email Address</span>
                    <span className="font-mono text-sm font-bold text-slate-855">{selectedStudentProfile.parentId?.email || selectedStudentProfile.parentDetails?.email || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Home Address</span>
                    <span className="text-sm font-bold text-slate-855">{selectedStudentProfile.parentId?.address || selectedStudentProfile.parentDetails?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedStudentProfile(null)}
                className="w-full py-3 px-6 rounded-2xl bg-[#9F92EC] hover:bg-[#8C7EB5] text-white font-quicksand font-bold text-xs shadow transition-all active:scale-[0.98] cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleEditStudent} className="bg-white border-[6px] border-white rounded-[2.5rem] w-full max-w-xl p-6 md:p-8 shadow-2xl relative text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
              className="absolute flex items-center justify-center w-8 h-8 text-xl font-bold transition-colors rounded-full top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500"
            >
              ×
            </button>

            <div className="pb-4 space-y-1 text-center border-b-2 border-slate-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7C3AED] bg-[#EAE8FC] px-3 py-1 rounded-full">EDIT PROFILE</span>
              <h4 className="font-quicksand font-bold text-[#5B468C] text-xl mt-3">Edit Student Details</h4>
              <p className="font-mono text-xs font-semibold text-slate-400">ID: {editingStudent.studentId || 'N/A'}</p>
            </div>

            <div className="py-6 space-y-5 text-xs">
              {/* Section 1: Student Details */}
              <div className="space-y-3">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">1. Student Details</h5>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Student Name</label>
                    <input
                      type="text" required
                      value={editStdName} onChange={e => setEditStdName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Date of Birth</label>
                    <input
                      type="date" required
                      value={editStdDob} onChange={e => setEditStdDob(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Gender</label>
                    <select
                      value={editStdGender} onChange={e => setEditStdGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Course</label>
                    <select
                      value={editStdClass} onChange={e => setEditStdClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                    >
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Parent Details */}
              <div className="space-y-3">
                <h5 className="pb-1 text-sm font-bold border-b font-quicksand text-slate-800">2. Parent / Guardian Details</h5>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Parent Full Name</label>
                      <input
                        type="text" required
                        value={editParentName} onChange={e => setEditParentName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Contact Phone Number</label>
                      <input
                        type="text" required
                        value={editParentPhone} onChange={e => setEditParentPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Home Address</label>
                    <input
                      type="text" required
                      value={editParentAddress} onChange={e => setEditParentAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#9F92EC]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-2xl bg-brandMint hover:bg-brandMint-dark text-white font-quicksand font-bold text-xs shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>SAVE CHANGES</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-quicksand font-bold text-xs shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>CANCEL</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:block print:bg-white print:p-0 print:inset-auto print:static">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * { visibility: hidden !important; }
              #printable-receipt, #printable-receipt * { visibility: visible !important; }
              #printable-receipt {
                position: fixed !important;
                left: 0 !important; top: 0 !important;
                width: 100vw !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 1.5cm !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: white !important;
              }
              .print-hide { visibility: hidden !important; display: none !important; }
              @page { size: A4 portrait; margin: 0; }
            }
          `}} />

          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border-[3px] border-[#5B468C]" id="printable-receipt">

            {/* Rotate PAID stamp watermark */}
            <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-[15deg] text-emerald-500/10 font-mono font-black text-8xl tracking-widest uppercase select-none pointer-events-none z-0">
              PAID
            </div>

            {/* Top-Right Close Button (Hidden during print) */}
            <button
              type="button"
              onClick={() => setActiveReceipt(null)}
              className="absolute z-20 p-2 transition-all border border-transparent rounded-full cursor-pointer print-hide top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt inner padding wrapper */}
            <div className="p-8 space-y-6">

              {/* Receipt Header */}
              <div className="relative z-10 pb-6 text-center border-b border-solid border-slate-200 bg-[#F5F5FF] rounded-t-2xl p-4">
                <img src="/logo.png" alt="Pranidha Logo" className="mx-auto mb-2 h-14" />
                <h2 className="text-2xl font-serif font-bold tracking-tight text-[#5B468C]">PRANIDHA INTERNATIONAL SCHOOL</h2>
                <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Official Fee Slip / Booklet Receipt</p>
                <p className="text-[10px] text-slate-400 mt-1">123 Sunshine Street, Sector 5 | Phone: +91 98765 43210 | billing@pranidhainternational.in</p>
              </div>

              {/* Receipt Details Grid */}
              <div className="relative z-10 grid grid-cols-1 gap-4 p-4 text-xs border md:grid-cols-2 text-slate-600 bg-slate-55/40 rounded-2xl border-slate-100">
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold text-slate-400">Receipt No: </span>
                    <span className="font-mono font-bold text-slate-800">{activeReceipt.receipt?.receiptNumber || `REC-${activeReceipt.receipt?._id}`}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Payment Date: </span>
                    <span className="font-bold text-slate-800">{new Date(activeReceipt.receipt?.paymentDate || activeReceipt.receipt?.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Transaction ID: </span>
                    <span className="font-mono font-bold text-slate-800">{activeReceipt.receipt?.transactionId}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Payment Mode: </span>
                    <span className="font-bold text-slate-800">{activeReceipt.receipt?.paymentMethod}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold text-slate-400">Student Name: </span>
                    <span className="font-bold text-slate-800">{activeReceipt.student?.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Course: </span>
                    <span className="font-bold text-slate-800">{activeReceipt.student?.class}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Father's Name: </span>
                    <span className="font-bold text-slate-800">{activeReceipt.student?.parentDetails?.fatherName || activeReceipt.student?.parentId?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Billing Address: </span>
                    <span className="font-bold text-slate-800">{activeReceipt.student?.parentDetails?.address || activeReceipt.student?.parentId?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Particulars Table */}
              <div className="relative z-10 overflow-hidden border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="font-bold border-b bg-[#5B468C]/5 text-slate-600 border-slate-200">
                      <th className="p-3">Fee Particulars Description</th>
                      <th className="w-16 p-3 text-center">S.No</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const particulars = [];
                      const fs = activeReceipt.feeStructure;
                      const termName = activeReceipt.fee?.term || '';
                      const tl = termName.toLowerCase();
                      const isMonthly = tl.includes('month') || tl.includes('tuition') || tl.includes('component');
                      const isAdmission = tl.includes('admission');
                      const isAnnual = tl.includes('annual');
                      const isDevelopment = tl.includes('development');
                      const isExamination = tl.includes('examination') || tl.includes('exam');

                      if (isMonthly && fs) {
                        // Show full monthly breakdown
                        if (fs.tuitionFee > 0) particulars.push({ name: 'Tuition Fee', tag: 'Monthly', amount: fs.tuitionFee });
                        if (fs.computerFee > 0) particulars.push({ name: 'Computer Lab Fee', tag: 'Monthly', amount: fs.computerFee });
                        if (fs.activityFee > 0) particulars.push({ name: 'Activity & Sports Fee', tag: 'Monthly', amount: fs.activityFee });
                        if (fs.smartClassFee > 0) particulars.push({ name: 'Smart Class Technology Fee', tag: 'Monthly', amount: fs.smartClassFee });
                        if (fs.transportFee > 0) particulars.push({ name: 'School Transport / Bus Fee', tag: 'Monthly', amount: fs.transportFee });
                        if (fs.libraryFee > 0) particulars.push({ name: 'Library & Reference Fee', tag: 'Monthly', amount: fs.libraryFee });
                        (fs.customFees || []).filter(cf => cf.period === 'Monthly').forEach(cf => {
                          particulars.push({ name: cf.name, tag: 'Monthly', amount: cf.amount });
                        });
                      } else if (isAdmission && fs) {
                        particulars.push({ name: 'Admission Fee (One-time, Non-refundable)', tag: 'One-time', amount: fs.admissionFee || activeReceipt.fee?.amount || 0 });
                      } else if (isAnnual && fs) {
                        particulars.push({ name: 'Annual Charges', tag: 'Annual', amount: fs.annualCharges || activeReceipt.fee?.amount || 0 });
                      } else if (isDevelopment && fs) {
                        particulars.push({ name: 'School Development Fund', tag: 'Annual', amount: fs.developmentFee || activeReceipt.fee?.amount || 0 });
                      } else if (isExamination && fs) {
                        particulars.push({ name: 'Term Examination Fee', tag: 'Annual', amount: fs.examinationFee || activeReceipt.fee?.amount || 0 });
                      } else if (fs && tl.includes('custom')) {
                        // Custom fee — try to match by name from customFees
                        const customMatch = (fs.customFees || []).find(cf => termName.toLowerCase().includes(cf.name.toLowerCase()));
                        if (customMatch) {
                          particulars.push({ name: customMatch.name, tag: customMatch.period, amount: customMatch.amount });
                        } else {
                          particulars.push({ name: termName, tag: 'Custom', amount: activeReceipt.fee?.amount || 0 });
                        }
                      } else {
                        particulars.push({
                          name: termName || 'Tuition & Academic Term Invoice',
                          tag: 'Term',
                          amount: activeReceipt.fee?.amount || activeReceipt.receipt?.amountPaid || 0
                        });
                      }

                      // Add late fine if any
                      const fine = activeReceipt.fee?.fine || activeReceipt.receipt?.fine || 0;
                      if (fine > 0) {
                        particulars.push({ name: 'Late Payment Fine / Penalty Charges', tag: 'Fine', amount: fine });
                      }

                      return particulars.map((part, idx) => (
                        <tr key={idx} className={`font-medium text-slate-700 border-b border-slate-100 ${part.tag === 'Fine' ? 'bg-red-50' : 'hover:bg-slate-50/50'}`}>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{part.name}</div>
                            {part.tag && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${part.tag === 'Monthly' ? 'bg-indigo-50 text-indigo-600' :
                                part.tag === 'Annual' || part.tag === 'One-time' ? 'bg-amber-50 text-amber-600' :
                                  part.tag === 'Fine' ? 'bg-red-50 text-red-600' :
                                    'bg-slate-100 text-slate-500'
                              }`}>{part.tag}</span>}
                          </td>
                          <td className="p-3 font-mono text-center text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-right text-slate-800">₹{(part.amount || 0).toLocaleString('en-IN')}.00</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Total Paid block */}
              <div className="flex justify-between items-center bg-[#5B468C]/5 p-4 rounded-2xl border border-[#5B468C]/15 relative z-10">
                <span className="text-xs font-bold text-slate-600">Total Billed & Cleared amount:</span>
                <span className="text-sm font-extrabold text-[#5B468C] font-mono">₹{activeReceipt.receipt?.amountPaid?.toLocaleString('en-IN')}.00</span>
              </div>

              {/* Stamp and Seal Placeholder */}
              <div className="flex justify-between items-end pt-4 text-[10px] text-slate-400 font-semibold relative z-10">
                <div>
                  <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 text-[9px] font-mono inline-block">
                    <span>✓</span>
                    <span>ONLINE CLEARED & STAMPED</span>
                  </div>
                  <p className="mt-1 font-bold text-slate-500 font-mono uppercase text-[9px]">Status: PAID</p>
                </div>
                <div className="text-center">
                  <span className="block w-24 pb-1 font-serif text-xs italic font-bold border-b text-slate-700 border-slate-200">S. Cooper</span>
                  <p className="font-bold text-[8px] text-slate-500 mt-1 uppercase tracking-wider">Admission Desk Desk Officer</p>
                </div>
              </div>
            </div>{/* /receipt inner padding wrapper */}

            {/* Actions (Hidden during print) */}
            <div className="flex gap-3 px-8 pt-4 pb-8 border-t print-hide border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#5B468C] hover:bg-[#4A3875] text-white font-quicksand font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-quicksand font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98] border border-red-200 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student ID Card Modal */}
      {activeIdCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto">
          <div className="relative w-full max-w-sm p-6 space-y-5 overflow-hidden bg-white shadow-2xl rounded-3xl print:shadow-none print:p-0" id="id-card-modal-container">

            {/* Top-Right Close Button (Hidden during print) */}
            <button
              type="button"
              onClick={() => setActiveIdCard(null)}
              className="absolute z-20 text-lg font-bold top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              ×
            </button>

            {/* Vertical ID Card Outer Layout */}
            <div className="w-[260px] h-[400px] mx-auto bg-white border-2 border-[#2E7D32] rounded-[1.5rem] relative shadow-lg overflow-hidden select-none" id="printable-id-card">

              {/* Header Slanted SVG Background */}
              <svg viewBox="0 0 260 90" className="absolute top-0 left-0 w-full h-[90px] z-0" xmlns="http://www.w3.org/2000/svg">
                <polygon points="0,0 260,0 260,65 130,85 0,65" fill="#2E7D32" />
                <polygon points="0,65 130,85 260,65 260,70 130,90 0,70" fill="#E53935" />
              </svg>

              {/* School Name Text */}
              <div className="absolute left-0 z-10 w-full text-center top-2">
                <h3 className="text-[20px] font-black text-white uppercase font-serif tracking-wide leading-tight">
                  Appletree Infotech Institute
                </h3>
              </div>

              {/* Student Photo */}
              <div className="absolute top-[116px] left-1/2 -translate-x-1/2 w-[90px] h-[105px] bg-[#EAEAEA] border-2 border-[#EF5350] rounded-xl overflow-hidden shadow-inner flex items-center justify-center z-10">
                {activeIdCard.photo && !idPhotoError ? (
                  <img
                    src={activeIdCard.photo}
                    alt={activeIdCard.name}
                    onError={() => setIdPhotoError(true)}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Users className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-[7px] uppercase font-bold mt-1">Photo</span>
                  </div>
                )}
              </div>

              {/* Student Name */}
              <div className="absolute top-[230px] left-0 w-full text-center z-10 px-2">
                <h4 className="text-sm font-black text-[#E53935] uppercase font-serif tracking-wide leading-none">{activeIdCard.name}</h4>
                <div className="w-24 h-0.5 bg-[#2E7D32] mx-auto mt-1"></div>
              </div>

              {/* Student Details Grid */}
              <div className="absolute top-[252px] left-[15px] right-[15px] text-[8.5px] text-slate-800 font-extrabold z-10">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-[70px] py-1 text-left font-serif leading-none text-[#2E7D32]">Father Name</td>
                      <td className="w-[15px] py-1 text-center leading-none text-[#2E7D32]">-</td>
                      <td className="py-1 font-sans leading-none text-left">{activeIdCard.parentId?.name || activeIdCard.parentDetails?.fatherName || 'N/A'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-serif leading-none text-left text-[#2E7D32]">Date of Birth</td>
                      <td className="py-1 leading-none text-center text-[#2E7D32]">-</td>
                      <td className="py-1 font-sans leading-none text-left">
                        {activeIdCard.dateOfBirth ? new Date(activeIdCard.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '.') : 'N/A'}
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-serif leading-none text-left text-[#2E7D32]">Mobile No.</td>
                      <td className="py-1 leading-none text-center text-[#2E7D32]">-</td>
                      <td className="py-1 font-mono leading-none text-left">
                        {activeIdCard.parentId?.phone || activeIdCard.parentDetails?.phone || 'N/A'}
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-serif leading-none text-left text-[#2E7D32]">Course</td>
                      <td className="py-1 leading-none text-center text-[#2E7D32]">-</td>
                      <td className="py-1 font-sans leading-none text-left">{activeIdCard.class}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-serif leading-none text-left text-[#2E7D32]">Address</td>
                      <td className="py-1 leading-none text-center text-[#2E7D32]">-</td>
                      <td className="py-1 text-left font-sans leading-tight text-[7.5px] whitespace-pre-wrap">
                        {activeIdCard.parentId?.address || activeIdCard.parentDetails?.address || 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Slanted SVG Background */}
              <svg viewBox="0 0 260 25" className="absolute bottom-0 left-0 w-full h-[25px] z-0" xmlns="http://www.w3.org/2000/svg">
                <polygon points="0,25 260,25 260,8 130,0 0,8" fill="#E53935" />
                <polygon points="0,25 260,25 260,13 130,5 0,13" fill="#2E7D32" />
              </svg>

              {/* Principal Signature */}
              <div className="absolute bottom-[4px] left-[15px] z-10 flex flex-col items-center">
                <svg viewBox="0 0 50 12" className="w-[50px] h-[12px] opacity-90" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5,9 C12,4 20,1 25,5 C30,9 35,9 40,4 M10,8 L30,3" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[5px] text-white font-black tracking-wider leading-none mt-0.5">Principal</span>
              </div>

            </div>

            {/* Print ID Card Actions (Hidden during print) */}
            <div className="flex justify-center max-w-xs gap-2 pt-2 mx-auto border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-[#5B468C] hover:bg-[#4A3875] text-white font-quicksand font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center space-x-1"
              >
                <span>Print ID Card</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveIdCard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-quicksand font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small Clay Confirmation Modal Overlay */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />

      {/* Admission Payment Modal (Cash / UPI → auto-saves student) */}
      {admissionPaymentOpen && (
        <AdmissionPaymentModal
          admissionData={{
            studentDetails: { name: admStdName, dateOfBirth: admStdDob, gender: admStdGender, class: admStdClass },
            parentDetails: { fatherName: admParentFather, motherName: admParentMother, email: admParentEmail, phone: admParentPhone, address: admParentAddress },
            amount: admissionFee,
            photo: admPhoto
          }}
          onClose={() => setAdmissionPaymentOpen(false)}
          onSuccess={handleAdmissionPaymentSuccess}
        />
      )}
      {/* Collect Invoice Payment Modal (Cash / UPI) */}
      {collectPaymentOpen && selectedCollectFee && (
        <CollectPaymentModal
          fee={selectedCollectFee}
          studentName={getStudentInfo(selectedCollectFee).name}
          onClose={() => { setCollectPaymentOpen(false); setSelectedCollectFee(null); }}
          onSuccess={handleCollectPaymentSuccess}
        />
      )}



    </div>
  );
}
