const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'educonnect_super_secret_key_12345';

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

function requireTeacher(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher privileges required' });
  }
  next();
}

// ----------------------------------------------------
// Auth Routes
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existing = await db.get("SELECT * FROM Users WHERE email = ?", [email]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const startingBalance = role === 'student' ? 5000.00 : 0.0; // Gift starting balance for students to buy courses/refer

    const result = await db.run(
      "INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, startingBalance]
    );

    const token = jwt.sign({ user_id: result.lastID, email, role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      token,
      user: { user_id: result.lastID, name, email, role, wallet_balance: startingBalance }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.get("SELECT * FROM Users WHERE email = ?", [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallet_balance: user.wallet_balance
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get("SELECT user_id, name, email, role, wallet_balance FROM Users WHERE user_id = ?", [req.user.user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/me', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount is required and must be a number' });
  }
  try {
    await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [amount, req.user.user_id]);
    
    // Log the mock load transaction
    const today = new Date().toISOString().split('T')[0];
    await db.run(
      "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
      [req.user.user_id, amount, 'Sandbox Wallet Topup', today]
    );

    res.json({ message: 'Balance loaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------
// Colleges & Courses Routes
// ----------------------------------------------------
app.get('/api/colleges', async (req, res) => {
  try {
    const colleges = await db.all("SELECT * FROM Colleges");
    const courses = await db.all("SELECT * FROM Courses");

    // Nest courses in colleges
    const data = colleges.map(col => ({
      ...col,
      courses: courses.filter(crs => crs.college_id === col.college_id)
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/colleges', authenticateToken, requireAdmin, async (req, res) => {
  const { college_name, location, contact } = req.body;
  if (!college_name || !location || !contact) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const result = await db.run(
      "INSERT INTO Colleges (college_name, location, contact) VALUES (?, ?, ?)",
      [college_name, location, contact]
    );
    res.status(201).json({ college_id: result.lastID, college_name, location, contact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.all("SELECT * FROM Courses");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', authenticateToken, requireAdmin, async (req, res) => {
  const { college_id, course_name, commission } = req.body;
  if (!college_id || !course_name || commission === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const result = await db.run(
      "INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)",
      [college_id, course_name, parseFloat(commission)]
    );
    res.status(201).json({ course_id: result.lastID, college_id, course_name, commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admissions (Referrals) Routes
// ----------------------------------------------------
app.post('/api/admissions', authenticateToken, async (req, res) => {
  const { student_name, course_id } = req.body;
  if (!student_name || !course_id) {
    return res.status(400).json({ error: 'Student name and course selection are required' });
  }

  try {
    const result = await db.run(
      "INSERT INTO Admissions (student_name, course_id, referrer_id, status) VALUES (?, ?, ?, 'Pending')",
      [student_name, course_id, req.user.user_id]
    );
    res.status(201).json({ admission_id: result.lastID, student_name, course_id, referrer_id: req.user.user_id, status: 'Pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admissions', authenticateToken, async (req, res) => {
  try {
    let admissions;
    if (req.user.role === 'admin') {
      admissions = await db.all("SELECT * FROM Admissions");
    } else {
      admissions = await db.all("SELECT * FROM Admissions WHERE referrer_id = ?", [req.user.user_id]);
    }
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admissions/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body; // 'Approved' or 'Rejected'
  const admissionId = parseInt(req.params.id);

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const admission = await db.get("SELECT * FROM Admissions WHERE admission_id = ?", [admissionId]);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    if (admission.status !== 'Pending') {
      return res.status(400).json({ error: 'Admission status has already been set' });
    }

    await db.run("UPDATE Admissions SET status = ? WHERE admission_id = ?", [status, admissionId]);

    // If Approved, pay commission to referrer
    if (status === 'Approved') {
      // Find course to get commission amount
      const course = await db.get("SELECT commission, course_name FROM Courses WHERE course_id = ?", [admission.course_id]);
      if (course && course.commission > 0) {
        // Credit referrer wallet
        await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [course.commission, admission.referrer_id]);

        // Insert payment log
        const today = new Date().toISOString().split('T')[0];
        await db.run(
          "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
          [admission.referrer_id, course.commission, `Referral Commission (${admission.student_name} - ${course.course_name})`, today]
        );
      }
    }

    res.json({ message: `Admission ${status.toLowerCase()} successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Teaching Courses (Marketplace) Routes
// ----------------------------------------------------
app.get('/api/teaching-courses', async (req, res) => {
  try {
    const courses = await db.all("SELECT * FROM TeachingCourses");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teaching-courses/teacher', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const courses = await db.all("SELECT * FROM TeachingCourses WHERE teacher_id = ?", [req.user.user_id]);
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teaching-courses', authenticateToken, requireTeacher, async (req, res) => {
  const { title, description, price } = req.body;
  if (!title || !description || price === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await db.run(
      "INSERT INTO TeachingCourses (teacher_id, title, description, price) VALUES (?, ?, ?, ?)",
      [req.user.user_id, title, description, parseFloat(price)]
    );
    res.status(201).json({ course_id: result.lastID, teacher_id: req.user.user_id, title, description, price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Enrollments (Course Purchase) Routes
// ----------------------------------------------------
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'Course ID is required' });

  try {
    const course = await db.get("SELECT * FROM TeachingCourses WHERE course_id = ?", [course_id]);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Check if already enrolled
    const existing = await db.get(
      "SELECT * FROM Enrollments WHERE student_id = ? AND course_id = ?",
      [req.user.user_id, course_id]
    );
    if (existing) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    // Check student wallet balance
    const student = await db.get("SELECT wallet_balance FROM Users WHERE user_id = ?", [req.user.user_id]);
    if (student.wallet_balance < course.price) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Process Transaction:
    // 1. Deduct money from student
    await db.run("UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?", [course.price, req.user.user_id]);

    // 2. Add money to teacher
    await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [course.price, course.teacher_id]);

    // 3. Create Enrollment
    await db.run(
      "INSERT INTO Enrollments (student_id, course_id, payment_status) VALUES (?, ?, 'Paid')",
      [req.user.user_id, course_id]
    );

    // 4. Record Payments
    const today = new Date().toISOString().split('T')[0];
    await db.run(
      "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
      [req.user.user_id, -course.price, `Course Purchase: ${course.title}`, today]
    );
    await db.run(
      "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
      [course.teacher_id, course.price, `Course Sale: ${course.title}`, today]
    );

    res.status(201).json({ message: 'Enrolled and paid successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await db.all("SELECT * FROM Enrollments WHERE student_id = ?", [req.user.user_id]);
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/enrollments/teacher', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const enrollments = await db.all(
      `SELECT e.*, u.name as student_name, tc.title as course_title 
       FROM Enrollments e 
       JOIN TeachingCourses tc ON e.course_id = tc.course_id 
       JOIN Users u ON e.student_id = u.user_id 
       WHERE tc.teacher_id = ?`,
      [req.user.user_id]
    );
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Payments & Wallet Routes
// ----------------------------------------------------
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'admin') {
      payments = await db.all("SELECT * FROM Payments");
    } else {
      payments = await db.all("SELECT * FROM Payments WHERE user_id = ?", [req.user.user_id]);
    }
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admin Overview Dashboard Stats Route
// ----------------------------------------------------
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersCount = await db.get("SELECT COUNT(*) as count FROM Users");
    const collegesCount = await db.get("SELECT COUNT(*) as count FROM Colleges");
    const admissionsCount = await db.get("SELECT COUNT(*) as count FROM Admissions");
    const coursesCount = await db.get("SELECT COUNT(*) as count FROM TeachingCourses");

    const pendingAdmissions = await db.get("SELECT COUNT(*) as count FROM Admissions WHERE status = 'Pending'");
    const approvedAdmissions = await db.get("SELECT COUNT(*) as count FROM Admissions WHERE status = 'Approved'");

    const payments = await db.all("SELECT amount, type FROM Payments");

    let totalCommissionPaid = 0;
    let totalCourseSales = 0;

    payments.forEach(p => {
      if (p.type.startsWith('Referral Commission')) {
        totalCommissionPaid += p.amount;
      } else if (p.type.startsWith('Course Sale')) {
        totalCourseSales += p.amount;
      }
    });

    res.json({
      totalUsers: usersCount.count,
      totalColleges: collegesCount.count,
      totalAdmissions: admissionsCount.count,
      totalTeachingCourses: coursesCount.count,
      pendingAdmissions: pendingAdmissions.count,
      approvedAdmissions: approvedAdmissions.count,
      totalCommissionPaid: parseFloat(totalCommissionPaid.toFixed(2)),
      totalCourseSales: parseFloat(totalCourseSales.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Server Start
// ----------------------------------------------------
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
