const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const JSON_DB_PATH = path.join(__dirname, 'database.json');

let dbInstance = null;
let useJsonFallback = false;

// We will attempt to load sqlite3. If it fails (due to build errors on some Windows environments),
// we fall back to a JSON file database that mimics SQLite behavior.
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
  console.log('SQLite3 loaded successfully.');
} catch (err) {
  console.warn('sqlite3 could not be loaded. Falling back to JSON-based state database.');
  useJsonFallback = true;
}

// ----------------------------------------------------
// JSON Database Fallback Implementation
// ----------------------------------------------------
const jsonDb = {
  data: {
    users: [],
    colleges: [],
    courses: [],
    admissions: [],
    teaching_courses: [],
    enrollments: [],
    payments: []
  },
  load() {
    if (fs.existsSync(JSON_DB_PATH)) {
      try {
        const fileContent = fs.readFileSync(JSON_DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (e) {
        console.error('Error parsing database.json:', e);
      }
    } else {
      this.save();
    }
  },
  save() {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }
};

// ----------------------------------------------------
// DB Controller Interface
// ----------------------------------------------------
const db = {
  init() {
    return new Promise(async (resolve, reject) => {
      if (useJsonFallback) {
        jsonDb.load();
        await seedJsonData();
        console.log('JSON Database initialized and seeded.');
        resolve();
      } else {
        dbInstance = new sqlite3.Database(DB_PATH, (err) => {
          if (err) {
            console.error('Database connection failed, switching to JSON fallback:', err);
            useJsonFallback = true;
            jsonDb.load();
            seedJsonData().then(resolve).catch(reject);
          } else {
            console.log('Connected to SQLite database.');
            createSqliteTables()
              .then(() => seedSqliteData())
              .then(resolve)
              .catch(reject);
          }
        });
      }
    });
  },

  // Runs a query that doesn't return rows (INSERT, UPDATE, DELETE)
  run(sql, params = []) {
    if (useJsonFallback) {
      return runJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      dbInstance.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Returns the first matching row
  get(sql, params = []) {
    if (useJsonFallback) {
      return getJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      dbInstance.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Returns all matching rows
  all(sql, params = []) {
    if (useJsonFallback) {
      return allJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      dbInstance.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// ----------------------------------------------------
// SQLite Migrations & Seeding
// ----------------------------------------------------
function createSqliteTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS Users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      wallet_balance REAL DEFAULT 0.0
    )`,
    `CREATE TABLE IF NOT EXISTS Colleges (
      college_id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_name TEXT NOT NULL,
      location TEXT NOT NULL,
      contact TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Courses (
      course_id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER,
      course_name TEXT NOT NULL,
      commission REAL DEFAULT 0.0,
      FOREIGN KEY (college_id) REFERENCES Colleges(college_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Admissions (
      admission_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      course_id INTEGER,
      referrer_id INTEGER,
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE,
      FOREIGN KEY (referrer_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS TeachingCourses (
      course_id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0.0,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Enrollments (
      enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      payment_status TEXT DEFAULT 'Pending',
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`
  ];

  return Promise.all(tables.map(sql => {
    return new Promise((resolve, reject) => {
      dbInstance.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }));
}

async function seedSqliteData() {
  const userCount = await new Promise((resolve) => {
    dbInstance.get("SELECT COUNT(*) as count FROM Users", (err, row) => resolve(row ? row.count : 0));
  });

  if (userCount > 0) return; // DB already seeded

  console.log('Seeding SQLite database...');
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const teacherPass = bcrypt.hashSync('teacher123', salt);
  const studentPass = bcrypt.hashSync('student123', salt);
  const referrerPass = bcrypt.hashSync('referrer123', salt);

  // Users
  await db.run("INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)", ['Platform Administrator', 'admin@educonnect.com', adminPass, 'admin', 0]);
  await db.run("INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)", ['Dr. Helen Carter', 'teacher1@educonnect.com', teacherPass, 'teacher', 1800.00]);
  await db.run("INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)", ['Alex Green (Student)', 'student1@educonnect.com', studentPass, 'student', 8500.00]);
  await db.run("INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)", ['Sarah Jenkins (Referrer)', 'referrer1@educonnect.com', referrerPass, 'student', 1500.00]);

  // Colleges
  await db.run("INSERT INTO Colleges (college_name, location, contact) VALUES (?, ?, ?)", ['Stanford University', 'Stanford, California, USA', 'admissions@stanford.edu']);
  await db.run("INSERT INTO Colleges (college_name, location, contact) VALUES (?, ?, ?)", ['Massachusetts Institute of Technology (MIT)', 'Cambridge, Massachusetts, USA', 'admissions@mit.edu']);
  await db.run("INSERT INTO Colleges (college_name, location, contact) VALUES (?, ?, ?)", ['University of Oxford', 'Oxford, United Kingdom', 'admissions@ox.ac.uk']);

  // College Courses
  await db.run("INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)", [1, 'Computer Science & AI', 1200.00]);
  await db.run("INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)", [1, 'Bio-Engineering & Genetics', 1500.00]);
  await db.run("INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)", [2, 'Quantum Physics & Computing', 2000.00]);
  await db.run("INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)", [2, 'Aerospace Systems', 1800.00]);
  await db.run("INSERT INTO Courses (college_id, course_name, commission) VALUES (?, ?, ?)", [3, 'Philosophy, Politics & Economics (PPE)', 1000.00]);

  // Admissions
  await db.run("INSERT INTO Admissions (student_name, course_id, referrer_id, status) VALUES (?, ?, ?, ?)", ['Alice Miller', 1, 4, 'Approved']);
  await db.run("INSERT INTO Admissions (student_name, course_id, referrer_id, status) VALUES (?, ?, ?, ?)", ['Robert Chen', 3, 4, 'Pending']);

  // Teaching Courses (by Teacher/User 2)
  await db.run("INSERT INTO TeachingCourses (teacher_id, title, description, price) VALUES (?, ?, ?, ?)", [2, 'Complete Fullstack React & Node Guide', 'Learn Express, React, Vite, SQLite, and deployment workflows.', 99.99]);
  await db.run("INSERT INTO TeachingCourses (teacher_id, title, description, price) VALUES (?, ?, ?, ?)", [2, 'Data Structures & Algorithms in Python', 'Master big-O notation, trees, graphs, and sorting algorithms.', 49.99]);

  // Enrollments (User 3)
  await db.run("INSERT INTO Enrollments (student_id, course_id, payment_status) VALUES (?, ?, ?)", [3, 1, 'Paid']);

  // Payments
  await db.run("INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)", [4, 1500.00, 'Referral Commission', '2026-07-14']);
  await db.run("INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)", [2, 1800.00, 'Course Sale Earnings', '2026-07-15']);
  await db.run("INSERT INTO Payments (user_id, amount, type, date) VALUES (?, ?, ?, ?)", [3, -99.99, 'Course Purchase', '2026-07-15']);
}

// ----------------------------------------------------
// JSON Fallback Seeding
// ----------------------------------------------------
async function seedJsonData() {
  if (jsonDb.data.users.length > 0) return;

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const teacherPass = bcrypt.hashSync('teacher123', salt);
  const studentPass = bcrypt.hashSync('student123', salt);
  const referrerPass = bcrypt.hashSync('referrer123', salt);

  jsonDb.data.users = [
    { user_id: 1, name: 'Platform Administrator', email: 'admin@educonnect.com', password: adminPass, role: 'admin', wallet_balance: 0.0 },
    { user_id: 2, name: 'Dr. Helen Carter', email: 'teacher1@educonnect.com', password: teacherPass, role: 'teacher', wallet_balance: 1800.00 },
    { user_id: 3, name: 'Alex Green (Student)', email: 'student1@educonnect.com', password: studentPass, role: 'student', wallet_balance: 8500.00 },
    { user_id: 4, name: 'Sarah Jenkins (Referrer)', email: 'referrer1@educonnect.com', password: referrerPass, role: 'student', wallet_balance: 1500.00 }
  ];

  jsonDb.data.colleges = [
    { college_id: 1, college_name: 'Stanford University', location: 'Stanford, California, USA', contact: 'admissions@stanford.edu' },
    { college_id: 2, college_name: 'Massachusetts Institute of Technology (MIT)', location: 'Cambridge, Massachusetts, USA', contact: 'admissions@mit.edu' },
    { college_id: 3, college_name: 'University of Oxford', location: 'Oxford, United Kingdom', contact: 'admissions@ox.ac.uk' }
  ];

  jsonDb.data.courses = [
    { course_id: 1, college_id: 1, course_name: 'Computer Science & AI', commission: 1200.00 },
    { course_id: 2, college_id: 1, course_name: 'Bio-Engineering & Genetics', commission: 1500.00 },
    { course_id: 3, college_id: 2, course_name: 'Quantum Physics & Computing', commission: 2000.00 },
    { course_id: 4, college_id: 2, course_name: 'Aerospace Systems', commission: 1800.00 },
    { course_id: 5, college_id: 3, course_name: 'Philosophy, Politics & Economics (PPE)', commission: 1000.00 }
  ];

  jsonDb.data.admissions = [
    { admission_id: 1, student_name: 'Alice Miller', course_id: 1, referrer_id: 4, status: 'Approved' },
    { admission_id: 2, student_name: 'Robert Chen', course_id: 3, referrer_id: 4, status: 'Pending' }
  ];

  jsonDb.data.teaching_courses = [
    { course_id: 1, teacher_id: 2, title: 'Complete Fullstack React & Node Guide', description: 'Learn Express, React, Vite, SQLite, and deployment workflows.', price: 99.99 },
    { course_id: 2, teacher_id: 2, title: 'Data Structures & Algorithms in Python', description: 'Master big-O notation, trees, graphs, and sorting algorithms.', price: 49.99 }
  ];

  jsonDb.data.enrollments = [
    { enrollment_id: 1, student_id: 3, course_id: 1, payment_status: 'Paid' }
  ];

  jsonDb.data.payments = [
    { payment_id: 1, user_id: 4, amount: 1500.00, type: 'Referral Commission', date: '2026-07-14' },
    { payment_id: 2, user_id: 2, amount: 1800.00, type: 'Course Sale Earnings', date: '2026-07-15' },
    { payment_id: 3, user_id: 3, amount: -99.99, type: 'Course Purchase', date: '2026-07-15' }
  ];

  jsonDb.save();
}

// ----------------------------------------------------
// JSON Query Emulator (Simple implementation)
// ----------------------------------------------------
function runJson(sql, params) {
  jsonDb.load();
  const sqlLower = sql.toLowerCase().trim();

  // Simple Router to parse SQL statements
  if (sqlLower.startsWith('insert into users')) {
    const user_id = jsonDb.data.users.length > 0 ? Math.max(...jsonDb.data.users.map(u => u.user_id)) + 1 : 1;
    jsonDb.data.users.push({
      user_id,
      name: params[0],
      email: params[1],
      password: params[2],
      role: params[3],
      wallet_balance: params[4] || 0.0
    });
    jsonDb.save();
    return Promise.resolve({ lastID: user_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into admissions')) {
    const admission_id = jsonDb.data.admissions.length > 0 ? Math.max(...jsonDb.data.admissions.map(a => a.admission_id)) + 1 : 1;
    jsonDb.data.admissions.push({
      admission_id,
      student_name: params[0],
      course_id: params[1],
      referrer_id: params[2],
      status: params[3] || 'Pending'
    });
    jsonDb.save();
    return Promise.resolve({ lastID: admission_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into teachingcourses') || sqlLower.startsWith('insert into teaching_courses')) {
    const course_id = jsonDb.data.teaching_courses.length > 0 ? Math.max(...jsonDb.data.teaching_courses.map(t => t.course_id)) + 1 : 1;
    jsonDb.data.teaching_courses.push({
      course_id,
      teacher_id: params[0],
      title: params[1],
      description: params[2],
      price: params[3] || 0.0
    });
    jsonDb.save();
    return Promise.resolve({ lastID: course_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into enrollments')) {
    const enrollment_id = jsonDb.data.enrollments.length > 0 ? Math.max(...jsonDb.data.enrollments.map(e => e.enrollment_id)) + 1 : 1;
    jsonDb.data.enrollments.push({
      enrollment_id,
      student_id: params[0],
      course_id: params[1],
      payment_status: params[2] || 'Pending'
    });
    jsonDb.save();
    return Promise.resolve({ lastID: enrollment_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into payments')) {
    const payment_id = jsonDb.data.payments.length > 0 ? Math.max(...jsonDb.data.payments.map(p => p.payment_id)) + 1 : 1;
    jsonDb.data.payments.push({
      payment_id,
      user_id: params[0],
      amount: params[1],
      type: params[2],
      date: params[3]
    });
    jsonDb.save();
    return Promise.resolve({ lastID: payment_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into colleges')) {
    const college_id = jsonDb.data.colleges.length > 0 ? Math.max(...jsonDb.data.colleges.map(c => c.college_id)) + 1 : 1;
    jsonDb.data.colleges.push({
      college_id,
      college_name: params[0],
      location: params[1],
      contact: params[2]
    });
    jsonDb.save();
    return Promise.resolve({ lastID: college_id, changes: 1 });
  }

  if (sqlLower.startsWith('insert into courses')) {
    const course_id = jsonDb.data.courses.length > 0 ? Math.max(...jsonDb.data.courses.map(c => c.course_id)) + 1 : 1;
    jsonDb.data.courses.push({
      course_id,
      college_id: params[0],
      course_name: params[1],
      commission: params[2] || 0.0
    });
    jsonDb.save();
    return Promise.resolve({ lastID: course_id, changes: 1 });
  }

  // Updates
  if (sqlLower.startsWith('update users set wallet_balance')) {
    // pattern: UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?
    // or: UPDATE Users SET wallet_balance = ? WHERE user_id = ?
    const isAdditive = sqlLower.includes('wallet_balance +') || sqlLower.includes('wallet_balance+');
    const userIdIndex = params.length - 1;
    const userId = params[userIdIndex];
    const amount = params[0];

    const user = jsonDb.data.users.find(u => u.user_id === userId);
    if (user) {
      if (isAdditive) {
        user.wallet_balance = parseFloat((user.wallet_balance + amount).toFixed(2));
      } else {
        user.wallet_balance = parseFloat(amount.toFixed(2));
      }
      jsonDb.save();
      return Promise.resolve({ changes: 1 });
    }
    return Promise.resolve({ changes: 0 });
  }

  if (sqlLower.startsWith('update admissions set status')) {
    // UPDATE Admissions SET status = ? WHERE admission_id = ?
    const status = params[0];
    const admissionId = params[1];
    const admission = jsonDb.data.admissions.find(a => a.admission_id === admissionId);
    if (admission) {
      admission.status = status;
      jsonDb.save();
      return Promise.resolve({ changes: 1 });
    }
    return Promise.resolve({ changes: 0 });
  }

  console.warn(`Unmatched SQL write query in JSON mode: "${sql}"`);
  return Promise.resolve({ changes: 0 });
}

function getJson(sql, params) {
  jsonDb.load();
  const sqlLower = sql.toLowerCase().trim();

  if (sqlLower.includes('from users where email =')) {
    const email = params[0];
    const user = jsonDb.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return Promise.resolve(user || null);
  }

  if (sqlLower.includes('from users where user_id =')) {
    const id = params[0];
    const user = jsonDb.data.users.find(u => u.user_id === id);
    return Promise.resolve(user || null);
  }

  if (sqlLower.includes('count(*) as count from users')) {
    return Promise.resolve({ count: jsonDb.data.users.length });
  }

  if (sqlLower.includes('from admissions where admission_id =')) {
    const id = params[0];
    const adm = jsonDb.data.admissions.find(a => a.admission_id === id);
    return Promise.resolve(adm || null);
  }

  if (sqlLower.includes('from teachingcourses where course_id =') || sqlLower.includes('from teaching_courses where course_id =')) {
    const id = params[0];
    const course = jsonDb.data.teaching_courses.find(c => c.course_id === id);
    return Promise.resolve(course || null);
  }

  console.warn(`Unmatched SQL single-row read query in JSON mode: "${sql}"`);
  return Promise.resolve(null);
}

function allJson(sql, params) {
  jsonDb.load();
  const sqlLower = sql.toLowerCase().trim();

  if (sqlLower.includes('select * from users')) {
    return Promise.resolve(jsonDb.data.users);
  }

  if (sqlLower.includes('select * from colleges') || sqlLower.includes('from colleges')) {
    return Promise.resolve(jsonDb.data.colleges);
  }

  if (sqlLower.includes('select * from courses') || sqlLower.includes('from courses')) {
    // Select with filter or all
    if (params.length > 0) {
      // Typically SELECT * FROM Courses WHERE college_id = ?
      const college_id = params[0];
      return Promise.resolve(jsonDb.data.courses.filter(c => c.college_id === college_id));
    }
    return Promise.resolve(jsonDb.data.courses);
  }

  if (sqlLower.includes('select * from admissions') || sqlLower.includes('from admissions')) {
    // JOIN simulations can be parsed or we can return custom mapped object
    // For general listing, we want details of courses and colleges
    const joinedAdmissions = jsonDb.data.admissions.map(adm => {
      const course = jsonDb.data.courses.find(c => c.course_id === adm.course_id) || {};
      const college = jsonDb.data.colleges.find(c => c.college_id === course.college_id) || {};
      const referrer = jsonDb.data.users.find(u => u.user_id === adm.referrer_id) || {};
      return {
        ...adm,
        course_name: course.course_name,
        commission: course.commission,
        college_name: college.college_name,
        referrer_name: referrer.name
      };
    });

    if (sqlLower.includes('where referrer_id =')) {
      const refId = params[0];
      return Promise.resolve(joinedAdmissions.filter(a => a.referrer_id === refId));
    }
    return Promise.resolve(joinedAdmissions);
  }

  if (sqlLower.includes('select * from teachingcourses') || sqlLower.includes('from teachingcourses') || sqlLower.includes('from teaching_courses')) {
    const joinedTeaching = jsonDb.data.teaching_courses.map(tc => {
      const teacher = jsonDb.data.users.find(u => u.user_id === tc.teacher_id) || {};
      return {
        ...tc,
        teacher_name: teacher.name
      };
    });
    if (sqlLower.includes('where teacher_id =')) {
      const teacherId = params[0];
      return Promise.resolve(joinedTeaching.filter(t => t.teacher_id === teacherId));
    }
    return Promise.resolve(joinedTeaching);
  }

  if (sqlLower.includes('from enrollments')) {
    // SELECT e.*, c.title, c.price, u.name as teacher_name FROM Enrollments e ...
    const joinedEnrollments = jsonDb.data.enrollments.map(enr => {
      const course = jsonDb.data.teaching_courses.find(c => c.course_id === enr.course_id) || {};
      const student = jsonDb.data.users.find(u => u.user_id === enr.student_id) || {};
      const teacher = jsonDb.data.users.find(u => u.user_id === course.teacher_id) || {};
      return {
        ...enr,
        title: course.title,
        price: course.price,
        student_name: student.name,
        teacher_name: teacher.name
      };
    });

    if (sqlLower.includes('where student_id =')) {
      const studentId = params[0];
      return Promise.resolve(joinedEnrollments.filter(e => e.student_id === studentId));
    }
    return Promise.resolve(joinedEnrollments);
  }

  if (sqlLower.includes('from payments')) {
    if (sqlLower.includes('where user_id =')) {
      const userId = params[0];
      return Promise.resolve(jsonDb.data.payments.filter(p => p.user_id === userId));
    }
    const joinedPayments = jsonDb.data.payments.map(p => {
      const user = jsonDb.data.users.find(u => u.user_id === p.user_id) || {};
      return {
        ...p,
        user_name: user.name,
        user_email: user.email
      };
    });
    return Promise.resolve(joinedPayments);
  }

  console.warn(`Unmatched SQL multi-row read query in JSON mode: "${sql}"`);
  return Promise.resolve([]);
}

module.exports = db;
