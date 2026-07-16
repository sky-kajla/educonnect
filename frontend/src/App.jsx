import React, { useState, useEffect } from 'react';

export default function App() {
  // Authentication state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  
  // Dashboard & Navigation state
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'colleges', 'admissions', 'marketplace', 'teacher', 'admin', 'payments'
  
  // App data state
  const [colleges, setColleges] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [teachingCourses, setTeachingCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [myTeachingCourses, setMyTeachingCourses] = useState([]);
  const [teacherEnrollments, setTeacherEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  
  // Forms & Modal state
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

  // Credentials form state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('student'); // 'student' or 'teacher'

  // Notification state
  const [toast, setToast] = useState(null);

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
    if (user) {
      fetchAdmissions();
      fetchPayments();
      if (user.role === 'admin') {
        fetchAdminStats();
      }
      if (user.role === 'teacher') {
        fetchTeacherData();
      }
      if (user.role === 'student') {
        fetchStudentData();
      }
    }
  }, [user, currentTab]);

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
        // Reset form
        setAuthEmail('');
        setAuthPassword('');
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
        showToast(`Account created successfully! Welcome, ${data.user.name}.`);
        // Reset form
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
      } else {
        showToast(data.error || 'Registration failed', 'danger');
      }
    } catch (err) {
      showToast('Server connection error', 'danger');
    }
  };

  const handleLogout = () => {
    setToken('');
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
        showToast('Referral submitted successfully. Pending Admin approval.');
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
        showToast('Course published to marketplace successfully!');
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

  // ----------------------------------------------------
  // Navigation / SVGs
  // ----------------------------------------------------
  const IconLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );

  const IconWallet = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle', color: 'var(--success)'}}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <path d="M16 10H22V14H16V10Z" />
    </svg>
  );

  // ----------------------------------------------------
  // Component Render Functions
  // ----------------------------------------------------
  const renderLanding = () => (
    <div className="landing-hero">
      <div className="hero-tagline">Connect. Learn. Earn.</div>
      <p className="hero-description">
        EduConnect is the premium unified educational platform. Refer students to top colleges to earn generous commissions, or browse our peer-to-peer marketplace to learn advanced software skills from certified teachers.
      </p>
      
      {!user ? (
        <div className="hero-cta-buttons">
          <button className="btn btn-primary" onClick={() => { setCurrentTab('auth'); setAuthView('login'); }}>
            Get Started
          </button>
          <button className="btn btn-secondary" onClick={() => setCurrentTab('colleges')}>
            Explore Colleges
          </button>
        </div>
      ) : (
        <div className="hero-cta-buttons">
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setCurrentTab('admin')}>
              Go to Admin Console
            </button>
          )}
          {user.role === 'teacher' && (
            <button className="btn btn-primary" onClick={() => setCurrentTab('teacher')}>
              Go to Teacher Console
            </button>
          )}
          {user.role === 'student' && (
            <>
              <button className="btn btn-primary" onClick={() => setCurrentTab('colleges')}>
                Refer a Student
              </button>
              <button className="btn btn-accent" onClick={() => setCurrentTab('marketplace')}>
                Marketplace Courses
              </button>
            </>
          )}
        </div>
      )}

      {/* Highlights Grid */}
      <div className="grid-container" style={{ marginTop: '5rem', width: '100%' }}>
        <div className="card">
          <div className="card-subtitle" style={{color: 'var(--primary)'}}>For Referrers</div>
          <h3 className="card-title">Lucrative Commissions</h3>
          <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>
            Help students find matching educational programs. Earn up to $2,000 per verified student admission.
          </p>
        </div>
        <div className="card">
          <div className="card-subtitle" style={{color: 'var(--secondary)'}}>For Students</div>
          <h3 className="card-title">P2P Skill Courses</h3>
          <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>
            Enroll in hands-on developer courses taught by working industry professionals, using your local wallet.
          </p>
        </div>
        <div className="card">
          <div className="card-subtitle" style={{color: 'var(--accent)'}}>For Teachers</div>
          <h3 className="card-title">Monetize Knowledge</h3>
          <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>
            Publish and sell educational content. Monitor your students and withdraw earnings directly through your wallet.
          </p>
        </div>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="auth-container">
      <div className="auth-card">
        {authView === 'login' ? (
          <>
            <div className="auth-header">
              <h2>Welcome Back</h2>
              <p>Log in to access your dashboard</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  required 
                  placeholder="name@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  required
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Sign In
              </button>
            </form>
            <div className="auth-switch">
              Don't have an account? <span onClick={() => setAuthView('register')}>Register here</span>
            </div>
          </>
        ) : (
          <>
            <div className="auth-header">
              <h2>Create Account</h2>
              <p>Join the EduConnect ecosystem</p>
            </div>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={authName} 
                  onChange={(e) => setAuthName(e.target.value)} 
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>Account Role</label>
                <select 
                  className="form-control" 
                  value={authRole} 
                  onChange={(e) => setAuthRole(e.target.value)}
                >
                  <option value="student">Student / Referrer</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Create Account
              </button>
            </form>
            <div className="auth-switch">
              Already have an account? <span onClick={() => setAuthView('login')}>Sign in here</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderColleges = () => (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Partner Colleges & Programs</h2>
          <p>Browse educational institutions and referral commissions.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
        {colleges.map(col => (
          <div key={col.college_id} className="card" style={{ hover: 'none', transform: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{col.college_name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>📍 {col.location}</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Contact Admissions:</strong>
                <div>{col.contact}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Courses Offered</h4>
            {col.courses && col.courses.length > 0 ? (
              <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {col.courses.map(course => (
                  <div key={course.course_id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}>
                    <div>
                      <h5 style={{ fontSize: '1.1rem', color: '#fff' }}>{course.course_name}</h5>
                      <div style={{ marginTop: '0.5rem', color: 'var(--success)', fontWeight: '600' }}>
                        Commission: ${course.commission.toFixed(2)}
                      </div>
                    </div>
                    
                    {(!user || user.role === 'student') && (
                      <button 
                        className="btn btn-accent" 
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', width: '100%', fontSize: '0.85rem' }}
                        onClick={() => triggerReferralModal(col.college_id, course.course_id)}
                      >
                        Refer Student
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No courses currently available for this college.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdmissions = () => {
    // Referrers see their referred admissions here
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Your Referral Tracking</h2>
            <p>Monitor the status of students you referred and track commissions.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCurrentTab('colleges')}>
            New Referral +
          </button>
        </div>

        <div className="table-container">
          {admissions.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>College & Course</th>
                  <th>Status</th>
                  <th>Pending Commission</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map(adm => {
                  // Find course detail
                  const course = colleges.flatMap(c => c.courses || []).find(crs => crs.course_id === adm.course_id);
                  const college = colleges.find(c => (c.courses || []).some(crs => crs.course_id === adm.course_id));
                  
                  return (
                    <tr key={adm.admission_id}>
                      <td style={{ fontWeight: '600' }}>{adm.student_name}</td>
                      <td>
                        <div>{course ? course.course_name : 'Loading Course...'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {college ? college.college_name : 'Loading College...'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${adm.status.toLowerCase()}`}>
                          {adm.status}
                        </span>
                      </td>
                      <td style={{ color: adm.status === 'Approved' ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                        ${course ? course.commission.toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No admissions referred yet. Go to <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentTab('colleges')}>Colleges Page</span> to start referring!
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMarketplace = () => {
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>P2P Course Marketplace</h2>
            <p>Upgrade your skills. Purchase courses directly using your wallet balance.</p>
          </div>
        </div>

        {user && user.role === 'student' && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your Enrolled Courses</h3>
            {myEnrollments.length > 0 ? (
              <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {myEnrollments.map(enr => (
                  <div key={enr.enrollment_id} className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="card-subtitle" style={{ color: 'var(--success)' }}>✓ Enrolled & Active</div>
                    <h4 className="card-title">{enr.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Instructor: {enr.teacher_name}</p>
                    <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.85rem' }} onClick={() => showToast(`Opening course: "${enr.title}". Learning portal simulation active.`)}>
                      Enter Course Room
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>You have not enrolled in any developer courses yet.</p>
            )}
          </div>
        )}

        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Available Courses</h3>
        <div className="grid-container">
          {teachingCourses.map(course => {
            const isEnrolled = myEnrollments.some(e => e.course_id === course.course_id);
            return (
              <div key={course.course_id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="card-subtitle" style={{ color: 'var(--accent)' }}>Course Module</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>${course.price.toFixed(2)}</div>
                </div>
                <h3 className="card-title" style={{ marginTop: '0.5rem' }}>{course.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', minHeight: '60px', marginTop: '0.5rem' }}>
                  {course.description}
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Instructor: <strong>{course.teacher_name || 'Dr. Helen Carter'}</strong>
                </div>

                {isEnrolled ? (
                  <button className="btn btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} disabled>
                    Already Purchased
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '1.5rem', width: '100%' }}
                    onClick={() => handleBuyCourse(course.course_id)}
                  >
                    Buy Course
                  </button>
                )}
              </div>
            );
          })}
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
            <p>Upload educational material, track course sales, and view earnings.</p>
          </div>
        </div>

        <div className="grid-container" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
          {/* Left panel: Upload Course */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Publish New Course
            </h3>
            <form onSubmit={handleCreateTeachingCourse}>
              <div className="form-group">
                <label>Course Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCourseTitle} 
                  onChange={(e) => setNewCourseTitle(e.target.value)} 
                  placeholder="e.g. Master Clean Architecture in Go"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  value={newCourseDesc} 
                  onChange={(e) => setNewCourseDesc(e.target.value)} 
                  placeholder="Detailed course description..."
                  rows="4"
                  required
                  style={{ resize: 'none' }}
                />
              </div>
              <div className="form-group">
                <label>Price ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={newCoursePrice} 
                  onChange={(e) => setNewCoursePrice(e.target.value)} 
                  placeholder="49.99"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Publish Course
              </button>
            </form>
          </div>

          {/* Right panel: Uploaded Courses & Sales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Your Published Courses</h3>
              <div className="table-container" style={{ marginTop: '0', background: 'none', border: 'none' }}>
                {myTeachingCourses.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Course Title</th>
                        <th>Price</th>
                        <th>Students Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myTeachingCourses.map(course => {
                        const enrollmentCount = teacherEnrollments.filter(e => e.course_id === course.course_id).length;
                        return (
                          <tr key={course.course_id}>
                            <td style={{ fontWeight: '600' }}>{course.title}</td>
                            <td>${course.price.toFixed(2)}</td>
                            <td>{enrollmentCount} student(s)</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>You have not published any courses yet.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Course Sales</h3>
              <div className="table-container" style={{ marginTop: '0', background: 'none', border: 'none' }}>
                {teacherEnrollments.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Course Purchased</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherEnrollments.map(enr => (
                        <tr key={enr.enrollment_id}>
                          <td style={{ fontWeight: '600' }}>{enr.student_name}</td>
                          <td>{enr.course_title}</td>
                          <td style={{ color: 'var(--success)', fontWeight: '600' }}>+${enr.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No course sales recorded yet.</p>
                )}
              </div>
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
            <p>Verify referrals, manage colleges, and view platform metrics.</p>
          </div>
        </div>

        {/* Admin stats widgets */}
        {adminStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>TOTAL USERS</span>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{adminStats.totalUsers}</div>
            </div>
            <div className="stat-card">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PARTNER COLLEGES</span>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{adminStats.totalColleges}</div>
            </div>
            <div className="stat-card">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>TOTAL ADMISSIONS</span>
              <div className="stat-value" style={{ color: 'var(--secondary)' }}>{adminStats.totalAdmissions}</div>
            </div>
            <div className="stat-card">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>COMMISSION DISBURSED</span>
              <div className="stat-value" style={{ color: 'var(--success)' }}>${adminStats.totalCommissionPaid.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', alignItems: 'start' }}>
          {/* Admissions Verification Queue */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Referral Verification Queue</h3>
            <div className="table-container" style={{ marginTop: '0', background: 'none', border: 'none' }}>
              {admissions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>College & Course</th>
                      <th>Referrer Name</th>
                      <th>Commission</th>
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
                            <div>{course ? course.course_name : 'Loading Course...'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {college ? college.college_name : 'Loading College...'}
                            </div>
                          </td>
                          <td>{adm.referrer_name || 'Sarah Jenkins'}</td>
                          <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                            ${course ? course.commission.toFixed(2) : '0.00'}
                          </td>
                          <td>
                            {adm.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-accent" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleApproveReject(adm.admission_id, 'Approved')}>
                                  Approve
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleApproveReject(adm.admission_id, 'Rejected')}>
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`status-badge ${adm.status.toLowerCase()}`}>
                                {adm.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No student referrals currently pending.</p>
              )}
            </div>
          </div>

          {/* Add College Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Add Partner College
            </h3>
            <form onSubmit={handleAddCollege}>
              <div className="form-group">
                <label>College Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCollegeName} 
                  onChange={(e) => setNewCollegeName(e.target.value)} 
                  placeholder="e.g. Harvard University"
                  required
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCollegeLocation} 
                  onChange={(e) => setNewCollegeLocation(e.target.value)} 
                  placeholder="Cambridge, Massachusetts"
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={newCollegeContact} 
                  onChange={(e) => setNewCollegeContact(e.target.value)} 
                  placeholder="admissions@harvard.edu"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Add College
              </button>
            </form>
          </div>

          {/* Add Course Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Add College Program & Commission
            </h3>
            <form onSubmit={handleAddCourse}>
              <div className="form-group">
                <label>Select College</label>
                <select 
                  className="form-control" 
                  value={newCourseCollegeId} 
                  onChange={(e) => setNewCourseCollegeId(e.target.value)}
                  required
                >
                  <option value="">-- Choose College --</option>
                  {colleges.map(c => (
                    <option key={c.college_id} value={c.college_id}>{c.college_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Program / Course Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCourseName} 
                  onChange={(e) => setNewCourseName(e.target.value)} 
                  placeholder="e.g. Master of Business Administration"
                  required
                />
              </div>
              <div className="form-group">
                <label>Referral Commission ($ USD)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={newCourseCommission} 
                  onChange={(e) => setNewCourseCommission(e.target.value)} 
                  placeholder="1500"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Add Program
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Payment & Ledger Logs</h2>
            <p>Review all transactions and wallet balances details.</p>
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
              No payments logged in the system.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // Main Return Layout
  // ----------------------------------------------------
  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="navbar">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>
          <IconLogo />
          <span>EduConnect</span>
        </div>

        <nav className="nav-links">
          <span className={`nav-link ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>Home</span>
          <span className={`nav-link ${currentTab === 'colleges' ? 'active' : ''}`} onClick={() => setCurrentTab('colleges')}>Colleges</span>
          
          {user && user.role === 'student' && (
            <>
              <span className={`nav-link ${currentTab === 'admissions' ? 'active' : ''}`} onClick={() => setCurrentTab('admissions')}>Referrals</span>
              <span className={`nav-link ${currentTab === 'marketplace' ? 'active' : ''}`} onClick={() => setCurrentTab('marketplace')}>Marketplace</span>
            </>
          )}

          {user && user.role === 'teacher' && (
            <span className={`nav-link ${currentTab === 'teacher' ? 'active' : ''}`} onClick={() => setCurrentTab('teacher')}>Teacher Console</span>
          )}

          {user && user.role === 'admin' && (
            <span className={`nav-link ${currentTab === 'admin' ? 'active' : ''}`} onClick={() => setCurrentTab('admin')}>Admin Panel</span>
          )}

          {user && (
            <span className={`nav-link ${currentTab === 'payments' ? 'active' : ''}`} onClick={() => setCurrentTab('payments')}>Ledger</span>
          )}

          {!user ? (
            <button className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }} onClick={() => { setCurrentTab('auth'); setAuthView('login'); }}>
              Sign In
            </button>
          ) : (
            <div className="user-badge">
              <span>{user.name}</span>
              <span className={`user-role-tag ${user.role}`}>{user.role}</span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Wallet balance top header widget */}
      {user && (
        <div className="main-content" style={{ paddingBottom: '0' }}>
          <div className="wallet-widget">
            <div className="wallet-details">
              <h3>Available Account Balance</h3>
              <div className="wallet-balance">${user.wallet_balance.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => {
                const addAmount = 1000;
                fetch('/api/auth/me', {
                  method: 'POST', // Simulated Wallet Credit via profile balance modifier
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ amount: addAmount })
                }).then(() => {
                  showToast(`Test Sandbox Credit: +$${addAmount.toFixed(2)} added to wallet.`);
                  fetchUserProfile();
                });
              }}>
                + Mock Add Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toast && (
        <div className={`toast`} style={{ borderLeftColor: toast.type === 'danger' ? 'var(--danger)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Panel views */}
      <main className="main-content">
        {currentTab === 'home' && renderLanding()}
        {currentTab === 'auth' && renderAuth()}
        {currentTab === 'colleges' && renderColleges()}
        {currentTab === 'admissions' && renderAdmissions()}
        {currentTab === 'marketplace' && renderMarketplace()}
        {currentTab === 'teacher' && renderTeacherDashboard()}
        {currentTab === 'admin' && renderAdminPanel()}
        {currentTab === 'payments' && renderPayments()}
      </main>

      {/* Referral submission Modal Overlay */}
      {showReferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-close" onClick={() => setShowReferModal(false)}>×</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Submit Student Referral
            </h3>
            <form onSubmit={handleReferralSubmit}>
              <div className="form-group">
                <label>Student Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={referStudentName} 
                  onChange={(e) => setReferStudentName(e.target.value)} 
                  placeholder="e.g. Emily Watson"
                  required
                />
              </div>

              <div className="form-group">
                <label>Institution Program</label>
                <select 
                  className="form-control" 
                  value={referCourseId} 
                  onChange={(e) => setReferCourseId(e.target.value)}
                  required
                >
                  <option value="">-- Select Program --</option>
                  {colleges.map(c => (
                    <optgroup key={c.college_id} label={c.college_name}>
                      {c.courses && c.courses.map(crs => (
                        <option key={crs.course_id} value={crs.course_id}>
                          {crs.course_name} (Comm: ${crs.commission.toFixed(2)})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
                Submit Referral
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 EduConnect. Built as a premium React-Node sandbox ecosystem.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-dark)' }}>
          SQLite/JSON state persistence active. Ready for deployment and git version tracking.
        </p>
      </footer>
    </div>
  );
}
