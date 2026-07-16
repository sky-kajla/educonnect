import React, { useState, useEffect } from 'react';

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
  const [newClassCourseId, setNewClassCourseId] = useState('');

  // Credentials form state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('student'); // 'student' or 'teacher'

  // Admin current view mode
  const [adminSubTab, setAdminSubTab] = useState('overview'); // 'overview', 'admissions', 'colleges', 'db_explorer'

  // Notification state
  const [toast, setToast] = useState(null);

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
    if (user) {
      fetchAdmissions();
      fetchPayments();
      if (user.role === 'admin') {
        fetchAdminStats();
        fetchDbTablesList();
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
          meet_link: newClassMeetLink
        })
      });
      if (res.ok) {
        showToast('Online class scheduled successfully!');
        setNewClassTitle('');
        setNewClassDesc('');
        setNewClassDate('');
        setNewClassMeetLink('');
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
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Sign In</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setAuthView('register')}>Register</span>
            </p>
          </form>
        ) : (
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
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                {isEnrolled ? (
                  <button className="btn btn-secondary" style={{ width: '100%' }} disabled>Enrolled</button>
                ) : (
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleBuyCourse(course.course_id)}>Enroll Now</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderClassesList = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Virtual Classrooms</h2>
          <p>Attend simulated online lectures, participate in live chat discussions, and take notes.</p>
        </div>
      </div>

      <div className="grid-container">
        {onlineClasses.map(cls => (
          <div key={cls.class_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`status-badge ${cls.status.toLowerCase()}`}>{cls.status}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🕒 {cls.class_date}</span>
              </div>
              <h3 className="card-title" style={{ marginTop: '1rem' }}>{cls.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{cls.description}</p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                Course: <strong>{cls.course_title}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {cls.status === 'Live' ? (
                <button className="btn btn-primary" style={{ width: '100%', background: 'var(--danger)', borderColor: 'var(--danger)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }} onClick={() => { setActiveClass(cls); setCurrentTab('classroom'); }}>
                  Join Live Lecture 🎥
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setActiveClass(cls); setCurrentTab('classroom'); }}>
                  Enter Lecture Room
                </button>
              )}
            </div>
          </div>
        ))}
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
                {activeClass.status === 'Live' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="video-waves">
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                    </div>
                    <p style={{ color: '#fff', fontWeight: '600', marginTop: '1rem', letterSpacing: '0.05em' }}>LIVE STREAM SIMULATOR BROADCASTING</p>
                    <span className="status-badge live" style={{ marginTop: '0.5rem' }}>LIVE AUDIO ACTIVE</span>
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
                <label>Video Stream Link</label>
                <input type="text" className="form-control" value={newClassMeetLink} onChange={(e) => setNewClassMeetLink(e.target.value)} required placeholder="e.g. https://meet.google.com/xyz-abcd" />
              </div>
              <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>Schedule Class</button>
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
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Admin Management Console</h2>
            <p>Approve referrals, manage colleges, and run direct database queries.</p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
          <button className={`btn ${adminSubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('overview')}>Overview Stats</button>
          <button className={`btn ${adminSubTab === 'admissions' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('admissions')}>Referral Queue</button>
          <button className={`btn ${adminSubTab === 'colleges' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setAdminSubTab('colleges')}>Manage Colleges</button>
          <button className={`btn ${adminSubTab === 'db_explorer' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderColor: 'var(--accent)', color: adminSubTab === 'db_explorer' ? '#fff' : 'var(--accent)' }} onClick={() => setAdminSubTab('db_explorer')}>Database Explorer 🗄️</button>
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

  // ----------------------------------------------------
  // Main SaaS layout
  // ----------------------------------------------------
  return (
    <div className="app-layout">
      {/* SaaS Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>EduConnect</span>
        </div>

        <nav className="sidebar-menu">
          <div className={`sidebar-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
            <IconHome /> Home
          </div>
          <div className={`sidebar-item ${currentTab === 'colleges' ? 'active' : ''}`} onClick={() => setCurrentTab('colleges')}>
            <IconColleges /> Colleges
          </div>
          
          {user && user.role === 'student' && (
            <>
              <div className={`sidebar-item ${currentTab === 'admissions' ? 'active' : ''}`} onClick={() => setCurrentTab('admissions')}>
                <IconAdmissions /> Referrals
              </div>
              <div className={`sidebar-item ${currentTab === 'marketplace' ? 'active' : ''}`} onClick={() => setCurrentTab('marketplace')}>
                <IconMarket /> Marketplace
              </div>
              <div className={`sidebar-item ${currentTab === 'classes' ? 'active' : ''}`} onClick={() => setCurrentTab('classes')}>
                <IconClass /> Virtual Class
              </div>
            </>
          )}

          {user && user.role === 'teacher' && (
            <div className={`sidebar-item ${currentTab === 'teacher' ? 'active' : ''}`} onClick={() => setCurrentTab('teacher')}>
              <IconClass /> Teacher Console
            </div>
          )}

          {user && user.role === 'admin' && (
            <div className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`} onClick={() => setCurrentTab('admin')}>
              <IconLedger /> Admin Panel
            </div>
          )}

          {user && (
            <div className={`sidebar-item ${currentTab === 'payments' ? 'active' : ''}`} onClick={() => setCurrentTab('payments')}>
              <IconLedger /> Wallet Ledger
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile-card">
              <div className="user-profile-details">
                <span className="user-profile-name">{user.name}</span>
                <span className="user-profile-email">{user.email}</span>
                <span className={`user-role-tag ${user.role}`} style={{ alignSelf: 'flex-start', marginTop: '0.35rem' }}>{user.role}</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.8rem', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none' }} onClick={handleLogout}>
                Logout
              </button>
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
        <header className="workspace-header">
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
          {currentTab === 'classroom' && renderClassroomSimulator()}
          {currentTab === 'teacher' && renderTeacherDashboard()}
          {currentTab === 'admin' && renderAdminPanel()}
          {currentTab === 'payments' && renderPayments()}
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

      {/* Toast Alert */}
      {toast && (
        <div className="toast" style={{ borderLeftColor: toast.type === 'danger' ? 'var(--danger)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
