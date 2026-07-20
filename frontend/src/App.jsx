import React, { useState, useEffect, useRef } from 'react';

const THUMBNAIL_PRESETS = [
  { label: 'React & Web', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80' },
  { label: 'Python & AI', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cyber & Cloud', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
  { label: 'Lecture Hall', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80' }
];

const detectMeetingPlatform = (link) => {
  if (!link) return { name: 'Live Video Link', icon: '🔗', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' };
  const l = link.toLowerCase();
  if (l.includes('meet.google.com')) {
    return { name: 'Google Meet', icon: '🟦', color: '#4285F4', bg: 'rgba(66, 133, 244, 0.15)', border: 'rgba(66, 133, 244, 0.4)' };
  }
  if (l.includes('zoom.us') || l.includes('zoom.com')) {
    return { name: 'Zoom Meeting', icon: '🟩', color: '#2D8CFF', bg: 'rgba(45, 140, 255, 0.15)', border: 'rgba(45, 140, 255, 0.4)' };
  }
  if (l.includes('teams.microsoft.com') || l.includes('teams.live.com')) {
    return { name: 'Microsoft Teams', icon: '🟪', color: '#6264A7', bg: 'rgba(98, 100, 167, 0.15)', border: 'rgba(98, 100, 167, 0.4)' };
  }
  if (l.includes('webex.com')) {
    return { name: 'Cisco WebEx', icon: '🟧', color: '#005073', bg: 'rgba(0, 80, 115, 0.15)', border: 'rgba(0, 80, 115, 0.4)' };
  }
  if (l.includes('youtube.com') || l.includes('youtu.be')) {
    return { name: 'YouTube Live Stream', icon: '🔴', color: '#FF0000', bg: 'rgba(255, 0, 0, 0.15)', border: 'rgba(255, 0, 0, 0.4)' };
  }
  return { name: 'Custom Video Call Link', icon: '🌐', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
};

export default function App() {
  // Authentication state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  
  // Navigation
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'colleges', 'admissions', 'marketplace', 'classes', 'teacher', 'admin', 'payments', 'classroom'
  
  // App data
  const [colleges, setColleges] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [teachingCourses, setTeachingCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [myTeachingCourses, setMyTeachingCourses] = useState([]);
  const [teacherEnrollments, setTeacherEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  
  // Classroom state
  const [activeClass, setActiveClass] = useState(null); // The currently joined online class
  const [classroomSlideIndex, setClassroomSlideIndex] = useState(0);
  const [classroomNotes, setClassroomNotes] = useState('');
  const [classroomNotesSaved, setClassroomNotesSaved] = useState(true);
  const [classroomChatMessages, setClassroomChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Study Notes Marketplace & Lecture Format state
  const [studyNotes, setStudyNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCourseId, setNewNoteCourseId] = useState('');
  const [newNoteDesc, setNewNoteDesc] = useState('');
  const [newNotePrice, setNewNotePrice] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteFileUrl, setNewNoteFileUrl] = useState('');
  const [selectedViewNote, setSelectedViewNote] = useState(null);
  const [newClassLectureType, setNewClassLectureType] = useState('video'); // 'video', 'audio', 'meeting_link'

  // Teacher Ratings & Feedback state
  const [topTeachers, setTopTeachers] = useState([]);
  const [selectedTeacherReviewsModal, setSelectedTeacherReviewsModal] = useState(null);
  const [showLeaveReviewModal, setShowLeaveReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Three-Dot Master Navigation Drawer State
  const [showMasterNavModal, setShowMasterNavModal] = useState(false);

  // Draggable Floating Chatbot State
  const [chatPos, setChatPos] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 80 : 300, y: typeof window !== 'undefined' ? window.innerHeight - 100 : 500 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMovedChat, setHasMovedChat] = useState(false);

  const handleChatMouseDown = (e) => {
    setIsDraggingChat(true);
    setHasMovedChat(false);
    setDragOffset({
      x: e.clientX - chatPos.x,
      y: e.clientY - chatPos.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingChat) return;
      setHasMovedChat(true);
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      newX = Math.max(10, Math.min(window.innerWidth - 70, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 70, newY));
      setChatPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingChat(false);
    };

    if (isDraggingChat) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingChat, dragOffset]);

  // Admin database explorer state
  const [dbTables, setDbTables] = useState([]);
  const [selectedDbTable, setSelectedDbTable] = useState('');
  const [dbTableRows, setDbTableRows] = useState([]);
  const [sqlConsoleQuery, setSqlConsoleQuery] = useState('SELECT user_id, name, email, role, wallet_balance FROM Users');
  const [sqlConsoleOutput, setSqlConsoleOutput] = useState('');

  // Referral Modal state
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState('');
  const [referCollegeId, setReferCollegeId] = useState('');
  const [referCourseId, setReferCourseId] = useState('');
  
  // Admin form state
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeLocation, setNewCollegeLocation] = useState('');
  const [newCollegeContact, setNewCollegeContact] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCommission, setNewCourseCommission] = useState('');
  const [newCourseCollegeId, setNewCourseCollegeId] = useState('');
  
  // Teacher form state
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('');
  const [newClassTitle, setNewClassTitle] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassDate, setNewClassDate] = useState('');
  const [newClassMeetLink, setNewClassMeetLink] = useState('');
  const [newClassThumbnail, setNewClassThumbnail] = useState('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80');
  const [newClassCourseId, setNewClassCourseId] = useState('');

  // Credentials form state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('student'); // 'student' or 'teacher'

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState('');

  // Admin current view mode
  const [adminSubTab, setAdminSubTab] = useState('overview'); // 'overview', 'admissions', 'colleges', 'db_explorer', 'email_settings'

  // Admin Email config state
  const [adminEmailUser, setAdminEmailUser] = useState('');
  const [adminEmailPass, setAdminEmailPass] = useState('');
  const [adminEmailPassConfigured, setAdminEmailPassConfigured] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [avatarShape, setAvatarShape] = useState('circle'); // 'circle', 'rounded', 'square'
  const [avatarCompression, setAvatarCompression] = useState('medium'); // 'small', 'medium', 'original'
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');

  // On-Site Chatbot Widget state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: '👋 Welcome to EduConnect! Ask me anything about admissions, courses, virtual classes, or password resets.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);

  // WhatsApp Admin Control Console state
  const [waConfig, setWaConfig] = useState({
    enabled: true,
    mode: 'hybrid',
    delaySeconds: 15,
    defaultGreeting: '',
    adminPhoneNumber: '+15550192',
    whatsappPhoneId: '',
    whatsappToken: '',
    webhookVerifyToken: 'educonnect_verify_token_123'
  });
  const [waChats, setWaChats] = useState([]);
  const [waReplyPhone, setWaReplyPhone] = useState('');
  const [waReplyMsg, setWaReplyMsg] = useState('');
  const [simPhone, setSimPhone] = useState('+1 555-0192');
  const [simMsg, setSimMsg] = useState('Hi, how do referral commissions work?');
  const [isSimulatingWa, setIsSimulatingWa] = useState(false);

  const fetchWaConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        setWaConfig(data);
      }
    } catch (e) {}
  };

  const fetchWaChats = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const res = await fetch('/api/whatsapp/chats', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWaChats(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWaConfig();
    if (user && user.role === 'admin') {
      fetchWaChats();
      const interval = setInterval(fetchWaChats, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleUpdateWaConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(waConfig)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'WhatsApp configuration saved!');
      } else {
        showToast(data.error || 'Failed to save configuration', 'danger');
      }
    } catch (e) {
      showToast('Connection error', 'danger');
    }
  };

  const handleSendWaManualReply = async (e) => {
    e.preventDefault();
    if (!waReplyPhone || !waReplyMsg) return;
    try {
      const res = await fetch('/api/whatsapp/chats/reply', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phoneNumber: waReplyPhone, message: waReplyMsg })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Reply sent to WhatsApp user! Auto-reply timer paused for this contact.");
        setWaReplyMsg('');
        fetchWaChats();
      } else {
        showToast(data.error || 'Failed to send WhatsApp message', 'danger');
      }
    } catch (e) {
      showToast('Connection error', 'danger');
    }
  };

  const handleSimulateIncomingWa = async (e) => {
    e.preventDefault();
    if (!simMsg) return;
    setIsSimulatingWa(true);
    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: simPhone, message: simMsg })
      });
      if (res.ok) {
        showToast(`Simulated WhatsApp message received from ${simPhone}`);
        setSimMsg('');
        fetchWaChats();
      }
    } catch (e) {
      showToast('Simulation error', 'danger');
    } finally {
      setIsSimulatingWa(false);
    }
  };

  const handleSendSiteChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsgText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsgText }]);
    setChatInput('');
    setIsChatTyping(true);

    try {
      const res = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsgText })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'bot', text: '🤖 Sorry, I am having trouble connecting right now.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: '🤖 Network connection issue.' }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileMobile(user.mobile || '');
      setProfileAddress(user.address || '');
      setProfileAge(user.age || '');
      setProfileGender(user.gender || '');
      setProfileUsername(user.username || '');
      setProfilePic(user.profile_pic || '');
      setAvatarShape(user.avatar_shape || 'circle');
    }
  }, [user]);

  // Notification state
  const [toast, setToast] = useState(null);

  // Theme state
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('theme') || 'midnight');

  useEffect(() => {
    document.body.classList.remove('theme-midnight', 'theme-cyberpunk', 'theme-emerald', 'theme-light');
    document.body.classList.add(`theme-${activeTheme}`);
    localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

  // Classroom Presentation Slides
  const CLASSROOM_SLIDES = [
    { title: "Slide 1: Course Fundamentals", bullets: ["Welcome to the learning workspace", "Understanding core concepts", "Prerequisites and tools setup"] },
    { title: "Slide 2: Architectural Principles", bullets: ["Server-client separation", "Database normalization rules", "State synchronization models"] },
    { title: "Slide 3: Real-Time Communication", bullets: ["Polling vs WebSocket events", "Broadcasting state mutations", "Mock environments latency"] },
    { title: "Slide 4: Financial Ledger Audits", bullets: ["Transaction double-entry logs", "Wallet balance debit/credit cycles", "Webhook hooks validation"] },
    { title: "Slide 5: Final Review & QA", bullets: ["Answering student queries", "Local host build compilation checks", "Reviewing deployment pipelines"] }
  ];

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  const getAvatarBorderRadius = (shape) => {
    if (shape === 'square') return '0px';
    if (shape === 'rounded') return '12px';
    return '50%';
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // ----------------------------------------------------
  // Effects & Data Fetching
  // ----------------------------------------------------
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setCurrentTab('home');
    }
  }, [token]);

  useEffect(() => {
    fetchColleges();
    fetchTeachingCourses();
    fetchOnlineClasses();
    fetchStudyNotes();
    fetchTopTeachers();
    if (user) {
      fetchAdmissions();
      fetchPayments();
      if (user.role === 'admin') {
        fetchAdminStats();
        fetchDbTablesList();
        fetchEmailSettings();
      }
      if (user.role === 'teacher') {
        fetchTeacherData();
      }
      if (user.role === 'student') {
        fetchStudentData();
      }
    }
  }, [user, currentTab]);

  useEffect(() => {
    if (selectedDbTable) {
      fetchDbTableRows(selectedDbTable);
    }
  }, [selectedDbTable]);

  // Notes autosaving simulation
  useEffect(() => {
    if (activeClass) {
      const savedNotes = localStorage.getItem(`notes_${activeClass.class_id}`);
      if (savedNotes !== null) {
        setClassroomNotes(savedNotes);
      } else {
        setClassroomNotes('');
      }
      
      // Seed initial classroom chat
      setClassroomChatMessages([
        { author: 'System Alert', text: `You joined "${activeClass.title}" virtual class.`, isSystem: true },
        { author: activeClass.teacher_name || 'Dr. Helen Carter', text: "Hello everyone, welcome! We will begin the lecture shortly. Feel free to ask questions here.", isSystem: false },
        { author: 'Sarah Jenkins', text: "Glad to be here! Ready to take notes.", isSystem: false }
      ]);
    }
  }, [activeClass]);

  const handleNotesChange = (e) => {
    const text = e.target.value;
    setClassroomNotes(text);
    setClassroomNotesSaved(false);
    
    // Simulate debounced saving
    localStorage.setItem(`notes_${activeClass.class_id}`, text);
    setTimeout(() => {
      setClassroomNotesSaved(true);
    }, 8000);
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setToken('');
      }
    } catch (e) {
      console.error(e);
      setToken('');
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await fetch('/api/colleges');
      if (res.ok) {
        const data = await res.json();
        setColleges(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdmissions = async () => {
    try {
      const res = await fetch('/api/admissions', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdmissions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeachingCourses = async () => {
    try {
      const res = await fetch('/api/teaching-courses');
      if (res.ok) {
        const data = await res.json();
        setTeachingCourses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOnlineClasses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/classes', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOnlineClasses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudyNotes = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notes', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStudyNotes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishNote = async (e) => {
    e.preventDefault();
    if (!newNoteCourseId || !newNoteTitle || !newNoteDesc) {
      showToast('Course, Title, and Description are required', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          course_id: parseInt(newNoteCourseId),
          title: newNoteTitle,
          description: newNoteDesc,
          price: newNotePrice ? parseFloat(newNotePrice) : 0.0,
          content: newNoteContent,
          file_url: newNoteFileUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Study Note published successfully! 📚');
        setNewNoteTitle('');
        setNewNoteCourseId('');
        setNewNoteDesc('');
        setNewNotePrice('');
        setNewNoteContent('');
        setNewNoteFileUrl('');
        fetchStudyNotes();
      } else {
        showToast(data.error || 'Failed to publish note', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleBuyNote = async (noteId) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/purchase`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Study Note unlocked! You can now read and download it 📖');
        fetchUserProfile();
        fetchStudyNotes();
      } else {
        showToast(data.error || 'Purchase failed', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const fetchTopTeachers = async () => {
    try {
      const res = await fetch('/api/reviews/top-teachers');
      if (res.ok) {
        const data = await res.json();
        setTopTeachers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openTeacherReviewsModal = async (teacherId, teacherName) => {
    try {
      const res = await fetch(`/api/reviews/teacher/${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTeacherReviewsModal({
          teacher_id: teacherId,
          teacher_name: teacherName,
          reviews: data.reviews,
          avg_rating: data.avg_rating,
          total_reviews: data.total_reviews
        });
      }
    } catch (e) {
      showToast("Failed to load instructor reviews", "danger");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!showLeaveReviewModal) return;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teacher_id: showLeaveReviewModal.teacher_id,
          course_id: showLeaveReviewModal.course_id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Thank you for rating your instructor! ⭐");
        setShowLeaveReviewModal(null);
        setReviewComment('');
        setReviewRating(5);
        fetchTeachingCourses();
        fetchTopTeachers();
      } else {
        showToast(data.error || 'Failed to submit review', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const fetchStudentData = async () => {
    try {
      const res = await fetch('/api/enrollments', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyEnrollments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeacherData = async () => {
    try {
      const res1 = await fetch('/api/teaching-courses/teacher', { headers: getAuthHeaders() });
      if (res1.ok) {
        const data = await res1.json();
        setMyTeachingCourses(data);
      }
      const res2 = await fetch('/api/enrollments/teacher', { headers: getAuthHeaders() });
      if (res2.ok) {
        const data = await res2.json();
        setTeacherEnrollments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDbTablesList = async () => {
    try {
      const res = await fetch('/api/admin/db/tables', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbTables(data);
        if (data.length > 0 && !selectedDbTable) {
          setSelectedDbTable(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDbTableRows = async (tableName) => {
    try {
      const res = await fetch(`/api/admin/db/tables/${tableName}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbTableRows(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDbRow = async (tableName, id) => {
    if (!window.confirm("Are you sure you want to delete this record? This can cause relational cascades.")) return;
    try {
      const res = await fetch(`/api/admin/db/tables/${tableName}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast("Record deleted successfully.");
        fetchDbTableRows(tableName);
        fetchAdminStats(); // Refresh stats
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete row', 'danger');
      }
    } catch (e) {
      showToast('Connection error', 'danger');
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch('/api/admin/email-settings', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdminEmailUser(data.emailUser);
        setAdminEmailPassConfigured(data.emailPassConfigured);
        if (data.emailPassConfigured) {
          setAdminEmailPass('••••••••••••••••');
        } else {
          setAdminEmailPass('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          emailUser: adminEmailUser, 
          emailPass: adminEmailPass === '••••••••••••••••' ? '' : adminEmailPass 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Email settings saved!");
        fetchEmailSettings();
      } else {
        showToast(data.error || 'Failed to save email settings', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleTestEmailSettings = async () => {
    setIsSendingTestEmail(true);
    try {
      const res = await fetch('/api/admin/email-settings/test', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Test email sent!");
      } else {
        showToast(data.error || 'Failed to send test email', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleExecuteSql = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/db/query', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sql: sqlConsoleQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setSqlConsoleOutput(JSON.stringify(data, null, 2));
        showToast("Query executed successfully!");
        if (selectedDbTable) fetchDbTableRows(selectedDbTable); // refresh rows grid
      } else {
        setSqlConsoleOutput(`ERROR: ${data.error}`);
        showToast("SQL syntax error or constraint violation", "danger");
      }
    } catch (err) {
      setSqlConsoleOutput(`ERROR: Connection failed.`);
    }
  };

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          name: profileName, 
          email: profileEmail,
          mobile: profileMobile,
          address: profileAddress,
          age: profileAge,
          gender: profileGender,
          username: profileUsername,
          profile_pic: profilePic,
          avatar_shape: avatarShape
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Profile updated successfully!");
        setUser(data.user);
      } else {
        showToast(data.error || 'Failed to update profile', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const resizeImageToBase64 = (file, sizeType, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (sizeType === 'original') {
        callback(e.target.result);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        let targetDimension = sizeType === 'small' ? 150 : 400;
        
        if (width > height) {
          if (width > targetDimension) {
            height = Math.round((height * targetDimension) / width);
            width = targetDimension;
          }
        } else {
          if (height > targetDimension) {
            width = Math.round((width * targetDimension) / height);
            height = targetDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Up to 10MB since we compress client-side
        showToast("Image size should be less than 10MB", "warning");
        return;
      }
      resizeImageToBase64(file, avatarCompression, (resizedBase64) => {
        setProfilePic(resizedBase64);
      });
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          currentPassword: profileCurrentPassword, 
          newPassword: profileNewPassword 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Password changed successfully!");
        setProfileCurrentPassword('');
        setProfileNewPassword('');
      } else {
        showToast(data.error || 'Failed to change password', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      showToast("Please enter your email", "warning");
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "OTP generated!");
        setLastGeneratedOtp(data.otp || '');
        setAuthView('verify_otp');
      } else {
        showToast(data.error || 'Failed to send reset code', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetOtp || !resetNewPassword) {
      showToast("Please fill all fields", "warning");
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Password reset successful! You can now sign in.");
        setAuthView('login');
        setResetEmail('');
        setResetOtp('');
        setResetNewPassword('');
      } else {
        showToast(data.error || 'Failed to reset password', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        showToast(`Welcome back, ${data.user.name}!`);
        setAuthEmail('');
        setAuthPassword('');
        setCurrentTab('home');
      } else {
        showToast(data.error || 'Login failed', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword, role: authRole })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        showToast(`Account created! Welcome, ${data.user.name}.`);
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
        setCurrentTab('home');
      } else {
        showToast(data.error || 'Registration failed', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    showToast('Logged out successfully.');
  };

  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (!referStudentName || !referCourseId) {
      showToast('Please enter all fields', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_name: referStudentName, course_id: parseInt(referCourseId) })
      });
      if (res.ok) {
        showToast('Referral submitted successfully.');
        setShowReferModal(false);
        setReferStudentName('');
        setReferCollegeId('');
        setReferCourseId('');
        fetchAdmissions();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit referral', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleApproveReject = async (admissionId, status) => {
    try {
      const res = await fetch(`/api/admissions/${admissionId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Referral successfully ${status.toLowerCase()}!`);
        fetchAdmissions();
        fetchAdminStats();
      } else {
        const data = await res.json();
        showToast(data.error || 'Action failed', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleCreateTeachingCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teaching-courses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newCourseTitle, description: newCourseDesc, price: parseFloat(newCoursePrice) })
      });
      if (res.ok) {
        showToast('Course published to marketplace!');
        setNewCourseTitle('');
        setNewCourseDesc('');
        setNewCoursePrice('');
        fetchTeachingCourses();
        fetchTeacherData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to publish course', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!newClassCourseId || !newClassTitle || !newClassDesc || !newClassDate || !newClassMeetLink) {
      showToast('Please fill all fields', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          course_id: parseInt(newClassCourseId),
          title: newClassTitle,
          description: newClassDesc,
          class_date: newClassDate,
          meet_link: newClassMeetLink,
          thumbnail: newClassThumbnail,
          lecture_type: newClassLectureType
        })
      });
      if (res.ok) {
        showToast('Online class scheduled successfully!');
        setNewClassTitle('');
        setNewClassDesc('');
        setNewClassDate('');
        setNewClassMeetLink('');
        setNewClassThumbnail('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80');
        setNewClassLectureType('video');
        setNewClassCourseId('');
        fetchOnlineClasses();
      } else {
        const data = await res.json();
        showToast(data.error || 'Scheduling failed', 'danger');
      }
    } catch (err) {
      showToast('Connection error', 'danger');
    }
  };

  const handleUpdateClassStatus = async (classId, status) => {
    try {
      const res = await fetch(`/api/classes/${classId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Class status updated to ${status}.`);
        fetchOnlineClasses();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update status', 'danger');
      }
    } catch (e) {
      showToast('Connection error', 'danger');
    }
  };

  const handleBuyCourse = async (courseId) => {
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ course_id: courseId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Successfully enrolled in course!');
        fetchUserProfile();
        fetchStudentData();
      } else {
        showToast(data.error || 'Purchase failed', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleAddCollege = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/colleges', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ college_name: newCollegeName, location: newCollegeLocation, contact: newCollegeContact })
      });
      if (res.ok) {
        showToast('College added successfully!');
        setNewCollegeName('');
        setNewCollegeLocation('');
        setNewCollegeContact('');
        fetchColleges();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add college', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ college_id: parseInt(newCourseCollegeId), course_name: newCourseName, commission: parseFloat(newCourseCommission) })
      });
      if (res.ok) {
        showToast('College course added successfully!');
        setNewCourseName('');
        setNewCourseCommission('');
        setNewCourseCollegeId('');
        fetchColleges();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add course', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const triggerReferralModal = (collegeId, courseId) => {
    if (!user) {
      showToast('Please log in to refer students', 'warning');
      return;
    }
    setReferCollegeId(collegeId);
    setReferCourseId(courseId);
    setShowReferModal(true);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const userMessage = { author: user.name, text: newChatMessage, isSystem: false };
    setClassroomChatMessages(prev => [...prev, userMessage]);
    setNewChatMessage('');

    // Simulated real-time responses from classmates after 2 seconds
    const mockResponses = [
      "Agreed! That makes complete sense.",
      "Can we review Slide 3 again, Professor?",
      "Good point. I had the same question.",
      "Fascinating lecture! Love this design.",
      "Nice!"
    ];
    setTimeout(() => {
      const randomMsg = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const studentNames = ["Robert Chen", "Alice Miller", "Sarah Jenkins"];
      const randomStudent = studentNames[Math.floor(Math.random() * studentNames.length)];
      setClassroomChatMessages(prev => [...prev, { author: randomStudent, text: randomMsg, isSystem: false }]);
    }, 2000);
  };

  // ----------------------------------------------------
  // SVGs for Sidebar Icons
  // ----------------------------------------------------
  const IconHome = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
  const IconColleges = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>;
  const IconAdmissions = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const IconMarket = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>;
  const IconClass = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;
  const IconLedger = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>;
  const IconProfile = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;

  // ----------------------------------------------------
  // Views
  // ----------------------------------------------------
  const renderLanding = () => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.2', background: 'linear-gradient(135deg, var(--secondary), var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.5rem' }}>
        EduConnect Platform
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
        The unified educational referral, P2P developer marketplace, and live virtual classroom environment. Built for elite career growth.
      </p>

      <div className="stats-grid" style={{ width: '100%' }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => {
          if (!user) {
            showToast("Please sign in to access referrals.", "warning");
            setCurrentTab("auth");
            setAuthView("login");
          } else if (user.role === 'student') {
            setCurrentTab("colleges");
          } else if (user.role === 'teacher') {
            showToast("Teachers manage classes. Redirecting to Teacher Dashboard.", "warning");
            setCurrentTab("teacher");
          } else if (user.role === 'admin') {
            setCurrentTab("admin");
            setAdminSubTab("admissions");
          }
        }}>
          <div style={{ color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.8rem' }}>Admissions Referral</div>
          <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>Earn Commission</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Refer students to fully accredited partner colleges. Get rewarded with high referral payouts credited instantly.</p>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => {
          if (!user) {
            showToast("Please sign in to access the course marketplace.", "warning");
            setCurrentTab("auth");
            setAuthView("login");
          } else if (user.role === 'student') {
            setCurrentTab("marketplace");
          } else {
            showToast("Marketplace is for students. Accessing console panels.", "warning");
            setCurrentTab(user.role === 'teacher' ? "teacher" : "admin");
          }
        }}>
          <div style={{ color: 'var(--accent)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.8rem' }}>Course Marketplace</div>
          <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>Learn Software Skills</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enroll in premium, developer-focused coding courses. Pay or earn using our sandbox account wallets.</p>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => {
          if (!user) {
            showToast("Please sign in to attend online classes.", "warning");
            setCurrentTab("auth");
            setAuthView("login");
          } else if (user.role === 'student') {
            setCurrentTab("classes");
          } else if (user.role === 'teacher') {
            setCurrentTab("teacher");
          } else {
            showToast("Admins manage database explorer. Redirecting to Admin Panel.", "warning");
            setCurrentTab("admin");
          }
        }}>
          <div style={{ color: 'var(--secondary)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.8rem' }}>Online Classes</div>
          <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>Virtual Classroom</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Join live video streams, browse interactive slides, chat in real-time, and draft notes in your study desk.</p>
        </div>
      </div>
      
      {!user && (
        <button className="btn btn-primary" style={{ marginTop: '3rem', padding: '0.8rem 2.5rem' }} onClick={() => setCurrentTab('auth')}>
          Sign In to Access Dashboard
        </button>
      )}
    </div>
  );

  const renderAuth = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', background: '#0e1422' }}>
        {authView === 'login' ? (
          <form onSubmit={handleLogin}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>Sign in to start learning and earning</p>
            
            <div className="form-group">
              <label>Email address</label>
              <input type="email" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="name@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-control" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }} onClick={() => { setAuthView('forgot_password'); setResetEmail(authEmail); }}>Forgot Password?</span>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setAuthView('register')}>Register</span>
            </p>
          </form>
        ) : authView === 'register' ? (
          <form onSubmit={handleRegister}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>Create Account</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>Register into the EduConnect workspace</p>
            
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={authName} onChange={(e) => setAuthName(e.target.value)} required placeholder="Alex Johnson" />
            </div>
            <div className="form-group">
              <label>Email address</label>
              <input type="email" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="name@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-control" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>Select Role</label>
              <select className="form-control" value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                <option value="student">Student / Referrer</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Register</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Already registered? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setAuthView('login')}>Sign In</span>
            </p>
          </form>
        ) : authView === 'forgot_password' ? (
          <form onSubmit={handleForgotPasswordSubmit}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>Enter your email to receive a simulated verification OTP code</p>
            
            <div className="form-group">
              <label>Email address</label>
              <input type="email" className="form-control" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required placeholder="name@example.com" />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Send Verification OTP</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Remember your password? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setAuthView('login')}>Sign In</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPasswordSubmit}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>Verify OTP Code</h2>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-main)' }}>
              {lastGeneratedOtp ? (
                <span>Generated code: <strong style={{ color: 'var(--accent)', fontSize: '1rem', letterSpacing: '0.05em' }}>{lastGeneratedOtp}</strong></span>
              ) : (
                <span>Simulated OTP sent to <strong>{resetEmail}</strong></span>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                For quick testing, you can also use master code: <strong style={{ color: 'var(--success)' }}>123456</strong>
              </div>
            </div>
            
            <div className="form-group">
              <label>6-Digit OTP Code</label>
              <input type="text" maxLength="6" className="form-control" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} required placeholder="123456" style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="form-control" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Reset Password</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Didn't receive code? <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }} onClick={handleForgotPasswordSubmit}>Resend</span> or <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setAuthView('login')}>Cancel</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );

  const renderColleges = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Partner Colleges Directory</h2>
          <p>Submit student admission referrals to earn high-paying commission cash rewards.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.5rem' }}>
        {colleges.map(col => (
          <div key={col.college_id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>{col.college_name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>📍 {col.location}</p>
              </div>
              <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Contact: <strong style={{ textTransform: 'none', display: 'block', color: 'var(--text-main)' }}>{col.contact}</strong>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referral Programs</h4>
            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginTop: '0' }}>
              {col.courses && col.courses.map(course => (
                <div key={course.course_id} style={{ background: 'rgba(255,255,255,0.015)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <div>
                    <h5 style={{ fontSize: '1rem' }}>{course.course_name}</h5>
                    <div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Earn ${course.commission.toFixed(2)}
                    </div>
                  </div>
                  {(!user || user.role === 'student') && (
                    <button className="btn btn-accent" style={{ padding: '0.4rem 0.8rem', width: '100%', marginTop: '1rem', fontSize: '0.8rem' }} onClick={() => triggerReferralModal(col.college_id, course.course_id)}>
                      Refer Student
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdmissions = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Referral Tracking Panel</h2>
          <p>Track the audit state of your referred students and payout disbursements.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('colleges')}>
          Submit Referral +
        </button>
      </div>

      <div className="table-container">
        {admissions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Program details</th>
                <th>Status</th>
                <th>Expected Earnings</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map(adm => {
                const course = colleges.flatMap(c => c.courses || []).find(crs => crs.course_id === adm.course_id);
                const college = colleges.find(c => (c.courses || []).some(crs => crs.course_id === adm.course_id));
                return (
                  <tr key={adm.admission_id}>
                    <td style={{ fontWeight: '600' }}>{adm.student_name}</td>
                    <td>
                      <div>{course ? course.course_name : 'Loading Course...'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{college ? college.college_name : 'Loading...'}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${adm.status.toLowerCase()}`}>{adm.status}</span>
                    </td>
                    <td style={{ fontWeight: '600', color: adm.status === 'Approved' ? 'var(--success)' : 'var(--text-muted)' }}>
                      ${course ? course.commission.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No referrals submitted yet. Head to <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentTab('colleges')}>Colleges</span> to start!
          </div>
        )}
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Course Marketplace</h2>
          <p>Purchase software engineering courses using your virtual account wallet.</p>
        </div>
      </div>

      {user && user.role === 'student' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.85rem' }}>Your Enrolled Developer Programs</h3>
          {myEnrollments.length > 0 ? (
            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {myEnrollments.map(enr => (
                <div key={enr.enrollment_id} className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div className="status-badge approved" style={{ marginBottom: '0.5rem' }}>✓ Purchased</div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{enr.title}</h4>
                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem' }} onClick={() => {
                    const matchedClass = onlineClasses.find(c => c.course_id === enr.course_id);
                    if (matchedClass) {
                      setActiveClass(matchedClass);
                      setCurrentTab('classroom');
                    } else {
                      showToast("No active lecture scheduled for this course. Contact your instructor.", "warning");
                    }
                  }}>
                    Enter Classroom Room
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No courses purchased yet. Check available courses below!</p>
          )}
        </div>
      )}

      {/* Top-Rated Instructors Spotlight Section */}
      <div style={{ background: 'rgba(255, 191, 0, 0.04)', border: '1px solid rgba(255, 191, 0, 0.2)', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffb703', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🏆 Top-Rated Instructors
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Verified student ratings & feedback to help you find the best educators.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {topTeachers.map(t => (
            <div key={t.user_id} className="card" style={{ minWidth: '220px', padding: '1rem', background: '#0b0f19', border: '1px solid var(--border-glass)', cursor: 'pointer' }} onClick={() => openTeacherReviewsModal(t.user_id, t.name)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {t.profile_pic ? (
                  <img src={t.profile_pic} alt={t.name} style={{ width: '42px', height: '42px', borderRadius: getAvatarBorderRadius(t.avatar_shape), objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {t.name ? t.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'T'}
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>{t.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Instructor</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.65rem', borderRadius: '8px' }}>
                <span style={{ color: '#ffb703', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ⭐ {t.avg_rating ? t.avg_rating.toFixed(1) : '5.0'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({t.review_count || 0} reviews)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Catalog of Available Courses</h3>
      <div className="grid-container">
        {teachingCourses.map(course => {
          const isEnrolled = myEnrollments.some(e => e.course_id === course.course_id);
          return (
            <div key={course.course_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: '600' }}>Dev Course</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>${course.price.toFixed(2)}</span>
                </div>
                <h3 className="card-title" style={{ marginTop: '0.75rem', fontSize: '1.15rem' }}>{course.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{course.description}</p>

                {/* Instructor & Rating Badge */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👨‍🏫 {course.teacher_name}</span>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: '#ffb703', borderColor: 'rgba(255, 183, 3, 0.3)', background: 'rgba(255, 183, 3, 0.05)' }}
                    onClick={() => openTeacherReviewsModal(course.teacher_id, course.teacher_name)}
                  >
                    ⭐ {course.avg_rating ? parseFloat(course.avg_rating).toFixed(1) : '5.0'} ({course.review_count || 0})
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                {isEnrolled ? (
                  <>
                    <button className="btn btn-secondary" style={{ flex: 1 }} disabled>Enrolled</button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderColor: '#ffb703', color: '#ffb703' }}
                      onClick={() => setShowLeaveReviewModal({ teacher_id: course.teacher_id, teacher_name: course.teacher_name, course_id: course.course_id, course_title: course.title })}
                    >
                      ⭐ Rate
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleBuyCourse(course.course_id)}>Enroll Now</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verified Reviews View Modal */}
      {selectedTeacherReviewsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0b0f19', border: '1px solid var(--border-glass-hover)', borderRadius: '16px', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{selectedTeacherReviewsModal.teacher_name}</h3>
                <div style={{ fontSize: '0.85rem', color: '#ffb703', fontWeight: 'bold', marginTop: '0.2rem' }}>
                  ⭐ {selectedTeacherReviewsModal.avg_rating} Overall Rating ({selectedTeacherReviewsModal.total_reviews} verified student reviews)
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.65rem' }} onClick={() => setSelectedTeacherReviewsModal(null)}>✕ Close</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {selectedTeacherReviewsModal.reviews && selectedTeacherReviewsModal.reviews.length > 0 ? (
                selectedTeacherReviewsModal.reviews.map(rev => (
                  <div key={rev.review_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.85rem' }}>👤 {rev.student_name}</span>
                      <span style={{ color: '#ffb703', fontWeight: 'bold', fontSize: '0.8rem' }}>{"⭐".repeat(rev.rating)}</span>
                    </div>
                    {rev.course_title && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>Course: {rev.course_title}</div>
                    )}
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{rev.comment}</p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'right' }}>{rev.created_at}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No student reviews written yet for this instructor.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Review Submission Modal */}
      {showLeaveReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0b0f19', border: '1px solid var(--border-glass-hover)', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', marginBottom: '0.25rem' }}>Rate & Review Instructor</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Instructor: <strong style={{ color: '#fff' }}>{showLeaveReviewModal.teacher_name}</strong> ({showLeaveReviewModal.course_title})
            </p>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Select Rating Stars</label>
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ fontSize: '1.25rem', padding: '0.35rem 0.75rem', background: reviewRating >= star ? 'rgba(255, 183, 3, 0.2)' : 'rgba(255,255,255,0.03)', borderColor: reviewRating >= star ? '#ffb703' : 'rgba(255,255,255,0.08)', color: reviewRating >= star ? '#ffb703' : 'var(--text-muted)' }}
                      onClick={() => setReviewRating(star)}
                    >
                      ⭐ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Review Comment / Feedback</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={reviewComment} 
                  onChange={(e) => setReviewComment(e.target.value)} 
                  placeholder="Describe your learning experience with this instructor..." 
                  required 
                  style={{ resize: 'none' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLeaveReviewModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#ffb703', borderColor: '#ffb703', color: '#000', fontWeight: 'bold' }}>Submit Feedback ⭐</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotesMarketplace = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Study Notes & Lecture Handouts</h2>
          <p>Browse official study handbooks, lecture notes, and cheat sheets published directly by course instructors.</p>
        </div>
        {user && user.role === 'teacher' && (
          <button className="btn btn-primary" onClick={() => setCurrentTab('teacher')}>
            + Publish New Note
          </button>
        )}
      </div>

      <div className="grid-container">
        {studyNotes.map(note => (
          <div key={note.note_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="status-badge live" style={{ background: note.price === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: note.price === 0 ? '#10b981' : '#38bdf8', borderColor: note.price === 0 ? '#10b981' : '#38bdf8', fontWeight: 'bold' }}>
                  {note.price === 0 ? '🎁 FREE HANDOUT' : `💰 $${note.price.toFixed(2)} USD`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👨‍🏫 {note.teacher_name}</span>
              </div>

              <h3 className="card-title" style={{ fontSize: '1.15rem' }}>{note.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>{note.description}</p>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginBottom: '1rem' }}>
                Course: <strong style={{ color: 'var(--text-main)' }}>{note.course_title}</strong>
              </div>
            </div>

            <div>
              {note.purchased ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1, background: 'var(--success)', borderColor: 'var(--success)', color: '#000', fontWeight: 'bold' }} onClick={() => setSelectedViewNote(note)}>
                    📖 Read Notes Live
                  </button>
                  {note.file_url && (
                    <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', textDecoration: 'none' }}>
                      ⬇️ PDF
                    </a>
                  )}
                </div>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%', fontWeight: 'bold' }} onClick={() => handleBuyNote(note.note_id)}>
                  💳 Unlock Notes for ${note.price.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        ))}

        {studyNotes.length === 0 && (
          <div className="card" style={{ gridColumn: 'span 3', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No study notes found in the marketplace. Check back soon or request your instructor to publish lecture notes.
          </div>
        )}
      </div>

      {/* Note Preview Modal */}
      {selectedViewNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0b0f19', border: '1px solid var(--border-glass-hover)', borderRadius: '16px', maxWidth: '750px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }}>{selectedViewNote.course_title}</span>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{selectedViewNote.title}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {selectedViewNote.teacher_name}</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.65rem' }} onClick={() => setSelectedViewNote(null)}>✕ Close</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#000', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)', fontFamily: 'monospace', fontSize: '0.9rem', color: '#38bdf8', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {selectedViewNote.content || "No text content provided for this note. Please click the PDF download button below to access full file documentation."}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Verified & Unlocked</span>
              {selectedViewNote.file_url && (
                <a href={selectedViewNote.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ padding: '0.45rem 1rem', textDecoration: 'none', fontWeight: 'bold' }}>
                  📥 Download Full PDF Handout
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderClassesList = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Virtual Classrooms & Live Meetings</h2>
          <p>Explore live video lectures, join official meeting links (Google Meet, Zoom, Teams), and enter interactive classrooms.</p>
        </div>
      </div>

      <div className="grid-container">
        {onlineClasses.map(cls => {
          const platform = detectMeetingPlatform(cls.meet_link);
          const defaultThumb = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80';
          const thumbUrl = cls.thumbnail || defaultThumb;

          return (
            <div key={cls.class_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 0, overflow: 'hidden' }}>
              {/* Header Image Thumbnail with Badges */}
              <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden', background: '#0b0f19' }}>
                <img 
                  src={thumbUrl} 
                  alt={cls.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.3) 60%, transparent 100%)' }} />
                
                {/* Floating Status & Time Badges */}
                <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 2, display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span className={`status-badge ${cls.status.toLowerCase()}`} style={{ fontWeight: 'bold', fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    {cls.status === 'Live' ? '🔴 LIVE NOW' : cls.status.toUpperCase()}
                  </span>
                  <span className="status-badge" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', color: 'var(--accent)', borderColor: 'var(--border-glass)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {cls.lecture_type === 'audio' ? '🎙️ Audio Only' : cls.lecture_type === 'meeting_link' ? '🔗 External Call' : '🎥 Video Stream'}
                  </span>
                </div>
                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: '0.25rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🕒 {cls.class_date}
                </div>

                {/* Course Title Overlay */}
                <div style={{ position: 'absolute', bottom: '0.75rem', left: '1rem', right: '1rem', zIndex: 2 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    {cls.course_title}
                  </span>
                  <h3 className="card-title" style={{ color: '#fff', fontSize: '1.1rem', margin: '0.15rem 0 0 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {cls.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                    {cls.description}
                  </p>
                  
                  {/* Enhanced Meeting Destination Card */}
                  <div style={{ background: platform.bg, border: `1px solid ${platform.border}`, padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: platform.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{platform.icon}</span> {platform.name}
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem', borderColor: platform.border, color: platform.color }}
                        onClick={() => {
                          navigator.clipboard.writeText(cls.meet_link);
                          showToast("Meeting link copied to clipboard 📋");
                        }}
                      >
                        📋 Copy Link
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.6rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                      {cls.meet_link}
                    </div>

                    <a 
                      href={cls.meet_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary" 
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: platform.color, borderColor: platform.color, color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textDecoration: 'none', padding: '0.45rem' }}
                    >
                      🚀 Join {platform.name}
                    </a>
                  </div>
                </div>

                {/* Educational Classroom Action Button */}
                <div>
                  {cls.status === 'Live' ? (
                    <button className="btn btn-primary" style={{ width: '100%', background: 'var(--danger)', borderColor: 'var(--danger)', boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)', fontWeight: 'bold' }} onClick={() => { setActiveClass(cls); setCurrentTab('classroom'); }}>
                      🎥 Enter Live Interactive Classroom
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--border-glass-hover)' }} onClick={() => { setActiveClass(cls); setCurrentTab('classroom'); }}>
                      🎥 Enter Interactive Room
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {onlineClasses.length === 0 && (
          <div className="card" style={{ gridColumn: 'span 3', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No scheduled classes found. Ensure you are enrolled in a course containing online lectures.
          </div>
        )}
      </div>
    </div>
  );

  const renderClassroomSimulator = () => {
    if (!activeClass) return null;
    const currentSlide = CLASSROOM_SLIDES[classroomSlideIndex];
    
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>{activeClass.course_title}</span>
            <h2>Classroom: {activeClass.title}</h2>
          </div>
          <button className="btn btn-secondary" onClick={() => setCurrentTab(user.role === 'teacher' ? 'teacher' : 'classes')}>
            Leave Classroom
          </button>
        </div>

        <div className="classroom-grid">
          {/* Left Column: Live Video Broadcast & Slides Presentation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="classroom-video-panel">
              <div className="video-player-container">
                {activeClass.lecture_type === 'audio' ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🎙️</div>
                    <div className="video-waves" style={{ justifyContent: 'center' }}>
                      <div className="wave-bar" style={{ height: '30px', background: 'var(--accent)' }}></div>
                      <div className="wave-bar" style={{ height: '50px', background: 'var(--accent)' }}></div>
                      <div className="wave-bar" style={{ height: '20px', background: 'var(--accent)' }}></div>
                      <div className="wave-bar" style={{ height: '60px', background: 'var(--accent)' }}></div>
                      <div className="wave-bar" style={{ height: '35px', background: 'var(--accent)' }}></div>
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>AUDIO-ONLY LECTURE BROADCAST</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Instructor Voice Channel Live • Speaker Mode Active</p>
                    <span className="status-badge live" style={{ marginTop: '0.5rem', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>🎙️ AUDIO BROADCAST ONLINE</span>
                  </div>
                ) : activeClass.status === 'Live' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="video-waves">
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                    </div>
                    <p style={{ color: '#fff', fontWeight: '600', marginTop: '1rem', letterSpacing: '0.05em' }}>LIVE STREAM SIMULATOR BROADCASTING</p>
                    <span className="status-badge live" style={{ marginTop: '0.5rem' }}>LIVE VIDEO ACTIVE</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1.25rem' }}>Broadcast Off</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>This lecture has completed or is scheduled for later.</p>
                  </div>
                )}

                {/* Slides Presentation Overlaid in top right */}
                <div className="slides-panel">
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: '600' }}>Lecture Presentation</span>
                  <div style={{ margin: '0.5rem 0' }}>
                    <h5 style={{ fontSize: '0.85rem', color: '#fff' }}>{currentSlide.title}</h5>
                    <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {currentSlide.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
                    </ul>
                  </div>
                  <div className="slide-controls">
                    <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => setClassroomSlideIndex(p => Math.max(0, p - 1))}>◀ Prev</button>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>{classroomSlideIndex + 1} / {CLASSROOM_SLIDES.length}</span>
                    <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => setClassroomSlideIndex(p => Math.min(CLASSROOM_SLIDES.length - 1, p + 1))}>Next ▶</button>
                  </div>
                </div>
              </div>

              <div className="video-instructor-card">
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presenter</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{activeClass.teacher_name || 'Dr. Helen Carter'}</p>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: '0.5rem' }}>Lecture Details</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeClass.description}</p>
              {activeClass.meet_link && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  🔗 <strong>Official Link:</strong> <a href={activeClass.meet_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{activeClass.meet_link}</a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chat Box & Personal Notes */}
          <div className="classroom-interaction-panel">
            {/* Live Chat Box */}
            <div className="interactive-panel-card">
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Live Chat Room</h4>
              <div className="chat-messages-container">
                {classroomChatMessages.map((msg, idx) => (
                  <div key={idx} className="chat-bubble">
                    <div className="chat-bubble-author">
                      <span>{msg.author}</span>
                      {msg.author === user.name && <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>You</span>}
                    </div>
                    <div style={{ color: msg.isSystem ? 'var(--warning)' : 'var(--text-main)' }}>{msg.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="form-control" style={{ padding: '0.5rem', fontSize: '0.85rem' }} value={newChatMessage} onChange={(e) => setNewChatMessage(e.target.value)} placeholder="Type a message..." />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Send</button>
              </form>
            </div>

            {/* Private Notepad */}
            <div className="interactive-panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Class Notes (Private)</h4>
                <span style={{ fontSize: '0.7rem', color: classroomNotesSaved ? 'var(--success)' : 'var(--warning)' }}>
                  {classroomNotesSaved ? "✓ Autosaved" : "● Saving..."}
                </span>
              </div>
              <textarea className="notes-textarea" value={classroomNotes} onChange={handleNotesChange} placeholder="Write down key takeaways or questions to review later... (Autosaves automatically)" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherDashboard = () => {
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Teacher Dashboard</h2>
            <p>Upload new courses, schedule online lectures, and review student rosters.</p>
          </div>
        </div>

        {/* Custom CSS Chart for Course Enrollments */}
        <div className="chart-container" style={{ marginBottom: '2.25rem' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Enrollment Statistics per Course</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Visual metrics of active student enrollments across your published curriculum.</p>
          
          <div className="bar-chart-visual">
            {myTeachingCourses.map(course => {
              const enrollmentCount = teacherEnrollments.filter(e => e.course_id === course.course_id).length;
              // Map heights (max count 10 for display logic)
              const percentageHeight = Math.min(100, Math.max(10, (enrollmentCount / 10) * 100));
              return (
                <div key={course.course_id} className="chart-bar-col">
                  <div className="chart-bar-pillar" style={{ height: `${percentageHeight}%` }}>
                    <span className="chart-bar-value">{enrollmentCount}</span>
                  </div>
                  <span className="chart-bar-label" style={{ maxWidth: '140px' }}>{course.title}</span>
                </div>
              );
            })}
            {myTeachingCourses.length === 0 && (
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-dark)' }}>No course metrics available.</div>
            )}
          </div>
        </div>

        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', alignItems: 'start' }}>
          {/* Column Left: Publishing Course */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Publish New Course Module</h3>
            <form onSubmit={handleCreateTeachingCourse}>
              <div className="form-group">
                <label>Course Title</label>
                <input type="text" className="form-control" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required placeholder="e.g. Introduction to SQLite database structure" />
              </div>
              <div className="form-group">
                <label>Course Description</label>
                <textarea className="form-control" rows="3" value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} required placeholder="Curriculum summary details..." style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label>Price ($ USD)</label>
                <input type="number" step="0.01" className="form-control" value={newCoursePrice} onChange={(e) => setNewCoursePrice(e.target.value)} required placeholder="e.g. 59.99" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Course</button>
            </form>
          </div>

          {/* Column Right: Scheduling Class */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Schedule Online Lecture</h3>
            <form onSubmit={handleScheduleClass}>
              <div className="form-group">
                <label>Select Associated Course</label>
                <select className="form-control" value={newClassCourseId} onChange={(e) => setNewClassCourseId(e.target.value)} required>
                  <option value="">-- Choose Course --</option>
                  {myTeachingCourses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Lecture Title</label>
                <input type="text" className="form-control" value={newClassTitle} onChange={(e) => setNewClassTitle(e.target.value)} required placeholder="e.g. Lecture 3: Understanding Relational Models" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" className="form-control" value={newClassDesc} onChange={(e) => setNewClassDesc(e.target.value)} required placeholder="Covering foreign key constraints, indexes..." />
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input type="text" className="form-control" value={newClassDate} onChange={(e) => setNewClassDate(e.target.value)} required placeholder="Today 18:00 or July 25 15:30" />
              </div>

              <div className="form-group">
                <label>Preferred Broadcast Format</label>
                <select className="form-control" value={newClassLectureType} onChange={(e) => setNewClassLectureType(e.target.value)}>
                  <option value="video">🎥 Full Video Broadcast (HD Stream & Presentation)</option>
                  <option value="audio">🎙️ Audio-Only Lecture (Podcast style + Audio visualizer)</option>
                  <option value="meeting_link">🔗 External Video Call (Google Meet, Zoom, Teams)</option>
                </select>
              </div>

              {/* Enhanced Video Link Input with Auto-Platform Detection */}
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Video Stream Meeting Link</span>
                  {newClassMeetLink && (
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: detectMeetingPlatform(newClassMeetLink).bg, color: detectMeetingPlatform(newClassMeetLink).color, border: `1px solid ${detectMeetingPlatform(newClassMeetLink).border}`, fontWeight: 'bold' }}>
                      {detectMeetingPlatform(newClassMeetLink).icon} {detectMeetingPlatform(newClassMeetLink).name}
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newClassMeetLink} 
                  onChange={(e) => setNewClassMeetLink(e.target.value)} 
                  required 
                  placeholder="e.g. https://meet.google.com/xyz-abcd or https://zoom.us/j/12345" 
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.35rem' }}>
                  Supported: Google Meet, Zoom, Microsoft Teams, WebEx, YouTube Live, or Custom links.
                </small>
              </div>

              {/* Class Cover Thumbnail Picker & Upload */}
              <div className="form-group">
                <label>Class Thumbnail & Cover Image</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {newClassThumbnail ? (
                    <img src={newClassThumbnail} alt="Class Thumbnail Preview" style={{ width: '90px', height: '55px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-glass-hover)' }} />
                  ) : (
                    <div style={{ width: '90px', height: '55px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      No Image
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }} 
                      value={newClassThumbnail} 
                      onChange={(e) => setNewClassThumbnail(e.target.value)} 
                      placeholder="Paste Image URL or choose preset below" 
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.25rem' }}>Presets:</span>
                  {THUMBNAIL_PRESETS.map(preset => (
                    <button 
                      key={preset.label} 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', background: newClassThumbnail === preset.url ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)', borderColor: newClassThumbnail === preset.url ? 'var(--accent)' : 'rgba(255,255,255,0.08)', color: newClassThumbnail === preset.url ? 'var(--accent)' : 'var(--text-muted)' }}
                      onClick={() => setNewClassThumbnail(preset.url)}
                    >
                      📷 {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom File Upload Option */}
                <div style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="class-thumb-file-upload" className="btn btn-secondary" style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                    📁 Upload Custom Thumbnail Image from PC
                  </label>
                  <input 
                    id="class-thumb-file-upload" 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        resizeImageToBase64(file, 'medium', (resizedBase64) => {
                          setNewClassThumbnail(resizedBase64);
                          showToast("Custom class thumbnail uploaded 📷");
                        });
                      }
                    }} 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '0.5rem' }}>Schedule Class</button>
            </form>
          </div>

          {/* Column 3: Publish Study Notes */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>📚 Sell Study Notes & Lecture Handouts</h3>
            <form onSubmit={handlePublishNote}>
              <div className="form-group">
                <label>Associated Course</label>
                <select className="form-control" value={newNoteCourseId} onChange={(e) => setNewNoteCourseId(e.target.value)} required>
                  <option value="">-- Choose Course --</option>
                  {myTeachingCourses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Note Title</label>
                <input type="text" className="form-control" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} required placeholder="e.g. Master Cheat Sheet & Formulas" />
              </div>
              <div className="form-group">
                <label>Description & Summary</label>
                <input type="text" className="form-control" value={newNoteDesc} onChange={(e) => setNewNoteDesc(e.target.value)} required placeholder="45-page comprehensive breakdown..." />
              </div>
              <div className="form-group">
                <label>Price ($ USD) - 0 for Free Handout</label>
                <input type="number" step="0.01" className="form-control" value={newNotePrice} onChange={(e) => setNewNotePrice(e.target.value)} placeholder="0 for Free or 15.00" />
              </div>
              <div className="form-group">
                <label>Text Notes Content (Markdown/Text)</label>
                <textarea className="form-control" rows="3" value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Enter key formulas, notes content..." style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label>PDF / Download Link (Optional)</label>
                <input type="text" className="form-control" value={newNoteFileUrl} onChange={(e) => setNewNoteFileUrl(e.target.value)} placeholder="https://example.com/notes.pdf" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Study Note</button>
            </form>
          </div>

          {/* Teacher classes list */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your Scheduled Online Classes</h3>
            <div className="table-container" style={{ background: 'none', border: 'none', marginTop: '0' }}>
              {onlineClasses.filter(c => myTeachingCourses.some(mt => mt.course_id === c.course_id)).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Lecture Title</th>
                      <th>Course</th>
                      <th>Date</th>
                      <th>Status / Action</th>
                      <th>Classroom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineClasses.filter(c => myTeachingCourses.some(mt => mt.course_id === c.course_id)).map(cls => (
                      <tr key={cls.class_id}>
                        <td style={{ fontWeight: '600' }}>{cls.title}</td>
                        <td>{cls.course_title}</td>
                        <td>{cls.class_date}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <span className={`status-badge ${cls.status.toLowerCase()}`}>{cls.status}</span>
                            {cls.status !== 'Completed' && (
                              <select className="form-control" style={{ width: '110px', padding: '0.15rem 0.5rem', fontSize: '0.75rem' }} value={cls.status} onChange={(e) => handleUpdateClassStatus(cls.class_id, e.target.value)}>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Live">Live</option>
                                <option value="Completed">Completed</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setActiveClass(cls); setCurrentTab('classroom'); }}>
                            Join Room
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No lectures scheduled yet. Fill out the form above to schedule your first online class.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminPanel = () => {
    if (!user || user.role !== 'admin') {
      return (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.5rem' }}>Administrator Access Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
            This panel is protected and only accessible to system administrators logged in with official admin credentials.
          </p>
          <button className="btn btn-primary" onClick={() => { setCurrentTab('auth'); setAuthView('login'); }}>
            Sign In with Admin Account
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Admin Management Console</h2>
            <p>Approve referrals, manage colleges, and run direct database queries.</p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className={`btn ${adminSubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('overview')}>Overview Stats</button>
          <button className={`btn ${adminSubTab === 'admissions' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('admissions')}>Referral Queue</button>
          <button className={`btn ${adminSubTab === 'colleges' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('colleges')}>Manage Colleges</button>
          <button className={`btn ${adminSubTab === 'whatsapp_bot' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderColor: '#25D366', color: adminSubTab === 'whatsapp_bot' ? '#fff' : '#25D366' }} onClick={() => setAdminSubTab('whatsapp_bot')}>WhatsApp Bot 💬</button>
          <button className={`btn ${adminSubTab === 'db_explorer' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderColor: 'var(--accent)', color: adminSubTab === 'db_explorer' ? '#fff' : 'var(--accent)' }} onClick={() => setAdminSubTab('db_explorer')}>Database Explorer 🗄️</button>
          <button className={`btn ${adminSubTab === 'email_settings' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderColor: 'var(--secondary)', color: adminSubTab === 'email_settings' ? '#fff' : 'var(--secondary)' }} onClick={() => setAdminSubTab('email_settings')}>Email Settings ✉️</button>
        </div>

        {/* Admin overview sub-view */}
        {adminSubTab === 'overview' && (
          <div>
            {adminStats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Total platform Users</span>
                  <div className="stat-value">{adminStats.totalUsers}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Affiliated colleges</span>
                  <div className="stat-value">{adminStats.totalColleges}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Course Purchases</span>
                  <div className="stat-value">${adminStats.totalCourseSales.toFixed(2)}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Commissions Paid</span>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>${adminStats.totalCommissionPaid.toFixed(2)}</div>
                </div>
              </div>
            )}
            
            {/* Visual HTML/CSS Chart for platform metrics */}
            <div className="card">
              <h4 style={{ marginBottom: '0.5rem' }}>Platform Financial Overview</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Visual representation of money flow: total course marketplace sales versus commission disbursements paid out.</p>
              {adminStats && (
                <div className="bar-chart-visual" style={{ height: '140px' }}>
                  <div className="chart-bar-col">
                    <div className="chart-bar-pillar" style={{ height: '80%', background: 'linear-gradient(0deg, var(--primary), var(--accent))' }}>
                      <span className="chart-bar-value">${adminStats.totalCourseSales}</span>
                    </div>
                    <span className="chart-bar-label">Marketplace Revenue</span>
                  </div>
                  <div className="chart-bar-col">
                    <div className="chart-bar-pillar" style={{ height: `${(adminStats.totalCommissionPaid / (adminStats.totalCourseSales || 1)) * 80}%`, background: 'linear-gradient(0deg, var(--danger), var(--secondary))', boxShadow: 'none' }}>
                      <span className="chart-bar-value">${adminStats.totalCommissionPaid}</span>
                    </div>
                    <span className="chart-bar-label">Referral Commission Paid</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admissions Referral queue sub-view */}
        {adminSubTab === 'admissions' && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Referral Verification Queue</h3>
            <div className="table-container" style={{ background: 'none', border: 'none', marginTop: '0' }}>
              {admissions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>College & Course</th>
                      <th>Referrer Name</th>
                      <th>Payout</th>
                      <th>Status / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map(adm => {
                      const course = colleges.flatMap(c => c.courses || []).find(crs => crs.course_id === adm.course_id);
                      const college = colleges.find(c => (c.courses || []).some(crs => crs.course_id === adm.course_id));
                      return (
                        <tr key={adm.admission_id}>
                          <td style={{ fontWeight: '600' }}>{adm.student_name}</td>
                          <td>
                            <div>{course ? course.course_name : 'Loading...'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{college ? college.college_name : ''}</div>
                          </td>
                          <td>{adm.referrer_name || ' Sarah Jenkins'}</td>
                          <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                            ${course ? course.commission.toFixed(2) : '0.00'}
                          </td>
                          <td>
                            {adm.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-accent" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleApproveReject(adm.admission_id, 'Approved')}>Approve</button>
                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleApproveReject(adm.admission_id, 'Rejected')}>Reject</button>
                              </div>
                            ) : (
                              <span className={`status-badge ${adm.status.toLowerCase()}`}>{adm.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No referrals currently pending in queue.</p>
              )}
            </div>
          </div>
        )}

        {/* Manage Colleges sub-view */}
        {adminSubTab === 'colleges' && (
          <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', alignItems: 'start' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Add Partner College</h3>
              <form onSubmit={handleAddCollege}>
                <div className="form-group">
                  <label>College Name</label>
                  <input type="text" className="form-control" value={newCollegeName} onChange={(e) => setNewCollegeName(e.target.value)} required placeholder="e.g. Princeton University" />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" className="form-control" value={newCollegeLocation} onChange={(e) => setNewCollegeLocation(e.target.value)} required placeholder="Princeton, New Jersey" />
                </div>
                <div className="form-group">
                  <label>Admissions Email</label>
                  <input type="email" className="form-control" value={newCollegeContact} onChange={(e) => setNewCollegeContact(e.target.value)} required placeholder="admissions@princeton.edu" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add College</button>
              </form>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Add Program & Payout</h3>
              <form onSubmit={handleAddCourse}>
                <div className="form-group">
                  <label>Affiliated College</label>
                  <select className="form-control" value={newCourseCollegeId} onChange={(e) => setNewCourseCollegeId(e.target.value)} required>
                    <option value="">-- Select College --</option>
                    {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.college_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Program Name</label>
                  <input type="text" className="form-control" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} required placeholder="e.g. Master in Economics" />
                </div>
                <div className="form-group">
                  <label>Referral Commission ($ USD)</label>
                  <input type="number" className="form-control" value={newCourseCommission} onChange={(e) => setNewCourseCommission(e.target.value)} required placeholder="e.g. 1500" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Program</button>
              </form>
            </div>
          </div>
        )}

        {/* Database Explorer Tab */}
        {adminSubTab === 'db_explorer' && (
          <div>
            {/* Live SQL Console */}
            <div className="sql-console-card">
              <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live SQL Console</span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem', marginBottom: '0.75rem', color: '#fff' }}>Execute Raw SQL Queries</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Run queries directly against the SQLite/MySQL engine. Note: Use exact table names (e.g. Users, Colleges, Courses, Admissions, TeachingCourses, Enrollments, Payments, OnlineClasses).
              </p>
              
              <form onSubmit={handleExecuteSql}>
                <div className="sql-input-wrap">
                  <textarea className="sql-textarea" rows="3" value={sqlConsoleQuery} onChange={(e) => setSqlConsoleQuery(e.target.value)} placeholder="SELECT * FROM Users LIMIT 5;" required />
                  <button type="submit" className="btn btn-primary" style={{ height: 'fit-content', alignSelf: 'flex-end', background: 'var(--accent)', borderColor: 'var(--accent)', color: '#000' }}>
                    Run Query ⚡
                  </button>
                </div>
              </form>

              {sqlConsoleOutput && (
                <div className="console-output-box">
                  {sqlConsoleOutput}
                </div>
              )}
            </div>

            {/* Grid Explorer: Sidebar List + Table Rows */}
            <div className="db-explorer-grid">
              <div className="table-list-sidebar">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem', padding: '0 0.5rem' }}>Tables</span>
                {dbTables.map(tblName => (
                  <div key={tblName} className={`table-list-item ${selectedDbTable === tblName ? 'active' : ''}`} onClick={() => setSelectedDbTable(tblName)}>
                    📄 {tblName}
                  </div>
                ))}
              </div>

              <div className="card" style={{ overflowX: 'auto', minHeight: '300px' }}>
                <h4 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>Table Contents: {selectedDbTable}</h4>
                {dbTableRows.length > 0 ? (
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        {Object.keys(dbTableRows[0]).map(key => <th key={key}>{key}</th>)}
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbTableRows.map((row, idx) => {
                        // Find primary key key and value dynamically
                        const keys = Object.keys(row);
                        const pkField = keys[0]; // SQLite/MySQL first column is generally PK (user_id, college_id, etc.)
                        const pkVal = row[pkField];

                        return (
                          <tr key={idx}>
                            {keys.map(key => (
                              <td key={key} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                {row[key] !== null ? row[key].toString() : 'NULL'}
                              </td>
                            ))}
                            <td>
                              <button className="btn" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none' }} onClick={() => handleDeleteDbRow(selectedDbTable, pkVal)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>This database table is currently empty.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {adminSubTab === 'email_settings' && (
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>SMTP Mail Server Settings ✉️</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Configure your Gmail SMTP settings here so that EduConnect can send password recovery OTP codes directly to user emails.
            </p>

            <form onSubmit={handleSaveEmailSettings}>
              <div className="form-group">
                <label>Gmail Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={adminEmailUser} 
                  onChange={(e) => setAdminEmailUser(e.target.value)} 
                  required 
                  placeholder="e.g. your-account@gmail.com" 
                />
              </div>
              <div className="form-group">
                <label>Gmail App Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={adminEmailPass} 
                  onChange={(e) => setAdminEmailPass(e.target.value)} 
                  required 
                  placeholder="e.g. abcd efgh ijkl mnop" 
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                  Google requires a 16-character **App Password** created in Google Account Security settings. Do not use your primary password.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save SMTP Settings
                </button>
                {adminEmailPassConfigured && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                    onClick={handleTestEmailSettings}
                    disabled={isSendingTestEmail}
                  >
                    {isSendingTestEmail ? 'Sending Test...' : 'Test Connection ⚡'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* WhatsApp Bot Control Console sub-view */}
        {adminSubTab === 'whatsapp_bot' && (
          <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', alignItems: 'start', gap: '1.5rem' }}>
            {/* Auto-Reply Settings & Mode Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#25D366' }}>💬</span> WhatsApp Auto-Reply Engine
                </h3>
                <span className={`status-badge ${waConfig.enabled ? 'approved' : 'rejected'}`}>
                  {waConfig.enabled ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>

              <form onSubmit={handleUpdateWaConfig}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <label style={{ margin: 0, fontWeight: '600' }}>Enable Auto-Reply Engine</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bot automatically handles incoming WhatsApp queries</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={waConfig.enabled} 
                    onChange={(e) => setWaConfig({ ...waConfig, enabled: e.target.checked })} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>

                <div className="form-group">
                  <label>Response Logic Mode</label>
                  <select 
                    className="form-control" 
                    value={waConfig.mode} 
                    onChange={(e) => setWaConfig({ ...waConfig, mode: e.target.value })}
                  >
                    <option value="hybrid">Hybrid Delay Fallback (Bot replies if Human doesn't reply in time)</option>
                    <option value="instant">Instant Initial Bot Reply (Bot answers immediately)</option>
                    <option value="off">Disabled (Human Only)</option>
                  </select>
                </div>

                {waConfig.mode === 'hybrid' && (
                  <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ margin: 0 }}>Absence Delay Threshold:</label>
                      <strong style={{ color: 'var(--accent)' }}>{waConfig.delaySeconds} Seconds</strong>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="120" 
                      step="5"
                      className="form-control" 
                      value={waConfig.delaySeconds} 
                      onChange={(e) => setWaConfig({ ...waConfig, delaySeconds: parseInt(e.target.value) })}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      If a human admin does not reply to an incoming message within {waConfig.delaySeconds} seconds, the bot automatically steps in to answer!
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ background: 'rgba(37, 211, 102, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                  <label style={{ color: '#25D366', fontWeight: 'bold' }}>📱 Human Admin Direct WhatsApp Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={waConfig.adminPhoneNumber || ''} 
                    onChange={(e) => setWaConfig({ ...waConfig, adminPhoneNumber: e.target.value })} 
                    placeholder="e.g. +919876543210 or +15550192" 
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.35rem' }}>
                    The chatbot automatically offers users a direct WhatsApp chat link to this number if they want to speak with a human!
                  </small>
                </div>

                <div className="form-group">
                  <label>Meta WhatsApp Webhook Token</label>
                  <input type="text" className="form-control" value={waConfig.webhookVerifyToken} onChange={(e) => setWaConfig({ ...waConfig, webhookVerifyToken: e.target.value })} required />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Set this token in Meta Developer Portal Webhooks configuration.</small>
                </div>

                <div className="form-group">
                  <label>WhatsApp Phone Number ID (Optional for Live API)</label>
                  <input type="text" className="form-control" value={waConfig.whatsappPhoneId} onChange={(e) => setWaConfig({ ...waConfig, whatsappPhoneId: e.target.value })} placeholder="e.g. 1098237498234" />
                </div>

                <div className="form-group">
                  <label>WhatsApp Graph API Token (Optional for Live API)</label>
                  <input type="password" className="form-control" value={waConfig.whatsappToken} onChange={(e) => setWaConfig({ ...waConfig, whatsappToken: e.target.value })} placeholder="e.g. EAAG..." />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: '#25D366', borderColor: '#25D366', color: '#000', fontWeight: 'bold' }}>
                  Save Bot Configuration 💾
                </button>
              </form>

              {/* Webhook URL Copy Helper Box */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: 'rgba(37, 211, 102, 0.05)', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#25D366', marginBottom: '0.4rem' }}>🔗 Meta Webhook Integration URL</div>
                <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'block', wordBreak: 'break-all' }}>
                  http://localhost:5000/api/whatsapp/webhook
                </code>
              </div>
            </div>

            {/* Live Conversation Feed & Manual Override */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                📱 Live WhatsApp Conversation Monitor
              </h3>

              {/* Send Manual Reply Box */}
              <form onSubmit={handleSendWaManualReply} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--accent)' }}>
                  ✍️ Manual Human Admin Override (Pauses Auto-Bot)
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <input type="text" className="form-control" value={waReplyPhone} onChange={(e) => setWaReplyPhone(e.target.value)} placeholder="Target Phone Number (e.g. +15550192)" required />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <textarea className="form-control" rows="2" value={waReplyMsg} onChange={(e) => setWaReplyMsg(e.target.value)} placeholder="Type manual response to send via WhatsApp..." required />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ width: '100%', borderColor: '#25D366', color: '#25D366' }}>
                  Send WhatsApp Message 📤
                </button>
              </form>

              {/* Chat Feed List */}
              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
                {waChats.length > 0 ? (
                  waChats.map(c => (
                    <div key={c.chat_id} style={{ 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      background: c.sender === 'user' ? 'rgba(255,255,255,0.04)' : c.sender === 'bot' ? 'rgba(37, 211, 102, 0.08)' : 'rgba(6, 182, 212, 0.1)',
                      borderLeft: `4px solid ${c.sender === 'user' ? 'var(--text-muted)' : c.sender === 'bot' ? '#25D366' : 'var(--accent)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                        <strong style={{ color: c.sender === 'user' ? '#fff' : c.sender === 'bot' ? '#25D366' : 'var(--accent)' }}>
                          {c.sender === 'user' ? `📱 ${c.phone_number}` : c.sender === 'bot' ? '🤖 EduBot (Auto)' : '👨‍💻 Human Admin'}
                        </strong>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>{c.message}</div>
                      {c.sender === 'user' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ marginTop: '0.5rem', padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => { setWaReplyPhone(c.phone_number); }}
                        >
                          Reply to this contact
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No WhatsApp chat messages received yet. Use the simulator below to test!
                  </div>
                )}
              </div>

              {/* Simulator Card */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#25D366' }}>
                  🧪 Interactive WhatsApp Webhook Simulator
                </div>
                <form onSubmit={handleSimulateIncomingWa} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input type="text" className="form-control" value={simPhone} onChange={(e) => setSimPhone(e.target.value)} placeholder="Student Phone Number" required />
                  <input type="text" className="form-control" value={simMsg} onChange={(e) => setSimMsg(e.target.value)} placeholder="Incoming Message Text" required />
                  <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.8rem' }} disabled={isSimulatingWa}>
                    {isSimulatingWa ? 'Simulating...' : 'Simulate Incoming WhatsApp Message ⚡'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPayments = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Ledger History Logs</h2>
          <p>Review transactional details and sandbox balance topups.</p>
        </div>
      </div>

      <div className="table-container">
        {payments.length > 0 ? (
          <table>
            <thead>
              <tr>
                {user.role === 'admin' && <th>User Email</th>}
                <th>Description</th>
                <th>Amount</th>
                <th>Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.payment_id}>
                  {user.role === 'admin' && <td style={{ fontWeight: '600' }}>{p.user_email || 'admin@educonnect.com'}</td>}
                  <td>{p.type}</td>
                  <td style={{ color: p.amount >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                    {p.amount >= 0 ? '+' : ''}${p.amount.toFixed(2)}
                  </td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transaction records logged.
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!user) return null;
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>My User Profile</h2>
            <p>Manage your account settings, credentials, and check your role statistics.</p>
          </div>
        </div>

        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', alignItems: 'start', gap: '1.75rem', marginTop: '1.5rem' }}>
          {/* Profile Update Panel */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Account Details</h3>
            <form onSubmit={handleUpdateProfile}>
              {/* Profile Picture Upload Circle with Shape and Size Configs */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div className="avatar-upload-container" style={{ position: 'relative', width: '110px', height: '110px', borderRadius: getAvatarBorderRadius(avatarShape), overflow: 'hidden', border: '2px solid var(--primary)', background: 'rgba(255,255,255,0.03)' }}>
                  {profilePic ? (
                    <img src={profilePic} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', fontSize: '2.25rem', fontWeight: 'bold' }}>
                      {profileName ? profileName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                    </div>
                  )}
                  <label htmlFor="profile-upload" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }} className="avatar-hover-label">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span style={{ marginTop: '2px' }}>Upload</span>
                  </label>
                  <input id="profile-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  {profilePic && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setShowAvatarLightbox(true)}>View Full Size 🔍</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setProfilePic('')}>Remove image</span>
                    </>
                  )}
                </div>
              </div>

              {/* Resolution / Size selection option */}
              <div style={{ width: '100%', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Image Upload Quality / Size</label>
                <select className="form-control" value={avatarCompression} onChange={(e) => setAvatarCompression(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: 'auto', background: 'rgba(255,255,255,0.03)' }}>
                  <option value="small">Small / Compressed (150x150 Thumbnail)</option>
                  <option value="medium">Medium / Balanced (400x400 Standard)</option>
                  <option value="original">Original / Max Quality (Full Resolution)</option>
                </select>
              </div>

              {/* Display shape selection option */}
              <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avatar Shape</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['circle', 'rounded', 'square'].map(shape => (
                    <button type="button" key={shape} className={`btn ${avatarShape === shape ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', textTransform: 'capitalize' }} onClick={() => setAvatarShape(shape)}>
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-control" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Username</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', paddingLeft: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.25rem', userSelect: 'none' }}>@</span>
                  <input type="text" className="form-control" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="username" style={{ border: 'none', background: 'transparent', paddingLeft: 0 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-control" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mobile Number</label>
                  <input type="tel" className="form-control" value={profileMobile} onChange={(e) => setProfileMobile(e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
                <div className="form-group" style={{ width: '100px' }}>
                  <label>Age</label>
                  <input type="number" className="form-control" value={profileAge} onChange={(e) => setProfileAge(e.target.value)} placeholder="20" min="0" max="150" />
                </div>
              </div>

              <div className="form-group">
                <label>Gender / Sex</label>
                <select className="form-control" value={profileGender} onChange={(e) => setProfileGender(e.target.value)}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label>Billing & Contact Address</label>
                <textarea className="form-control" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} placeholder="123 Academic Way, Suite 101, Stanford, CA" rows="2" style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label>User Role</label>
                <input type="text" className="form-control" value={user.role.toUpperCase()} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Update Profile</button>
            </form>
          </div>

          {/* Change Password Panel */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Update Security</h3>
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="form-control" value={profileCurrentPassword} onChange={(e) => setProfileCurrentPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="form-control" value={profileNewPassword} onChange={(e) => setProfileNewPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', background: 'var(--accent)', borderColor: 'var(--accent)', color: '#000' }}>Change Password</button>
            </form>
          </div>
        </div>

        {/* Account stats cards */}
        <div className="stats-grid" style={{ marginTop: '2rem' }}>
          <div className="card">
            <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Wallet Cash Balance</div>
            <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'var(--success)' }}>${user.wallet_balance.toFixed(2)}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Mock currency for course sales, purchases, and admissions referrals.</p>
          </div>
          
          {user.role === 'student' && (
            <>
              <div className="card">
                <div style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Enrolled Courses</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{myEnrollments.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total active course enrollments purchased from the developer marketplace.</p>
              </div>
              <div className="card">
                <div style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Admissions Referrals</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{admissions.filter(a => a.referrer_id === user.user_id).length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Submitted college admissions referrals under verification queue.</p>
              </div>
            </>
          )}

          {user.role === 'teacher' && (
            <>
              <div className="card">
                <div style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Published Courses</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{myTeachingCourses.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active premium classes listed on the public student marketplace.</p>
              </div>
              <div className="card">
                <div style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Registered Students</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{teacherEnrollments.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total student enrollments across all your hosted courses.</p>
              </div>
            </>
          )}

          {user.role === 'admin' && adminStats && (
            <>
              <div className="card">
                <div style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Platform Users</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{adminStats.totalUsers}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total user accounts registered database-wide.</p>
              </div>
              <div className="card">
                <div style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Colleges Monitored</div>
                <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{adminStats.totalColleges}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Affiliated university partner configurations.</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // Main SaaS layout
  // ----------------------------------------------------
  return (
    <div className="app-layout">
      {/* SaaS Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>EduConnect</span>
          </div>

          {/* Three-Dot Master Drawer Button */}
          <button 
            type="button" 
            title="All Navigation Features (Master Menu)"
            style={{ 
              background: 'rgba(56, 189, 248, 0.15)', 
              border: '1px solid rgba(56, 189, 248, 0.4)', 
              color: 'var(--accent)', 
              borderRadius: '8px', 
              padding: '0.15rem 0.55rem', 
              cursor: 'pointer', 
              fontSize: '1.25rem', 
              fontWeight: 'bold',
              lineHeight: 1
            }}
            onClick={() => setShowMasterNavModal(true)}
          >
            ⋮
          </button>
        </div>

        {/* Active Role Workspace Pill */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 'bold', 
            padding: '0.25rem 0.65rem', 
            borderRadius: '50px', 
            background: user?.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : user?.role === 'teacher' ? 'rgba(168, 85, 247, 0.15)' : user?.role === 'student' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
            color: user?.role === 'admin' ? 'var(--danger)' : user?.role === 'teacher' ? '#c084fc' : user?.role === 'student' ? 'var(--accent)' : 'var(--text-muted)',
            border: `1px solid ${user?.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : user?.role === 'teacher' ? 'rgba(168, 85, 247, 0.3)' : user?.role === 'student' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.1)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            {user?.role === 'admin' ? '⚙️ Admin Workspace' : user?.role === 'teacher' ? '👨‍🏫 Teacher Workspace' : user?.role === 'student' ? '🎓 Student Workspace' : '🌐 Public Portal'}
          </span>
        </div>

        <nav className="sidebar-menu">
          {/* Home - Available to all */}
          <div className={`sidebar-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
            <IconHome /> Home
          </div>

          {/* Student Panel Navigation Items */}
          {(!user || user.role === 'student') && (
            <>
              <div className={`sidebar-item ${currentTab === 'colleges' ? 'active' : ''}`} onClick={() => setCurrentTab('colleges')}>
                <IconColleges /> Colleges
              </div>
              <div className={`sidebar-item ${currentTab === 'admissions' ? 'active' : ''}`} onClick={() => {
                if (!user) { setCurrentTab("auth"); setAuthView("login"); } else { setCurrentTab('admissions'); }
              }}>
                <IconAdmissions /> Referrals
              </div>
              <div className={`sidebar-item ${currentTab === 'marketplace' ? 'active' : ''}`} onClick={() => {
                if (!user) { setCurrentTab("auth"); setAuthView("login"); } else { setCurrentTab('marketplace'); }
              }}>
                <IconMarket /> Marketplace
              </div>
              <div className={`sidebar-item ${currentTab === 'classes' ? 'active' : ''}`} onClick={() => {
                if (!user) { setCurrentTab("auth"); setAuthView("login"); } else { setCurrentTab('classes'); }
              }}>
                <IconClass /> Virtual Class
              </div>
              <div className={`sidebar-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => {
                if (!user) { setCurrentTab("auth"); setAuthView("login"); } else { setCurrentTab('notes'); }
              }}>
                📚 Study Notes
              </div>
            </>
          )}

          {/* Teacher Panel Navigation Items */}
          {user?.role === 'teacher' && (
            <>
              <div className={`sidebar-item ${currentTab === 'teacher' ? 'active' : ''}`} onClick={() => setCurrentTab('teacher')}>
                <IconClass /> Teacher Console
              </div>
              <div className={`sidebar-item ${currentTab === 'classes' ? 'active' : ''}`} onClick={() => setCurrentTab('classes')}>
                <IconClass /> Virtual Class
              </div>
              <div className={`sidebar-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => setCurrentTab('notes')}>
                📚 Study Notes
              </div>
              <div className={`sidebar-item ${currentTab === 'marketplace' ? 'active' : ''}`} onClick={() => setCurrentTab('marketplace')}>
                <IconMarket /> Marketplace
              </div>
            </>
          )}

          {/* Admin Panel Navigation Items */}
          {user?.role === 'admin' && (
            <>
              <div className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`} onClick={() => setCurrentTab('admin')}>
                <IconLedger /> Admin Panel
              </div>
              <div className={`sidebar-item ${currentTab === 'colleges' ? 'active' : ''}`} onClick={() => setCurrentTab('colleges')}>
                <IconColleges /> Colleges
              </div>
              <div className={`sidebar-item ${currentTab === 'admissions' ? 'active' : ''}`} onClick={() => setCurrentTab('admissions')}>
                <IconAdmissions /> Referrals
              </div>
              <div className={`sidebar-item ${currentTab === 'marketplace' ? 'active' : ''}`} onClick={() => setCurrentTab('marketplace')}>
                <IconMarket /> Marketplace
              </div>
              <div className={`sidebar-item ${currentTab === 'classes' ? 'active' : ''}`} onClick={() => setCurrentTab('classes')}>
                <IconClass /> Virtual Class
              </div>
              <div className={`sidebar-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => setCurrentTab('notes')}>
                📚 Study Notes
              </div>
              <div className={`sidebar-item ${currentTab === 'teacher' ? 'active' : ''}`} onClick={() => setCurrentTab('teacher')}>
                <IconClass /> Teacher Console
              </div>
            </>
          )}

          {/* Wallet Ledger & Profile - For all signed in users */}
          {user && (
            <>
              <div className={`sidebar-item ${currentTab === 'payments' ? 'active' : ''}`} onClick={() => setCurrentTab('payments')}>
                <IconLedger /> Wallet Ledger
              </div>
              <div className={`sidebar-item ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => setCurrentTab('profile')}>
                <IconProfile /> My Profile
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {user.profile_pic ? (
                  <img src={user.profile_pic} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: getAvatarBorderRadius(user.avatar_shape), objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                ) : (
                  <div style={{ display: 'flex', width: '40px', height: '40px', borderRadius: getAvatarBorderRadius(user.avatar_shape), alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                )}
                <div className="user-profile-details" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span className="user-profile-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                  <span className="user-profile-email" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem' }}>
                    {user.username ? `@${user.username}` : user.email}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', flex: 1, fontSize: '0.75rem', borderColor: 'var(--border-glass)' }} onClick={() => setCurrentTab('profile')}>
                  Edit Profile
                </button>
                <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none' }} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setCurrentTab('auth'); setAuthView('login'); }}>
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="main-workspace">
        {/* Workspace Top Header */}
        <header className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workspace Theme:</span>
            <select 
              className="form-control" 
              style={{ width: '140px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', height: 'auto', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}
              value={activeTheme}
              onChange={(e) => setActiveTheme(e.target.value)}
            >
              <option value="midnight" style={{ background: '#0b0f19', color: '#fff' }}>Midnight Slate</option>
              <option value="cyberpunk" style={{ background: '#120029', color: '#fff' }}>Cyberpunk Neon</option>
              <option value="emerald" style={{ background: '#04140d', color: '#fff' }}>Emerald Forest</option>
              <option value="light" style={{ background: '#ffffff', color: '#000' }}>Light Glass</option>
            </select>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '0.4rem 1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wallet Balance:</span>
                <strong style={{ color: 'var(--success)' }}>${user.wallet_balance.toFixed(2)}</strong>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => {
                const addAmount = 1000;
                fetch('/api/auth/me', {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ amount: addAmount })
                }).then(() => {
                  showToast(`Credit Loaded: +$${addAmount.toFixed(2)}`);
                  fetchUserProfile();
                });
              }}>
                + Mock Cash
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setCurrentTab('profile')}>
                {user.profile_pic ? (
                  <img src={user.profile_pic} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: getAvatarBorderRadius(user.avatar_shape), objectFit: 'cover', border: '2px solid var(--primary)' }} />
                ) : (
                  <div style={{ display: 'flex', width: '32px', height: '32px', borderRadius: getAvatarBorderRadius(user.avatar_shape), alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)' }}>
                  {user.username ? `@${user.username}` : user.name.split(' ')[0]}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Workspace content window */}
        <div className="workspace-content">
          {currentTab === 'home' && renderLanding()}
          {currentTab === 'auth' && renderAuth()}
          {currentTab === 'colleges' && renderColleges()}
          {currentTab === 'admissions' && renderAdmissions()}
          {currentTab === 'marketplace' && renderMarketplace()}
          {currentTab === 'classes' && renderClassesList()}
          {currentTab === 'notes' && renderNotesMarketplace()}
          {currentTab === 'classroom' && renderClassroomSimulator()}
          {currentTab === 'teacher' && renderTeacherDashboard()}
          {currentTab === 'admin' && renderAdminPanel()}
          {currentTab === 'payments' && renderPayments()}
          {currentTab === 'profile' && renderProfile()}
        </div>
      </div>

      {/* Referral form Modal Overlay */}
      {showReferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-close" onClick={() => setShowReferModal(false)}>×</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Submit Student Admission</h3>
            <form onSubmit={handleReferralSubmit}>
              <div className="form-group">
                <label>Student Full Name</label>
                <input type="text" className="form-control" value={referStudentName} onChange={(e) => setReferStudentName(e.target.value)} placeholder="e.g. Emily Watson" required />
              </div>
              <div className="form-group">
                <label>Program Selection</label>
                <select className="form-control" value={referCourseId} onChange={(e) => setReferCourseId(e.target.value)} required>
                  <option value="">-- Choose Program --</option>
                  {colleges.map(c => (
                    <optgroup key={c.college_id} label={c.college_name}>
                      {c.courses && c.courses.map(crs => (
                        <option key={crs.course_id} value={crs.course_id}>{crs.course_name} (Comm: ${crs.commission.toFixed(2)})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Submit Referral</button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Avatar Picture */}
      {showAvatarLightbox && profilePic && (
        <div className="modal-overlay" onClick={() => setShowAvatarLightbox(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#111827', border: '1px solid var(--border-glass-hover)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-close" onClick={() => setShowAvatarLightbox(false)}>×</div>
            <img src={profilePic} alt="Avatar Full Size" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: getAvatarBorderRadius(avatarShape), objectFit: 'contain', border: '2px solid var(--primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} />
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Render shape: {avatarShape.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Floating Draggable Chat Logo Button - Home Page Only */}
      {currentTab === 'home' && !isChatOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            left: `${chatPos.x}px`, 
            top: `${chatPos.y}px`, 
            zIndex: 9999,
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          <button 
            type="button"
            onMouseDown={handleChatMouseDown}
            style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #25D366, #3b82f6)', 
              color: '#fff', 
              boxShadow: '0 8px 30px rgba(37, 211, 102, 0.5)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              cursor: isDraggingChat ? 'grabbing' : 'grab',
              transition: 'transform 0.15s ease'
            }}
            onClick={() => {
              if (!hasMovedChat) {
                setIsChatOpen(true);
              }
            }}
            title="Drag logo anywhere • Click to open EduBot AI & WhatsApp Support"
          >
            💬
          </button>
        </div>
      )}

      {/* Live Floating Chat Window - Always Fixed in Lower Right Corner */}
      {isChatOpen && (
        <div style={{ 
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 99999,
          width: '360px', 
          height: '480px', 
          background: '#0e1726', 
          border: '1px solid var(--border-glass-hover)', 
          borderRadius: '16px', 
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.85)', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div 
            style={{ 
              padding: '0.85rem 1rem', 
              background: 'linear-gradient(135deg, #064e3b, #0d9488)', 
              color: '#fff', 
              display: 'flex', 
              justify: 'space-between', 
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  EduBot AI & WhatsApp Support
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Online • Instant AI Assistance
                </div>
              </div>
            </div>

            {/* Red Glowing Close Button */}
            <button 
              type="button" 
              className="red-glow-close-btn"
              title="Close Chat"
              onClick={() => setIsChatOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Chat Body */}
          <div style={{ flex: 1, padding: '0.85rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(0,0,0,0.25)' }}>
            {chatMessages.map((m, idx) => (
              <div key={idx} style={{ 
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '0.55rem 0.8rem',
                borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: m.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.35'
              }}>
                {m.text}
              </div>
            ))}
            {isChatTyping && (
              <div style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                EduBot is typing...
              </div>
            )}
          </div>

          {/* Quick Action Bar for WhatsApp */}
          <div style={{ padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
            <a 
              href={`https://wa.me/${(waConfig.adminPhoneNumber || '').replace(/[^0-9]/g, '')}?text=Hi%20EduConnect,%20I%20want%20to%20speak%20with%20you%20directly`} 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '0.72rem', color: '#25D366', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              📲 Speak Directly on WhatsApp ({waConfig.adminPhoneNumber || 'Admin'})
            </a>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendSiteChatMessage} style={{ padding: '0.5rem', background: '#090d16', display: 'flex', gap: '0.4rem' }}>
            <input 
              type="text" 
              className="form-control" 
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', height: 'auto' }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about admissions, courses..."
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', background: '#25D366', borderColor: '#25D366', color: '#000', fontWeight: 'bold' }}>
              Send
            </button>
          </form>
        </div>
      )}

      {/* Three-Dot Master Navigation Drawer Modal */}
      {showMasterNavModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0b0f19', border: '1px solid var(--border-glass-hover)', borderRadius: '20px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.08em' }}>Master Navigation Hub</span>
                <h2 style={{ margin: '0.15rem 0 0 0', color: '#fff', fontSize: '1.5rem' }}>Explore All EduConnect Workspace Features</h2>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setShowMasterNavModal(false)}>✕ Close Menu</button>
            </div>

            {/* Categorized Grid of All Modules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              
              {/* Category 1: Main Hub */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📌 Main Hub</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('home'); setShowMasterNavModal(false); }}>
                    🏠 Home Dashboard
                  </button>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('colleges'); setShowMasterNavModal(false); }}>
                    🏫 Partner Colleges
                  </button>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('marketplace'); setShowMasterNavModal(false); }}>
                    🛒 Course Marketplace
                  </button>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', borderColor: '#25D366', color: '#25D366', fontWeight: 'bold' }} onClick={() => { setCurrentTab('home'); setIsChatOpen(true); setShowMasterNavModal(false); }}>
                    💬 EduBot AI & WhatsApp Support
                  </button>
                </div>
              </div>

              {/* Category 2: Student Desk (Visible to Students & Admins) */}
              {(!user || user.role === 'student' || user.role === 'admin') && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <h4 style={{ color: '#38bdf8', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎓 Student Desk</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('classes'); setShowMasterNavModal(false); }}>
                      🎥 Virtual Classroom
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('notes'); setShowMasterNavModal(false); }}>
                      📚 Study Notes Marketplace
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('admissions'); setShowMasterNavModal(false); }}>
                      📋 Referrals & Rewards
                    </button>
                  </div>
                </div>
              )}

              {/* Category 3: Teacher Console (Visible to Teachers & Admins) */}
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <h4 style={{ color: '#c084fc', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👨‍🏫 Teacher Console</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('teacher'); setShowMasterNavModal(false); }}>
                      👨‍🏫 Host Classes & Sell Notes
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('classes'); setShowMasterNavModal(false); }}>
                      🎙️ Live Broadcast Visualizer
                    </button>
                  </div>
                </div>
              )}

              {/* Category 4: Admin Management Console (STRICTLY visible to Admin ONLY) */}
              {user?.role === 'admin' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Admin Console</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => { setCurrentTab('admin'); setShowMasterNavModal(false); }}>
                      ⚙️ Admin Control Panel
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('admin'); setAdminSubTab('db_explorer'); setShowMasterNavModal(false); }}>
                      🗄️ Database Console
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCurrentTab('admin'); setAdminSubTab('whatsapp_bot'); setShowMasterNavModal(false); }}>
                      💬 WhatsApp Engine Setup
                    </button>
                  </div>
                </div>
              )}

              {/* Category 5: Account & Wallet */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--success)', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💳 Account & Wallet</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { if (!user) { setCurrentTab('auth'); } else { setCurrentTab('payments'); } setShowMasterNavModal(false); }}>
                    💳 Wallet & Cash Ledger
                  </button>
                  <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { if (!user) { setCurrentTab('auth'); } else { setCurrentTab('profile'); } setShowMasterNavModal(false); }}>
                    👤 Profile & Credentials
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="toast" style={{ borderLeftColor: toast.type === 'danger' ? 'var(--danger)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
