const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('./db');
const whatsappBot = require('./whatsappBot');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'educonnect_super_secret_key_12345';

// Temporary store for password reset OTPs (email -> { otp, expires })
const otpStore = new Map();

// Configure nodemailer transporter using environment variables if provided
const sendOtpEmail = async (toEmail, otp) => {
  const emailUser = process.env.EMAIL_USER || '';
  const emailPass = process.env.EMAIL_PASS || '';

  if (!emailUser || !emailPass) {
    console.log("\n=========================================================");
    console.log("[MAIL FALLBACK - NO SMTP CREDENTIALS IN .env]");
    console.log(`To: ${toEmail}`);
    console.log("Subject: EduConnect Password Reset OTP Verification");
    console.log(`Your 6-digit verification code is: ${otp}`);
    console.log("(To receive real emails, set EMAIL_USER and EMAIL_PASS in your .env file)");
    console.log("=========================================================\n");
    return { sent: false, fallback: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"EduConnect" <${emailUser}>`,
      to: toEmail,
      subject: 'EduConnect Password Reset OTP Verification',
      text: `Your 6-digit verification OTP code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: sans-serif; padding: 2rem; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #6366f1; margin-bottom: 1rem;">EduConnect Verification</h2>
          <p>You requested a password reset. Use the following 6-digit verification code to complete the reset:</p>
          <div style="background: #f1f5f9; padding: 1rem; text-align: center; font-size: 1.8rem; font-weight: bold; letter-spacing: 0.25em; border-radius: 6px; margin: 1.5rem 0; color: #0f172a;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 0.85rem;">This code will expire in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[MAIL] Real email sent to ${toEmail}`);
    return { sent: true, fallback: false };
  } catch (error) {
    console.error(`[MAIL ERROR] Failed to send email via SMTP: ${error.message}`);
    // fallback to logging
    console.log("\n=========================================================");
    console.log("[MAIL FALLBACK - SMTP SEND FAILURE]");
    console.log(`To: ${toEmail}`);
    console.log("Subject: EduConnect Password Reset OTP Verification");
    console.log(`Your 6-digit verification code is: ${otp}`);
    console.log("=========================================================\n");
    return { sent: false, fallback: true, error: error.message };
  }
};


app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    const startingBalance = role === 'student' ? 5000.00 : 0.0;

    const result = await db.run(
      "INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, startingBalance]
    );

    const token = jwt.sign({ user_id: result.lastID, email, role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      token,
      user: { 
        user_id: result.lastID, 
        name, 
        email, 
        role, 
        wallet_balance: startingBalance,
        mobile: null,
        address: null,
        age: null,
        gender: null,
        username: null,
        profile_pic: null,
        avatar_shape: 'circle'
      }
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
        wallet_balance: user.wallet_balance,
        mobile: user.mobile,
        address: user.address,
        age: user.age,
        gender: user.gender,
        username: user.username,
        profile_pic: user.profile_pic,
        avatar_shape: user.avatar_shape || 'circle'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await db.get("SELECT * FROM Users WHERE email = ?", [email]);
    if (!user) {
      return res.status(400).json({ error: 'No user registered with this email address' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expires });

    const mailResult = await sendOtpEmail(email, otp);
    if (mailResult.sent) {
      res.json({ message: 'Verification OTP has been sent to your Gmail address!', otp });
    } else {
      res.json({ message: 'Verification OTP generated! Check your terminal console logs (fallback).', otp });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  // Master bypass code is '123456'
  if (otp !== '123456') {
    const record = otpStore.get(email.toLowerCase());
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await db.run("UPDATE Users SET password = ? WHERE email = ?", [hashedPassword, email]);
    if (otpStore.has(email.toLowerCase())) {
      otpStore.delete(email.toLowerCase());
    }

    res.json({ message: 'Password reset successful!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get("SELECT user_id, name, email, role, wallet_balance, mobile, address, age, gender, username, profile_pic, avatar_shape FROM Users WHERE user_id = ?", [req.user.user_id]);
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

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, email, mobile, address, age, gender, username, profile_pic, avatar_shape } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const existing = await db.get("SELECT * FROM Users WHERE email = ? AND user_id != ?", [email, req.user.user_id]);
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered to another account' });
    }

    if (username) {
      const existingUsername = await db.get("SELECT * FROM Users WHERE username = ? AND user_id != ?", [username, req.user.user_id]);
      if (existingUsername) {
        return res.status(400).json({ error: 'This username is already taken' });
      }
    }

    await db.run(
      "UPDATE Users SET name = ?, email = ?, mobile = ?, address = ?, age = ?, gender = ?, username = ?, profile_pic = ?, avatar_shape = ? WHERE user_id = ?",
      [
        name, 
        email, 
        mobile || null, 
        address || null, 
        age ? parseInt(age) : null, 
        gender || null, 
        username || null, 
        profile_pic || null, 
        avatar_shape || 'circle',
        req.user.user_id
      ]
    );
    const updatedUser = await db.get("SELECT user_id, name, email, role, wallet_balance, mobile, address, age, gender, username, profile_pic, avatar_shape FROM Users WHERE user_id = ?", [req.user.user_id]);
    
    res.json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const user = await db.get("SELECT * FROM Users WHERE user_id = ?", [req.user.user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPass = bcrypt.compareSync(currentPassword, user.password);
    if (!validPass) {
      return res.status(400).json({ error: 'Current password does not match' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await db.run("UPDATE Users SET password = ? WHERE user_id = ?", [hashedPassword, req.user.user_id]);
    res.json({ message: 'Password changed successfully!' });
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
  const { status } = req.body;
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

    if (status === 'Approved') {
      const course = await db.get("SELECT commission, course_name FROM Courses WHERE course_id = ?", [admission.course_id]);
      if (course && course.commission > 0) {
        await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [course.commission, admission.referrer_id]);

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
    const courses = await db.all(
      `SELECT tc.*, u.name as teacher_name, u.profile_pic as teacher_profile_pic,
              COALESCE(AVG(tr.rating), 5.0) as avg_rating,
              COUNT(tr.review_id) as review_count
       FROM TeachingCourses tc
       JOIN Users u ON tc.teacher_id = u.user_id
       LEFT JOIN TeacherReviews tr ON tc.teacher_id = tr.teacher_id
       GROUP BY tc.course_id`
    );
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Teacher Reviews & Rating System Routes
// ----------------------------------------------------
app.get('/api/reviews/teacher/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId);
  try {
    const reviews = await db.all(
      `SELECT tr.*, u.name as student_name, u.profile_pic as student_profile_pic, tc.title as course_title
       FROM TeacherReviews tr
       JOIN Users u ON tr.student_id = u.user_id
       LEFT JOIN TeachingCourses tc ON tr.course_id = tc.course_id
       WHERE tr.teacher_id = ?
       ORDER BY tr.review_id DESC`,
      [teacherId]
    );

    const stats = await db.get(
      "SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating FROM TeacherReviews WHERE teacher_id = ?",
      [teacherId]
    );

    res.json({
      reviews,
      total_reviews: stats ? stats.total_reviews : 0,
      avg_rating: stats && stats.avg_rating ? parseFloat(stats.avg_rating.toFixed(1)) : 5.0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/top-teachers', async (req, res) => {
  try {
    const topTeachers = await db.all(
      `SELECT u.user_id, u.name, u.email, u.profile_pic, u.avatar_shape,
              COALESCE(AVG(tr.rating), 5.0) as avg_rating,
              COUNT(tr.review_id) as review_count
       FROM Users u
       LEFT JOIN TeacherReviews tr ON u.user_id = tr.teacher_id
       WHERE u.role = 'teacher'
       GROUP BY u.user_id
       ORDER BY avg_rating DESC, review_count DESC`
    );
    res.json(topTeachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { teacher_id, course_id, rating, comment } = req.body;
  if (!teacher_id || !rating) {
    return res.status(400).json({ error: 'Teacher ID and Rating (1-5) are required' });
  }

  const ratingVal = parseInt(rating);
  if (ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.run(
      "INSERT INTO TeacherReviews (student_id, teacher_id, course_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.user_id, parseInt(teacher_id), course_id ? parseInt(course_id) : null, ratingVal, comment || '', today]
    );

    res.status(201).json({ review_id: result.lastID, message: 'Thank you for rating your instructor! ⭐' });
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

    const existing = await db.get(
      "SELECT * FROM Enrollments WHERE student_id = ? AND course_id = ?",
      [req.user.user_id, course_id]
    );
    if (existing) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    const student = await db.get("SELECT wallet_balance FROM Users WHERE user_id = ?", [req.user.user_id]);
    if (student.wallet_balance < course.price) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    await db.run("UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?", [course.price, req.user.user_id]);
    await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [course.price, course.teacher_id]);
    await db.run(
      "INSERT INTO Enrollments (student_id, course_id, payment_status) VALUES (?, ?, 'Paid')",
      [req.user.user_id, course_id]
    );

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
    const enrollments = await db.all("SELECT e.*, tc.title, tc.teacher_id FROM Enrollments e JOIN TeachingCourses tc ON e.course_id = tc.course_id WHERE e.student_id = ?", [req.user.user_id]);
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
// Online Classes APIs
// ----------------------------------------------------
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'admin') {
      classes = await db.all(
        `SELECT c.*, tc.title as course_title, u.name as teacher_name 
         FROM OnlineClasses c 
         JOIN TeachingCourses tc ON c.course_id = tc.course_id 
         JOIN Users u ON tc.teacher_id = u.user_id`
      );
    } else if (req.user.role === 'teacher') {
      classes = await db.all(
        `SELECT c.*, tc.title as course_title 
         FROM OnlineClasses c 
         JOIN TeachingCourses tc ON c.course_id = tc.course_id 
         WHERE tc.teacher_id = ?`,
        [req.user.user_id]
      );
    } else {
      // Students see classes for courses they are enrolled in
      classes = await db.all(
        `SELECT c.*, tc.title as course_title, u.name as teacher_name 
         FROM OnlineClasses c 
         JOIN TeachingCourses tc ON c.course_id = tc.course_id 
         JOIN Enrollments e ON tc.course_id = e.course_id 
         JOIN Users u ON tc.teacher_id = u.user_id 
         WHERE e.student_id = ?`,
        [req.user.user_id]
      );
    }
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', authenticateToken, requireTeacher, async (req, res) => {
  const { course_id, title, description, class_date, meet_link, thumbnail, lecture_type } = req.body;
  if (!course_id || !title || !description || !class_date || !meet_link) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    // Check if teacher owns the course
    const course = await db.get("SELECT * FROM TeachingCourses WHERE course_id = ? AND teacher_id = ?", [course_id, req.user.user_id]);
    if (!course) {
      return res.status(403).json({ error: 'You are not authorized to schedule classes for this course' });
    }

    const defaultThumb = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80';
    const type = lecture_type || 'video';
    const result = await db.run(
      "INSERT INTO OnlineClasses (course_id, title, description, class_date, meet_link, thumbnail, lecture_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')",
      [course_id, title, description, class_date, meet_link, thumbnail || defaultThumb, type]
    );

    res.status(201).json({ class_id: result.lastID, course_id, title, description, class_date, meet_link, thumbnail: thumbnail || defaultThumb, lecture_type: type, status: 'Scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/classes/:id', authenticateToken, requireTeacher, async (req, res) => {
  const { title, description, class_date, meet_link, thumbnail, lecture_type } = req.body;
  const classId = parseInt(req.params.id);

  try {
    const cls = await db.get("SELECT c.*, tc.teacher_id FROM OnlineClasses c JOIN TeachingCourses tc ON c.course_id = tc.course_id WHERE c.class_id = ?", [classId]);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (cls.teacher_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.run(
      "UPDATE OnlineClasses SET title = ?, description = ?, class_date = ?, meet_link = ?, thumbnail = ?, lecture_type = ? WHERE class_id = ?",
      [
        title || cls.title,
        description || cls.description,
        class_date || cls.class_date,
        meet_link || cls.meet_link,
        thumbnail || cls.thumbnail,
        lecture_type || cls.lecture_type || 'video',
        classId
      ]
    );

    res.json({ message: 'Class details updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Study Notes Marketplace APIs (Sell & Buy Notes)
// ----------------------------------------------------
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await db.all(
      `SELECT n.*, tc.title as course_title, u.name as teacher_name 
       FROM StudyNotes n 
       JOIN TeachingCourses tc ON n.course_id = tc.course_id 
       JOIN Users u ON n.teacher_id = u.user_id 
       ORDER BY n.note_id DESC`
    );

    const userPurchases = await db.all(
      "SELECT note_id FROM NotePurchases WHERE student_id = ?",
      [req.user.user_id]
    );
    const purchasedIds = new Set(userPurchases.map(p => p.note_id));

    const enrichedNotes = notes.map(n => ({
      ...n,
      is_owner: n.teacher_id === req.user.user_id || req.user.role === 'admin',
      purchased: n.price === 0 || n.teacher_id === req.user.user_id || req.user.role === 'admin' || purchasedIds.has(n.note_id)
    }));

    res.json(enrichedNotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', authenticateToken, requireTeacher, async (req, res) => {
  const { course_id, title, description, price, content, file_url } = req.body;
  if (!course_id || !title || !description) {
    return res.status(400).json({ error: 'Course, Title, and Description are required' });
  }

  try {
    const course = await db.get("SELECT * FROM TeachingCourses WHERE course_id = ? AND teacher_id = ?", [course_id, req.user.user_id]);
    if (!course) {
      return res.status(403).json({ error: 'You are not authorized to publish notes for this course' });
    }

    const today = new Date().toISOString().split('T')[0];
    const notePrice = parseFloat(price) || 0.0;
    const defaultFile = file_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    const result = await db.run(
      "INSERT INTO StudyNotes (teacher_id, course_id, title, description, price, content, file_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.user.user_id, course_id, title, description, notePrice, content || '', defaultFile, today]
    );

    res.status(201).json({ note_id: result.lastID, message: 'Study note published successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes/:id/purchase', authenticateToken, async (req, res) => {
  const noteId = parseInt(req.params.id);

  try {
    const note = await db.get("SELECT * FROM StudyNotes WHERE note_id = ?", [noteId]);
    if (!note) return res.status(404).json({ error: 'Study note not found' });

    if (note.teacher_id === req.user.user_id) {
      return res.status(400).json({ error: 'You cannot purchase your own published note' });
    }

    const existing = await db.get("SELECT * FROM NotePurchases WHERE student_id = ? AND note_id = ?", [req.user.user_id, noteId]);
    if (existing) {
      return res.status(400).json({ error: 'You have already purchased this study note' });
    }

    if (note.price > 0) {
      const student = await db.get("SELECT wallet_balance FROM Users WHERE user_id = ?", [req.user.user_id]);
      if (student.wallet_balance < note.price) {
        return res.status(400).json({ error: 'Insufficient wallet balance to purchase this study note' });
      }

      await db.run("UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?", [note.price, req.user.user_id]);
      await db.run("UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?", [note.price, note.teacher_id]);

      const today = new Date().toISOString().split('T')[0];
      await db.run(
        "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
        [req.user.user_id, -note.price, `Study Note Purchase: ${note.title}`, today]
      );
      await db.run(
        "INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)",
        [note.teacher_id, note.price, `Study Note Sale: ${note.title}`, today]
      );
    }

    const today = new Date().toISOString().split('T')[0];
    await db.run(
      "INSERT INTO NotePurchases (student_id, note_id, price, purchase_date) VALUES (?, ?, ?, ?)",
      [req.user.user_id, noteId, note.price, today]
    );

    res.json({ message: 'Study note unlocked successfully!', note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes/:id/status', authenticateToken, requireTeacher, async (req, res) => {
  const { status } = req.body; // 'Scheduled', 'Live', 'Completed'
  const classId = parseInt(req.params.id);

  if (!['Scheduled', 'Live', 'Completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const cls = await db.get(
      `SELECT c.* FROM OnlineClasses c 
       JOIN TeachingCourses tc ON c.course_id = tc.course_id 
       WHERE c.class_id = ? AND tc.teacher_id = ?`,
      [classId, req.user.user_id]
    );
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    await db.run("UPDATE OnlineClasses SET status = ? WHERE class_id = ?", [status, classId]);
    res.json({ message: `Class status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admin Database Explorer APIs
// ----------------------------------------------------
const TABLE_WHITELIST = ['users', 'colleges', 'courses', 'admissions', 'teachingcourses', 'enrollments', 'payments', 'onlineclasses', 'online_classes'];
const TABLE_PRIMARY_KEYS = {
  'users': 'user_id',
  'colleges': 'college_id',
  'courses': 'course_id',
  'admissions': 'admission_id',
  'teachingcourses': 'course_id',
  'teaching_courses': 'course_id',
  'enrollments': 'enrollment_id',
  'payments': 'payment_id',
  'onlineclasses': 'class_id',
  'online_classes': 'class_id'
};

app.get('/api/admin/db/tables', authenticateToken, requireAdmin, (req, res) => {
  res.json(TABLE_WHITELIST);
});

app.get('/api/admin/db/tables/:name', authenticateToken, requireAdmin, async (req, res) => {
  const tableName = req.params.name.toLowerCase();
  if (!TABLE_WHITELIST.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  
  // Safe since it's whitelisted
  const sql = `SELECT * FROM ${tableName}`;
  try {
    const rows = await db.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/db/tables/:name/:id', authenticateToken, requireAdmin, async (req, res) => {
  const tableName = req.params.name.toLowerCase();
  const id = req.params.id;

  if (!TABLE_WHITELIST.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const pkField = TABLE_PRIMARY_KEYS[tableName];
  if (!pkField) {
    return res.status(400).json({ error: 'Primary key mapping not found' });
  }

  try {
    const changes = await db.deleteRow(tableName, pkField, id);
    res.json({ message: `Successfully deleted ${changes} row(s).` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/db/query', authenticateToken, requireAdmin, async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL query statement is required' });

  try {
    const rows = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admin Email Settings APIs
// ----------------------------------------------------
app.get('/api/admin/email-settings', authenticateToken, requireAdmin, async (req, res) => {
  res.json({
    emailUser: process.env.EMAIL_USER || '',
    emailPassConfigured: !!process.env.EMAIL_PASS
  });
});

app.post('/api/admin/email-settings', authenticateToken, requireAdmin, async (req, res) => {
  const { emailUser, emailPass } = req.body;
  if (emailUser === undefined || emailPass === undefined) {
    return res.status(400).json({ error: 'emailUser and emailPass are required' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const ENV_PATH = path.join(__dirname, '..', '.env');
    
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }

    const lines = envContent.split('\n');
    let hasEmailUser = false;
    let hasEmailPass = false;

    const newLines = lines.map(line => {
      if (line.trim().startsWith('EMAIL_USER=')) {
        hasEmailUser = true;
        return `EMAIL_USER=${emailUser}`;
      }
      if (line.trim().startsWith('EMAIL_PASS=')) {
        hasEmailPass = true;
        return `EMAIL_PASS=${emailPass}`;
      }
      return line;
    });

    if (!hasEmailUser) newLines.push(`EMAIL_USER=${emailUser}`);
    if (!hasEmailPass) newLines.push(`EMAIL_PASS=${emailPass}`);

    fs.writeFileSync(ENV_PATH, newLines.join('\n').trim() + '\n', 'utf8');

    process.env.EMAIL_USER = emailUser;
    process.env.EMAIL_PASS = emailPass;

    res.json({ message: 'Email settings saved and activated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/email-settings/test', authenticateToken, requireAdmin, async (req, res) => {
  const emailUser = process.env.EMAIL_USER || '';
  const emailPass = process.env.EMAIL_PASS || '';

  if (!emailUser || !emailPass) {
    return res.status(400).json({ error: 'Please configure SMTP settings first.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"EduConnect" <${emailUser}>`,
      to: req.user.email,
      subject: 'EduConnect SMTP Test Connection',
      text: 'Congratulations! Your SMTP configuration is correct and EduConnect can now send real email notifications and OTP codes.'
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: `Test email sent successfully to ${req.user.email}!` });
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
// WhatsApp & AI Chatbot Endpoints
// ----------------------------------------------------

// On-Site AI Chatbot Widget Assistant Query
app.post('/api/chatbot/ask', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  const reply = whatsappBot.generateBotAnswer(message);
  res.json({ reply });
});

// WhatsApp Bot Config
app.get('/api/whatsapp/config', (req, res) => {
  res.json(whatsappBot.botConfig);
});

app.post('/api/whatsapp/config', authenticateToken, requireAdmin, (req, res) => {
  const { enabled, mode, delaySeconds, defaultGreeting, adminPhoneNumber, whatsappPhoneId, whatsappToken, webhookVerifyToken } = req.body;
  
  if (enabled !== undefined) whatsappBot.botConfig.enabled = Boolean(enabled);
  if (mode) whatsappBot.botConfig.mode = mode;
  if (delaySeconds !== undefined) whatsappBot.botConfig.delaySeconds = parseInt(delaySeconds);
  if (defaultGreeting !== undefined) whatsappBot.botConfig.defaultGreeting = defaultGreeting;
  if (adminPhoneNumber !== undefined) whatsappBot.botConfig.adminPhoneNumber = adminPhoneNumber;
  if (whatsappPhoneId !== undefined) whatsappBot.botConfig.whatsappPhoneId = whatsappPhoneId;
  if (whatsappToken !== undefined) whatsappBot.botConfig.whatsappToken = whatsappToken;
  if (webhookVerifyToken !== undefined) whatsappBot.botConfig.webhookVerifyToken = webhookVerifyToken;

  res.json({ message: 'WhatsApp Bot configuration updated successfully', config: whatsappBot.botConfig });
});

// WhatsApp Meta Cloud Webhook Verification (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === whatsappBot.botConfig.webhookVerifyToken) {
    console.log('[WhatsApp Webhook Verified Successfully]');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp Webhook Listener (POST)
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    let phoneNumber = '';
    let messageText = '';

    // Handle Meta Graph API payload
    if (req.body.object && req.body.entry) {
      const entry = req.body.entry[0];
      const changes = entry.changes && entry.changes[0];
      const value = changes && changes.value;
      const messageObj = value && value.messages && value.messages[0];

      if (messageObj && messageObj.text) {
        phoneNumber = messageObj.from;
        messageText = messageObj.text.body;
      }
    } else if (req.body.phoneNumber && req.body.message) {
      // Handle Simulation / Direct test payload
      phoneNumber = req.body.phoneNumber;
      messageText = req.body.message;
    }

    if (phoneNumber && messageText) {
      const today = new Date().toISOString();
      await db.run(
        "INSERT INTO WhatsAppChats (phone_number, sender, message, timestamp, status) VALUES (?, ?, ?, ?, ?)",
        [phoneNumber, 'user', messageText, today, 'pending_human']
      );

      // Trigger auto-reply engine (immediate or delayed)
      whatsappBot.handleIncomingMessage(db, { phone_number: phoneNumber, message: messageText });
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('[WhatsApp Webhook Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch WhatsApp Chat History Log
app.get('/api/whatsapp/chats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const chats = await db.all("SELECT * FROM WhatsAppChats ORDER BY timestamp DESC LIMIT 100");
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Human Admin Manual Reply via WhatsApp
app.post('/api/whatsapp/chats/reply', authenticateToken, requireAdmin, async (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'PhoneNumber and message are required' });
  }

  try {
    // Cancel pending automated bot timer if human admin replies first
    whatsappBot.cancelPendingBotReply(phoneNumber);

    // Send outgoing WhatsApp message
    const sendResult = await whatsappBot.sendWhatsAppMessage(phoneNumber, message);

    const today = new Date().toISOString();
    await db.run(
      "INSERT INTO WhatsAppChats (phone_number, sender, message, timestamp, status) VALUES (?, ?, ?, ?, ?)",
      [phoneNumber, 'human_admin', message, today, 'replied_by_human']
    );

    res.json({ message: 'Reply sent successfully to WhatsApp user', sendResult });
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
