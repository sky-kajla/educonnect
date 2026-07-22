const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables from .env file if it exists
const ENV_PATH = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_PATH)) {
  try {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.trim().split('=');
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
  } catch (e) {
    console.error('Error reading .env file:', e);
  }
}

const DB_TYPE = process.env.DB_TYPE || (process.env.DB_HOST ? 'mysql' : 'sqlite');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const JSON_DB_PATH = path.join(__dirname, 'database.json');

let mysqlPool = null;
let sqliteInstance = null;
let useJsonFallback = false;

// Attempt to load sqlite3 for SQLite mode
let sqlite3;
if (DB_TYPE === 'sqlite') {
  try {
    sqlite3 = require('sqlite3').verbose();
    console.log('SQLite3 module loaded successfully.');
  } catch (err) {
    console.warn('sqlite3 module could not be loaded. Falling back to JSON-based state database.');
    useJsonFallback = true;
  }
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
    payments: [],
    online_classes: []
  },
  load() {
    if (fs.existsSync(JSON_DB_PATH)) {
      try {
        const fileContent = fs.readFileSync(JSON_DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
        // Ensure new table is present
        if (!this.data.online_classes) {
          this.data.online_classes = [];
        }
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
// Database Controller Interface
// ----------------------------------------------------
const db = {
  init() {
    return new Promise(async (resolve, reject) => {
      if (DB_TYPE === 'mysql') {
        try {
          const mysql = require('mysql2/promise');
          console.log(`Connecting to MySQL database at ${process.env.DB_HOST || 'localhost'}...`);
          
          mysqlPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'educonnect',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
          });
          
          // Test connection
          await mysqlPool.query("SELECT 1");
          console.log('Connected to MySQL successfully.');
          
          await createMysqlTables();
          await seedData();
          await migrateColumns();
          resolve();
        } catch (err) {
          console.error('MySQL connection failed. Check your credentials in .env.', err);
          reject(err);
        }
      } else {
        // SQLite or JSON mode
        if (useJsonFallback) {
          jsonDb.load();
          await seedData();
          console.log('JSON Database initialized and seeded.');
          resolve();
        } else {
          sqliteInstance = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
              console.error('SQLite connection failed, switching to JSON fallback:', err);
              useJsonFallback = true;
              jsonDb.load();
              seedData().then(resolve).catch(reject);
            } else {
              console.log('Connected to SQLite database.');
              createSqliteTables()
                .then(() => seedData())
                .then(() => migrateColumns())
                .then(resolve)
                .catch(reject);
            }
          });
        }
      }
    });
  },

  // Runs a query that doesn't return rows (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    if (DB_TYPE === 'mysql') {
      const [result] = await mysqlPool.execute(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    }
    if (useJsonFallback) {
      return runJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      sqliteInstance.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Returns the first matching row
  async get(sql, params = []) {
    if (DB_TYPE === 'mysql') {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows[0] || null;
    }
    if (useJsonFallback) {
      return getJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      sqliteInstance.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Returns all matching rows
  async all(sql, params = []) {
    if (DB_TYPE === 'mysql') {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows;
    }
    if (useJsonFallback) {
      return allJson(sql, params);
    }
    return new Promise((resolve, reject) => {
      sqliteInstance.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Raw Query Runner (For Admin SQL Console)
  async query(sql) {
    if (DB_TYPE === 'mysql') {
      const [rows] = await mysqlPool.query(sql);
      return rows;
    }
    if (useJsonFallback) {
      throw new Error("Raw SQL query execution is not supported in local JSON fallback mode.");
    }
    return new Promise((resolve, reject) => {
      sqliteInstance.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Table rows delete helper (For Admin Database Explorer)
  async deleteRow(tableName, primaryKeyName, id) {
    // Basic SQL Injection protection for dynamic table/column names in admin actions
    const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const safeKey = primaryKeyName.replace(/[^a-zA-Z0-9_]/g, '');
    const sql = `DELETE FROM ${safeTable} WHERE ${safeKey} = ?`;

    if (DB_TYPE === 'mysql') {
      const [result] = await mysqlPool.execute(sql, [id]);
      return result.affectedRows;
    }
    if (useJsonFallback) {
      jsonDb.load();
      const listName = getJsonListName(tableName);
      if (listName && jsonDb.data[listName]) {
        const lengthBefore = jsonDb.data[listName].length;
        jsonDb.data[listName] = jsonDb.data[listName].filter(row => row[safeKey] !== parseInt(id) && row[safeKey] !== id);
        jsonDb.save();
        return lengthBefore - jsonDb.data[listName].length;
      }
      return 0;
    }
    return new Promise((resolve, reject) => {
      sqliteInstance.run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
};

// ----------------------------------------------------
// Table Schema Definitions
// ----------------------------------------------------
function createSqliteTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS Users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      wallet_balance REAL DEFAULT 0.0,
      mobile TEXT NULL,
      address TEXT NULL,
      age INTEGER NULL,
      gender TEXT NULL,
      username TEXT UNIQUE NULL,
      profile_pic TEXT NULL,
      avatar_shape TEXT NULL DEFAULT 'circle'
    )`,
    `CREATE TABLE IF NOT EXISTS Colleges (
      college_id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_name TEXT NOT NULL,
      location TEXT NOT NULL,
      contact TEXT NOT NULL,
      cover_image TEXT NULL,
      logo_image TEXT NULL
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
    )`,
    `CREATE TABLE IF NOT EXISTS OnlineClasses (
      class_id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      class_date TEXT NOT NULL,
      meet_link TEXT NOT NULL,
      thumbnail TEXT NULL,
      lecture_type TEXT DEFAULT 'video',
      status TEXT DEFAULT 'Scheduled',
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS StudyNotes (
      note_id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0.0,
      content TEXT,
      file_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS NotePurchases (
      purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      note_id INTEGER NOT NULL,
      price REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES StudyNotes(note_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS TeacherReviews (
      review_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      course_id INTEGER NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS WhatsAppChats (
      chat_id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT DEFAULT 'pending_human'
    )`,
    `CREATE TABLE IF NOT EXISTS WhatsAppConfig (
      config_key TEXT PRIMARY KEY,
      config_value TEXT NOT NULL
    )`
  ];

  return Promise.all(tables.map(sql => {
    return new Promise((resolve, reject) => {
      sqliteInstance.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }));
}

async function createMysqlTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS Users (
      user_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      wallet_balance DOUBLE DEFAULT 0.0,
      mobile VARCHAR(255) NULL,
      address TEXT NULL,
      age INT NULL,
      gender VARCHAR(255) NULL,
      username VARCHAR(255) UNIQUE NULL,
      profile_pic LONGTEXT NULL,
      avatar_shape VARCHAR(50) NULL DEFAULT 'circle'
    )`,
    `CREATE TABLE IF NOT EXISTS Colleges (
      college_id INT PRIMARY KEY AUTO_INCREMENT,
      college_name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      contact VARCHAR(255) NOT NULL,
      cover_image LONGTEXT NULL,
      logo_image LONGTEXT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Courses (
      course_id INT PRIMARY KEY AUTO_INCREMENT,
      college_id INT,
      course_name VARCHAR(255) NOT NULL,
      commission DOUBLE DEFAULT 0.0,
      FOREIGN KEY (college_id) REFERENCES Colleges(college_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Admissions (
      admission_id INT PRIMARY KEY AUTO_INCREMENT,
      student_name VARCHAR(255) NOT NULL,
      course_id INT,
      referrer_id INT,
      status VARCHAR(50) DEFAULT 'Pending',
      FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE,
      FOREIGN KEY (referrer_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS TeachingCourses (
      course_id INT PRIMARY KEY AUTO_INCREMENT,
      teacher_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DOUBLE DEFAULT 0.0,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Enrollments (
      enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT,
      course_id INT,
      payment_status VARCHAR(50) DEFAULT 'Pending',
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Payments (
      payment_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      amount DOUBLE NOT NULL,
      type VARCHAR(255) NOT NULL,
      date VARCHAR(50) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS OnlineClasses (
      class_id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      class_date VARCHAR(50) NOT NULL,
      meet_link VARCHAR(255) NOT NULL,
      thumbnail LONGTEXT NULL,
      lecture_type VARCHAR(50) DEFAULT 'video',
      status VARCHAR(50) DEFAULT 'Scheduled',
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS StudyNotes (
      note_id INT PRIMARY KEY AUTO_INCREMENT,
      teacher_id INT NOT NULL,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DOUBLE DEFAULT 0.0,
      content LONGTEXT,
      file_url TEXT,
      created_at VARCHAR(50) NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS NotePurchases (
      purchase_id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      note_id INT NOT NULL,
      price DOUBLE NOT NULL,
      purchase_date VARCHAR(50) NOT NULL,
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES StudyNotes(note_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS TeacherReviews (
      review_id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      teacher_id INT NOT NULL,
      course_id INT NULL,
      rating INT NOT NULL,
      comment TEXT,
      created_at VARCHAR(50) NOT NULL,
      FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES TeachingCourses(course_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS WhatsAppChats (
      chat_id INT PRIMARY KEY AUTO_INCREMENT,
      phone_number VARCHAR(255) NOT NULL,
      sender VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending_human'
    )`,
    `CREATE TABLE IF NOT EXISTS WhatsAppConfig (
      config_key VARCHAR(255) PRIMARY KEY,
      config_value TEXT NOT NULL
    )`
  ];

  for (const sql of tables) {
    await mysqlPool.query(sql);
  }
}

// ----------------------------------------------------
// Data Seeding (Shared Logic)
// ----------------------------------------------------
async function seedData() {
  if (useJsonFallback) {
    if (jsonDb.data.users.length > 0) return;
    console.log('Seeding JSON database...');
    seedJsonData();
    return;
  }

  const userCount = await db.get("SELECT COUNT(*) as count FROM Users");
  if (userCount && userCount.count > 0) return; // DB already seeded

  console.log(`Seeding database (Active DB: ${DB_TYPE})...`);
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const teacherPass = bcrypt.hashSync('teacher123', salt);
  const studentPass = bcrypt.hashSync('student123', salt);
  const referrerPass = bcrypt.hashSync('referrer123', salt);

  // Users
  await db.run("INSERT INTO Users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, ?, ?)", ['Platform Administrator', 'admin@educonnect.com', adminPass, 'admin', 0.0]);
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

  // Online Classes
  const today = new Date().toISOString().split('T')[0];
  await db.run("INSERT INTO OnlineClasses (course_id, title, description, class_date, meet_link, status) VALUES (?, ?, ?, ?, ?, ?)", [1, 'Lecture 1: Intro to React hooks', 'Getting started with useState and useEffect in Vite.', `${today} 18:00`, 'https://meet.google.com/abc-defg-hij', 'Scheduled']);
  await db.run("INSERT INTO OnlineClasses (course_id, title, description, class_date, meet_link, status) VALUES (?, ?, ?, ?, ?, ?)", [1, 'Lecture 2: Custom Hooks & State Management', 'Mastering context API and creating custom React hooks.', `${today} 20:00`, 'https://meet.google.com/qwe-rtyu-iop', 'Live']);
}

// ----------------------------------------------------
// JSON Fallback Seeding
// ----------------------------------------------------
function seedJsonData() {
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

  const today = new Date().toISOString().split('T')[0];
  jsonDb.data.online_classes = [
    { class_id: 1, course_id: 1, title: 'Lecture 1: Intro to React hooks', description: 'Getting started with useState and useEffect in Vite.', class_date: `${today} 18:00`, meet_link: 'https://meet.google.com/abc-defg-hij', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80', lecture_type: 'video', status: 'Scheduled' },
    { class_id: 2, course_id: 1, title: 'Lecture 2: Custom Hooks & State Management', description: 'Mastering context API and creating custom React hooks.', class_date: `${today} 20:00`, meet_link: 'https://zoom.us/j/9876543210', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', lecture_type: 'audio', status: 'Live' }
  ];

  jsonDb.data.study_notes = [
    { 
      note_id: 1, 
      teacher_id: 2, 
      course_id: 1, 
      title: 'Fullstack React & Node Architecture Handbook', 
      description: 'Comprehensive 45-page reference guide covering Express routing, SQLite migrations, JWT auth, and deployment workflows.', 
      price: 15.00, 
      content: '📘 FULLSTACK ARCHITECTURE HANDBOOK\n\nChapter 1: Express Server Initialization\nChapter 2: Relational DB Schemas\nChapter 3: State Management & Custom Hooks', 
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
      created_at: today 
    },
    { 
      note_id: 2, 
      teacher_id: 2, 
      course_id: 2, 
      title: 'Python Data Structures Cheat Sheet & Algorithms Notes', 
      description: 'Quick reference for Big-O notation, binary search trees, graph algorithms, and dynamic programming.', 
      price: 0.00, 
      content: '📙 DSA CHEAT SHEET\n\n- Arrays & Strings: O(1) Lookup\n- Binary Search: O(log N)\n- QuickSort: O(N log N)', 
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
      created_at: today 
    }
  ];

  jsonDb.data.note_purchases = [];

  jsonDb.data.teacher_reviews = [
    {
      review_id: 1,
      student_id: 3,
      teacher_id: 2,
      course_id: 1,
      rating: 5,
      comment: "Dr. Helen is an extraordinary instructor! Clear explanations on React state and database architecture.",
      created_at: today
    },
    {
      review_id: 2,
      student_id: 3,
      teacher_id: 2,
      course_id: 2,
      rating: 5,
      comment: "The algorithm cheat sheets provided by Dr. Helen saved me in my interviews. Highly recommended!",
      created_at: today
    }
  ];

  jsonDb.save();
}

// ----------------------------------------------------
// Helper mapping tables to JSON database keys
// ----------------------------------------------------
function getJsonListName(tableName) {
  const mapping = {
    'users': 'users',
    'colleges': 'colleges',
    'courses': 'courses',
    'admissions': 'admissions',
    'teachingcourses': 'teaching_courses',
    'teaching_courses': 'teaching_courses',
    'enrollments': 'enrollments',
    'payments': 'payments',
    'onlineclasses': 'online_classes',
    'online_classes': 'online_classes'
  };
  return mapping[tableName.toLowerCase()];
}

// ----------------------------------------------------
// JSON Query Emulator (Shared Local state helper)
// ----------------------------------------------------
function runJson(sql, params) {
  jsonDb.load();
  const sqlLower = sql.toLowerCase().trim();

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
      contact: params[2],
      cover_image: params[3] || null,
      logo_image: params[4] || null
    });
    jsonDb.save();
    return Promise.resolve({ lastID: college_id, changes: 1 });
  }

  if (sqlLower.startsWith('update colleges set')) {
    const collegeId = params[params.length - 1];
    const college = jsonDb.data.colleges.find(c => c.college_id === collegeId);
    if (college) {
      college.college_name = params[0];
      college.location = params[1];
      college.contact = params[2];
      college.cover_image = params[3] || null;
      college.logo_image = params[4] || null;
      jsonDb.save();
      return Promise.resolve({ changes: 1 });
    }
    return Promise.resolve({ changes: 0 });
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

  if (sqlLower.startsWith('insert into onlineclasses') || sqlLower.startsWith('insert into online_classes')) {
    const class_id = jsonDb.data.online_classes.length > 0 ? Math.max(...jsonDb.data.online_classes.map(c => c.class_id)) + 1 : 1;
    jsonDb.data.online_classes.push({
      class_id,
      course_id: params[0],
      title: params[1],
      description: params[2],
      class_date: params[3],
      meet_link: params[4],
      status: params[5] || 'Scheduled'
    });
    jsonDb.save();
    return Promise.resolve({ lastID: class_id, changes: 1 });
  }

  // Updates
  if (sqlLower.startsWith('update users set wallet_balance')) {
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

  if (sqlLower.startsWith('update onlineclasses set status') || sqlLower.startsWith('update online_classes set status')) {
    const status = params[0];
    const classId = params[1];
    const cls = jsonDb.data.online_classes.find(c => c.class_id === classId);
    if (cls) {
      cls.status = status;
      jsonDb.save();
      return Promise.resolve({ changes: 1 });
    }
    return Promise.resolve({ changes: 0 });
  }

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

  if (sqlLower.includes('from onlineclasses where class_id =') || sqlLower.includes('from online_classes where class_id =')) {
    const id = params[0];
    const cls = jsonDb.data.online_classes.find(c => c.class_id === id);
    return Promise.resolve(cls || null);
  }

  return Promise.resolve(null);
}

function allJson(sql, params) {
  jsonDb.load();
  const sqlLower = sql.toLowerCase().trim();

  // General Database Explorer queries
  if (sqlLower === 'select * from users') return Promise.resolve(jsonDb.data.users);
  if (sqlLower === 'select * from colleges') return Promise.resolve(jsonDb.data.colleges);
  if (sqlLower === 'select * from courses') return Promise.resolve(jsonDb.data.courses);
  if (sqlLower === 'select * from admissions') return Promise.resolve(jsonDb.data.admissions);
  if (sqlLower === 'select * from teachingcourses' || sqlLower === 'select * from teaching_courses') return Promise.resolve(jsonDb.data.teaching_courses);
  if (sqlLower === 'select * from enrollments') return Promise.resolve(jsonDb.data.enrollments);
  if (sqlLower === 'select * from payments') return Promise.resolve(jsonDb.data.payments);
  if (sqlLower === 'select * from onlineclasses' || sqlLower === 'select * from online_classes') return Promise.resolve(jsonDb.data.online_classes);

  if (sqlLower.includes('select * from users')) {
    return Promise.resolve(jsonDb.data.users);
  }

  if (sqlLower.includes('select * from colleges') || sqlLower.includes('from colleges')) {
    return Promise.resolve(jsonDb.data.colleges);
  }

  if (sqlLower.includes('select * from courses') || sqlLower.includes('from courses')) {
    if (params.length > 0) {
      const college_id = params[0];
      return Promise.resolve(jsonDb.data.courses.filter(c => c.college_id === college_id));
    }
    return Promise.resolve(jsonDb.data.courses);
  }

  if (sqlLower.includes('select * from admissions') || sqlLower.includes('from admissions')) {
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

  if (sqlLower.includes('from onlineclasses') || sqlLower.includes('from online_classes')) {
    const joinedClasses = jsonDb.data.online_classes.map(cls => {
      const tc = jsonDb.data.teaching_courses.find(c => c.course_id === cls.course_id) || {};
      return {
        ...cls,
        course_title: tc.title
      };
    });
    return Promise.resolve(joinedClasses);
  }

  return Promise.resolve([]);
}

async function migrateColumns() {
  if (useJsonFallback) return;
  try {
    if (DB_TYPE === 'mysql') {
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN mobile VARCHAR(255) NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN address TEXT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN age INT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN gender VARCHAR(255) NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN username VARCHAR(255) NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN profile_pic LONGTEXT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Users ADD COLUMN avatar_shape VARCHAR(50) NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Colleges ADD COLUMN cover_image LONGTEXT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE Colleges ADD COLUMN logo_image LONGTEXT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE OnlineClasses ADD COLUMN thumbnail LONGTEXT NULL"); } catch (e) {}
      try { await mysqlPool.query("ALTER TABLE OnlineClasses ADD COLUMN lecture_type VARCHAR(50) DEFAULT 'video'"); } catch (e) {}
      try { await mysqlPool.query("CREATE TABLE IF NOT EXISTS StudyNotes (note_id INT PRIMARY KEY AUTO_INCREMENT, teacher_id INT NOT NULL, course_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, price DOUBLE DEFAULT 0.0, content LONGTEXT, file_url TEXT, created_at VARCHAR(50) NOT NULL)"); } catch (e) {}
      try { await mysqlPool.query("CREATE TABLE IF NOT EXISTS NotePurchases (purchase_id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, note_id INT NOT NULL, price DOUBLE NOT NULL, purchase_date VARCHAR(50) NOT NULL)"); } catch (e) {}
      try { await mysqlPool.query("CREATE TABLE IF NOT EXISTS TeacherReviews (review_id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, teacher_id INT NOT NULL, course_id INT NULL, rating INT NOT NULL, comment TEXT, created_at VARCHAR(50) NOT NULL)"); } catch (e) {}
      try { await mysqlPool.query("CREATE TABLE IF NOT EXISTS WhatsAppChats (chat_id INT PRIMARY KEY AUTO_INCREMENT, phone_number VARCHAR(255) NOT NULL, sender VARCHAR(50) NOT NULL, message TEXT NOT NULL, timestamp VARCHAR(255) NOT NULL, status VARCHAR(50) DEFAULT 'pending_human')"); } catch (e) {}
      try { await mysqlPool.query("CREATE TABLE IF NOT EXISTS WhatsAppConfig (config_key VARCHAR(255) PRIMARY KEY, config_value TEXT NOT NULL)"); } catch (e) {}
    } else {
      // SQLite
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN mobile TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN address TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN age INTEGER NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN gender TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN username TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN profile_pic TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Users ADD COLUMN avatar_shape TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Colleges ADD COLUMN cover_image TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE Colleges ADD COLUMN logo_image TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE OnlineClasses ADD COLUMN thumbnail TEXT NULL", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("ALTER TABLE OnlineClasses ADD COLUMN lecture_type TEXT DEFAULT 'video'", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("CREATE TABLE IF NOT EXISTS StudyNotes (note_id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER NOT NULL, course_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, price REAL DEFAULT 0.0, content TEXT, file_url TEXT, created_at TEXT NOT NULL)", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("CREATE TABLE IF NOT EXISTS NotePurchases (purchase_id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, note_id INTEGER NOT NULL, price REAL NOT NULL, purchase_date TEXT NOT NULL)", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("CREATE TABLE IF NOT EXISTS TeacherReviews (review_id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, teacher_id INTEGER NOT NULL, course_id INTEGER NULL, rating INTEGER NOT NULL, comment TEXT, created_at TEXT NOT NULL)", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("CREATE TABLE IF NOT EXISTS WhatsAppChats (chat_id INTEGER PRIMARY KEY AUTOINCREMENT, phone_number TEXT NOT NULL, sender TEXT NOT NULL, message TEXT NOT NULL, timestamp TEXT NOT NULL, status TEXT DEFAULT 'pending_human')", () => resolve())); } catch (e) {}
      try { await new Promise((resolve) => sqliteInstance.run("CREATE TABLE IF NOT EXISTS WhatsAppConfig (config_key TEXT PRIMARY KEY, config_value TEXT NOT NULL)", () => resolve())); } catch (e) {}
    }
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

module.exports = db;
