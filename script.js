// ── DATA ──────────────────────────────────────────────────────────────────────
// Admin/Teacher accounts are now authenticated via Firebase Auth (see STATIC_EMAIL_MAP below)
let currentUser = null;
window.STUDENTS = [];
window.TEACHERS = [];

const SUBJECTS = [
  'Data Structures and Algorithms',
  'Object Oriented Programming',
  'IT Workshop',
  'Computer Organization and Architecture',
  'Probability and Statistics',
  'Essence of Indian Traditional Knowledge',
  'Organizational Behaviour',
];

// Lab subjects — inke liye group-wise attendance lagegi
const LAB_SUBJECTS = [
  'Data Structures and Algorithms Lab',
  'Object Oriented Programming Lab',
  'IT Workshop Lab'
];

window.ATTENDANCE = []; // har record: {subject, date, rollNo, status, markedBy};

window.COMPLAINTS = [];

window.NOTIFICATIONS = [];

const TIMETABLE = {
  '9:00': ['Computer Organization and Architecture', 'Computer Organization and Architecture', 'Object Oriented Programming', 'IT (GF-2)', 'Data Structures and Algorithms'],
  '10:00': ['Essence of Indian Traditional Knowledge (GF-1)', 'Object Oriented Programming', 'IT (GF-2)', 'Data Structures and Algorithms', 'Computer Organization and Architecture'],
  '11:00': ['Data Structures and Algorithms', 'Probability and Statistics', 'Probability and Statistics', 'Object Oriented Programming', 'Object Oriented Programming'],
  '12:00': ['Probability and Statistics', 'Data Structures and Algorithms', 'Object Oriented Programming', 'Organizational Behaviour', 'Organizational Behaviour'],
  '1:00': ['LUNCH', 'LUNCH', 'LUNCH', 'LUNCH', 'LUNCH'],
  '2:00': ['IT (GF-2)', 'Essence of Indian Traditional Knowledge (GF-1)', 'Data Structures and Algorithms Lab', 'IT Workshop Lab', 'Object Oriented Programming Lab'],
  '3:00': ['', '', 'Data Structures and Algorithms Lab', 'IT Workshop Lab', 'Object Oriented Programming Lab'],
  '4:00': ['', '', 'Data Structures and Algorithms Lab', '', 'Object Oriented Programming Lab'],
};
const TIMETABLE_B = {
  '9:00': ['', '', 'IT (GF-2)', '', ''],
  '10:00': ['Object Oriented Programming', 'Data Structures and Algorithms', 'Data Structures and Algorithms', 'Essence of Indian Traditional Knowledge (GF-2)', 'IT (GF-2)'],
  '11:00': ['Probability and Statistics', 'Organizational Behaviour(GF-5)', 'Computer Organization and Architecture', 'Organizational Behaviour(GF-5)', 'Probability and Statistics'],
  '12:00': ['IT (GF-2)', 'Object Oriented Programming', 'Essence of Indian Traditional Knowledge (GF-2)', 'Data Structures and Algorithms', 'Data Structures and Algorithms'],
  '1:00': ['LUNCH', 'LUNCH', 'LUNCH', 'LUNCH', 'LUNCH'],
  '2:00': ['DSA Lab (G-1)', 'IT LAB (G-1)', 'OOP Lab (G-1)', 'Computer Organization and Architecture', 'Computer Organization and Architecture'],
  '3:00': ['DSA Lab (G-1)', 'IT Lab (G-1)', 'OOP Lab (G-1)', 'Probability and Statistics', 'Organizational Behaviour(GF-5)'],
  '4:00': ['DSA Lab (G-1)', '', 'OOP Lab (G-1)', 'Object Oriented Programming', 'Object Oriented Programming'],
};

window.cancelledClasses = {}; // Firestore se loadCancelledClasses()

// ── SECTION HELPER ────────────────────────────────────────────────────────────
function getStudentSection(roll) {
  const r = Number(roll);
  if (r >= 2025306001 && r <= 2025306050) return 'A';
  if (r >= 2025306051 && r <= 2025306101) return 'B';
  return 'A'; // default
}

//Group Helper
function getStudentGroup(roll) {
  const r = Number(roll);
  if (r >= 2025306001 && r <= 2025306025) return 'A1'; // Sec A, Group 1
  if (r >= 2025306026 && r <= 2025306050) return 'A2'; // Sec A, Group 2
  if (r >= 2025306051 && r <= 2025306075) return 'B1'; // Sec B, Group 1
  if (r >= 2025306076 && r <= 2025306101) return 'B2'; // Sec B, Group 2
  return 'A1'; // default
}

let todayAttendanceDraft = {}; // sirf UI ke liye, save hone tak temp store

// ── ATTENDANCE HELPERS ────────────────────────────────────────────────────────

function getAttendanceStats(rollNo, subject) {
  const records = window.ATTENDANCE.filter(a =>
    String(a.rollNo) === String(rollNo) &&
    (subject ? a.subject === subject : true)
  );
  const present = records.filter(a => a.status === 'p').length;
  const absent = records.filter(a => a.status === 'a').length;
  const total = present + absent;
  const pct = total === 0 ? 100 : Math.round((present / total) * 100);
  return { present, absent, total, pct };
}

function getOverallAttendance(rollNo) {
  const pcts = SUBJECTS.map(s => getAttendanceStats(rollNo, s).pct);
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getTodayDayIndex() {
  // JS: Sun=0, Mon=1... Sat=6. Apna DAYS array Mon-Fri (0-4) hai.
  const jsDay = new Date().getDay();
  return jsDay === 0 || jsDay === 6 ? -1 : jsDay - 1; // weekend pe -1 (koi class nahi)
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TODAY_DAY = getTodayDayIndex(); // -1 on weekends, 0-4 Mon-Fri

// ── NAV CONFIG ────────────────────────────────────────────────────────────────

const NAV = {
  admin: [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { section: 'Manage' },
    { id: 'students', label: 'Students', icon: 'users' },
    { id: 'teachers', label: 'Teachers', icon: 'user' },
    { id: 'attendance', label: 'Attendance', icon: 'check' },
    { id: 'att-register', label: 'Attendance Register', icon: 'book' },
    { id: 'timetable', label: 'Timetable', icon: 'calendar' },
    { id: 'cancel', label: 'Cancel Classes', icon: 'x-circle' },
    { id: 'complaints', label: 'Complaints', icon: 'message' },
    { id: 'pyq', label: 'PYQ Papers', icon: 'book' },
  ],
  teacher: [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { section: 'Classes' },
    { id: 'attendance', label: 'Mark Attendance', icon: 'check' },
    { id: 'att-register', label: 'Attendance Register', icon: 'book' },
    { id: 'timetable', label: 'Timetable', icon: 'calendar' },
    { id: 'cancel', label: 'Cancel a Class', icon: 'x-circle' },
    { section: 'Students' },
    { id: 'students', label: 'My Students', icon: 'users' },
    { id: 'complaints', label: 'Complaints', icon: 'message' },
    { id: 'pyq', label: 'PYQ Papers', icon: 'book' },
  ],
  student: [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { section: 'Academics' },
    { id: 'timetable', label: 'My Timetable', icon: 'calendar' },
    { id: 'attendance', label: 'My Attendance', icon: 'check' },
    { section: 'Support' },
    { id: 'complaints', label: 'My Complaints', icon: 'message' },
    { id: 'profile', label: 'My Profile', icon: 'user' },
    { id: 'pyq', label: 'PYQ Papers', icon: 'book' },
    { id: 'students', label: 'Students', icon: 'users' },
    // { id:'addstudent', label:'Add Student', icon:'users' },
  ],
};

function icon(name) {
  const icons = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'x-circle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    message: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    megaphone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  };
  return icons[name] || '';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

// Static admin/teacher accounts now map roll -> placeholder email (real password lives in Firebase Auth)
const STATIC_EMAIL_MAP = {
  '13141516': 'admin@campusconnect.local',
  '123456789': 'divya.teacher@campusconnect.local',
};

// Eye icon toggle — password field show/hide on login screen
function togglePasswordVisibility() {
  const input = document.getElementById('login-pass');
  const icon = document.getElementById('pass-eye-icon');
  const btn = document.getElementById('pass-toggle-btn');
  if (!input || !icon) return;

  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';

  icon.innerHTML = showing
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />'
    : '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />';

  if (btn) btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}
window.togglePasswordVisibility = togglePasswordVisibility;

async function login() {
  const rollInput = document.getElementById('login-rollno.').value.trim();
  const passInput = document.getElementById('login-pass').value.trim();
  const errorDiv = document.getElementById('login-error');

  if (!rollInput || !passInput) {
    errorDiv.textContent = "Please fill in all fields.";
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';

  // 1. Resolve roll number -> email.
  // IMPORTANT: this no longer reads the full Students collection before login.
  // Admin/teacher (fixed accounts) use STATIC_EMAIL_MAP; everyone else is
  // resolved via a single-document lookup in the public "RollIndex" collection
  // (roll -> email only), so nobody's full data is exposed before they log in.
  let emailToUse = null;

  if (STATIC_EMAIL_MAP[rollInput]) {
    emailToUse = STATIC_EMAIL_MAP[rollInput];
  } else {
    emailToUse = await window.lookupEmailByRoll(rollInput);
  }

  if (!emailToUse) {
    errorDiv.textContent = "Invalid roll number or password. Try again.";
    errorDiv.style.display = 'block';
    return;
  }

  // 2. Authenticate with Firebase Auth
  window.signInWithEmailAndPassword(window.firebaseAuth, emailToUse, passInput)
    .then(async (userCredential) => {
      const uid = userCredential.user.uid;

      if (rollInput === '13141516') {
        currentUser = { email: rollInput, uid, role: 'admin', name: 'Team Project', initials: 'TP', color: '#5b21b6' };
        loginSuccess();
        return;
      }

      // Now that we're authenticated, it's safe to load the real
      // Teachers/Students profile collections and figure out the role.
      await Promise.all([window.loadTeachers(), window.loadStudents()]);

      // One-time backward-compat fallback for the original hardcoded
      // teacher account, in case she hasn't been migrated into the
      // Teachers collection yet (see migration note in setup docs).
      if (rollInput === '123456789' && !window.TEACHERS.find(t => String(t.roll) === rollInput)) {
        currentUser = { email: rollInput, uid, role: 'teacher', name: 'Miss Divya', initials: 'MD', color: '#9d174d' };
        loginSuccess();
        return;
      }

      const dbTeacher = window.TEACHERS.find(t => String(t.roll) === rollInput);
      if (dbTeacher) {
        currentUser = {
          email: rollInput,
          uid,
          role: 'teacher',
          name: dbTeacher.name,
          initials: dbTeacher.avatar || dbTeacher.name.split(" ").map(x => x[0]).join("").toUpperCase(),
          color: dbTeacher.color || '#d73840',
          subject: dbTeacher.subject || '',
          section: dbTeacher.section || ''
        };
        loginSuccess();
        return;
      }

      const dbStudent = window.STUDENTS.find(student => String(student.roll) === rollInput);
      if (dbStudent) {
        currentUser = {
          email: rollInput,
          uid,
          role: 'student',
          name: dbStudent.name,
          initials: dbStudent.avatar || dbStudent.name.split(" ").map(x => x[0]).join("").toUpperCase(),
          color: dbStudent.color || '#3b5bdb'
        };
        loginSuccess();
        return;
      }

      // Auth succeeded but there's no matching profile record — shouldn't normally happen, but fail safe instead of leaving a half-logged-in state.
      window.signOut(window.firebaseAuth);
      errorDiv.textContent = "Account found but no profile record exists. Contact admin.";
      errorDiv.style.display = 'block';
    })
    .catch((error) => {
      console.error('Login error:', error.code, error.message);
      errorDiv.textContent = "Invalid roll number or password. Try again.";
      errorDiv.style.display = 'block';
    });
}

// ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
async function forgotPassword() {
  const errorDiv = document.getElementById('login-error');
  const infoDiv = document.getElementById('login-info');
  errorDiv.style.display = 'none';
  infoDiv.style.display = 'none';

  const rollInput = document.getElementById('login-rollno.').value.trim();

  if (!rollInput) {
    errorDiv.textContent = "Pehle apna roll no. daalein, phir Forgot password par click karein.";
    errorDiv.style.display = 'block';
    return;
  }

  // Same roll -> email resolution used in login(): static accounts first,
  // then a single-doc lookup in the public RollIndex collection.
  let emailToUse = null;
  if (STATIC_EMAIL_MAP[rollInput]) {
    emailToUse = STATIC_EMAIL_MAP[rollInput];
  } else {
    emailToUse = await window.lookupEmailByRoll(rollInput);
  }

  if (!emailToUse) {
    errorDiv.textContent = "Ye roll no. registered nahi hai.";
    errorDiv.style.display = 'block';
    return;
  }

  try {
    await window.sendPasswordResetEmail(window.firebaseAuth, emailToUse);
    infoDiv.textContent = "Password reset link bhej diya gaya hai aapki registered email par. Inbox (aur spam) check karein.";
    infoDiv.style.display = 'block';
  } catch (error) {
    console.error('Forgot password error:', error.code, error.message);
    errorDiv.textContent = "Reset email bhejne me error aaya. Thodi der baad try karein.";
    errorDiv.style.display = 'block';
  }
}
window.forgotPassword = forgotPassword;

function loginSuccess() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  document.getElementById('top-avatar').textContent = currentUser.initials;
  document.getElementById('top-avatar').style.background = currentUser.color;
  document.getElementById('top-name').textContent = currentUser.name;
  document.getElementById('top-role').textContent = currentUser.role.toUpperCase();

  localStorage.setItem('currentUser', JSON.stringify(currentUser));// 🟢 SESSIONS SAVE KARNE KE LIYE

  buildSidebar();
  navigate('dashboard');
}

function doLogout() {
  currentUser = null;

  localStorage.removeItem('currentUser'); // 🟢 SESSION CLEAR KARNE KE LIYE

  if (window.firebaseAuth && window.signOut) {
    window.signOut(window.firebaseAuth).catch(err => console.error('Sign out error:', err));
  }

  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-error').style.display = 'none';
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────

let currentPage = 'dashboard';

function buildSidebar() {
  const nav = NAV[currentUser.role];
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = nav.map(item => {
    if (item.section) return `<div class="sidebar-section">${item.section}</div>`;
    const badge = item.id === 'notifications' ? `<span class="nav-badge" id="nav-notif-badge">${NOTIFICATIONS.filter(n => !n.read).length}</span>` :
      item.id === 'complaints' && currentUser.role !== 'student' ? `<span class="nav-badge" id="nav-complaint-badge">${COMPLAINTS.filter(c => c.status === 'pending').length}</span>` : '';
    return `<button class="nav-item" id="nav-${item.id}" onclick="navigate('${item.id}')">${icon(item.icon)}<span>${item.label}</span>${badge}</button>`;
  }).join('');
}

function updateNotifBadge() {
  const count = (window.NOTIFICATIONS || []).filter(n => !n.read).length;
  const el = document.getElementById('notif-count');
  if (el) el.textContent = count;
}
window.updateNotifBadge = updateNotifBadge;

function navigate(page) {
  currentPage = page;
  updateNotifBadge();   // for notification badge
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', notifications: 'Notifications', students: 'Students',
    teachers: 'Teachers',
    attendance: currentUser?.role === 'student' ? 'My Attendance' : 'Attendance',
    'att-register': 'Attendance Register',
    timetable: 'Timetable', cancel: 'Cancel Classes', complaints: 'Complaints',
    announce: 'Announcements', profile: 'My Profile',
    pyq: 'PYQ Papers',
  };
  document.getElementById('topbar-page').textContent = titles[page] || '';
  const content = document.getElementById('main-content');
  const renders = {
    dashboard: renderDashboard,
    notifications: renderNotifications,
    students: renderStudents,
    teachers: renderTeachers,
    attendance: renderAttendance,
    'att-register': renderAttendanceRegister,
    timetable: renderTimetable,
    cancel: renderCancel,
    complaints: renderComplaints,
    profile: renderProfile,
    addstudent: renderAddStudent,
    pyq: renderPYQ,
  };
  content.innerHTML = (renders[page] || (() => '<div class="page active"><p>Coming soon</p></div>'))();

  // Attendance page ke baad rows populate karo — DOM ready hone ke baad
  if (page === 'attendance' && currentUser.role !== 'student') {
    setTimeout(() => renderAttTable(), 0);
  }
}

// ── PAGE: DASHBOARD ───────────────────────────────────────────────────────────

function renderDashboard() {
  const r = currentUser.role;
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  const cancelled = TODAY_DAY === -1 ? 0 : Object.keys(cancelledClasses).filter(key => {
    const parts = key.split('_');
    return parts[parts.length - 1] === DAYS[TODAY_DAY];
  }).length;

  // Cancelled class alerts for today
  const alerts = Object.entries(cancelledClasses)
    .filter(([key]) => {
      const parts = key.split('_');
      const day = parts[parts.length - 1]; // last part is day e.g. "Mon"
      return TODAY_DAY !== -1 && day === DAYS[TODAY_DAY];
    })
    .map(([key]) => {
      const [subj] = key.split('_');
      return `<div class="alert-banner danger">
  <div class="icon">🚫</div>
  <div class="alert-text"><strong>${subj} — Class Cancelled Today (${DAYS[TODAY_DAY]})</strong>
  <span>This class has been cancelled by your teacher. Check notifications for details.</span></div>
</div>`;
    }).join('');

  if (r === 'student') {
    const avg = getOverallAttendance(currentUser.email);
    return `
    <div class="page active">
      <div class="page-title">Hii, ${currentUser.name}! 👋</div>
      <div class="page-sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — Here's your daily overview</div>
      ${alerts || ''}
      <div class="cards-grid">
        <div class="stat-card blue"><div class="label">Avg Attendance</div><div class="value">${avg}%</div><div class="sub">Across all subjects</div></div>
        <div class="stat-card green"><div class="label">Subjects</div><div class="value">${SUBJECTS.length}</div><div class="sub">Enrolled this semester</div></div>
        <div class="stat-card amber"><div class="label">Complaints</div><div class="value">${COMPLAINTS.filter(c => c.by === currentUser.name).length}</div><div class="sub">Filed by you</div></div>
        <div class="stat-card red"><div class="label">Notifications</div><div class="value">${unread}</div><div class="sub">Unread alerts</div></div>
      </div>
      <div class="section-card">
        <h3>Today's Schedule — ${TODAY_DAY === -1 ? 'Weekend' : DAYS[TODAY_DAY]}</h3>
        ${SUBJECTS.filter((s, i) => [0, 1].includes(i)).map(s => {
      const cancelled = TODAY_DAY !== -1 && cancelledClasses[s + '_' + DAYS[TODAY_DAY]];
      return `<div class="cancel-class-item">
            <div><div style="font-size:14px;font-weight:600">${s}</div><div style="font-size:12px;color:var(--text3)">9:00 AM — Room 201</div></div>
            ${cancelled ? '<span class="badge cancelled">Cancelled</span>' : '<span class="badge present">Scheduled</span>'}
          </div>`;
    }).join('')}
        <div style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="navigate('timetable')">View full timetable →</button></div>
      </div>
      <div class="section-card">
        <h3>Attendance Summary</h3>
        ${SUBJECTS.map(s => {
      const pct = getAttendanceStats(currentUser.email, s).pct;
      const color = pct >= 85 ? 'var(--green)' : pct >= 75 ? 'var(--amber)' : 'var(--red)';
      return `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:13px;font-weight:500">${s}</span>
              <span style="font-size:13px;font-weight:700;color:${color}">${pct}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
    }).join('')}
      </div>
    </div>`;
  }

  if (r === 'teacher') {
    const mySection = currentUser.section; // e.g. "A" or "A & B"
    const myStudents = STUDENTS.filter(s => mySection.includes(getStudentSection(s.roll)));
    return `
    <div class="page active">
      <div class="page-title">Welcome, ${currentUser.name}! 👩‍🏫</div>
      <div class="page-sub">${getTodayLabel()} — Class overview</div>
      <div class="cards-grid">
        <div class="stat-card blue"><div class="label">My Students</div><div class="value">${myStudents.length}</div><div class="sub">Active this semester</div></div>
        <div class="stat-card green"><div class="label">Subjects</div><div class="value">${currentUser.subject ? currentUser.subject.split(',').length : 0}</div><div class="sub">Teaching this term</div></div>
        <div class="stat-card amber"><div class="label">Pending Complaints</div><div class="value">${COMPLAINTS.filter(c => c.status === 'pending').length}</div><div class="sub">Require attention</div></div>
        <div class="stat-card red"><div class="label">Cancelled Today</div><div class="value">${cancelled}</div><div class="sub">Classes cancelled</div></div>
      </div>
      <div class="section-card">
        <h3>Today's Classes — ${TODAY_DAY === -1 ? 'Weekend' : DAYS[TODAY_DAY]}</h3>
        ${(currentUser.role === 'teacher'
        ? currentUser.subject.split(',').map(x => x.trim())
        : SUBJECTS.slice(0, 3)
      ).map(s => {
        const cancelled = TODAY_DAY !== -1 && cancelledClasses[s + '_' + DAYS[TODAY_DAY]];
        return `<div class="cancel-class-item">
            <div><div style="font-size:14px;font-weight:600">${s}</div><div style="font-size:12px;color:var(--text3)">Room 201 · 50 students</div></div>
            <div style="display:flex;gap:8px;align-items:center">
              ${cancelled ? '<span class="badge cancelled">Cancelled</span>' : '<span class="badge present">Scheduled</span>'}
              <button class="btn btn-sm btn-outline" onclick="navigate('attendance')">Mark</button>
            </div>
          </div>`;
      }).join('')}
      </div>
      <div class="section-card">
        <h3>Recent Complaints</h3>
        ${COMPLAINTS.slice(0, 3).map(c => `
          <div class="notif-item">
            <div style="flex:1">
              <div class="notif-title">${c.subject}</div>
              <div class="notif-body">${c.by} · ${c.category}</div>
              <div class="notif-time">${c.date}</div>
            </div>
            <span class="badge ${c.status}">${c.status}</span>
          </div>`).join('')}
        <div style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="navigate('complaints')">View all →</button></div>
      </div>
    </div>`;
  }
  // admin
  const totalAtt = STUDENTS.length > 0
    ? Math.round(STUDENTS.reduce((sum, s) => sum + getOverallAttendance(s.roll), 0) / STUDENTS.length)
    : 0;
  return `
    <div class="page active">
      <div class="page-title">Admin Dashboard 🏛️</div>
      <div class="page-sub">${getTodayLabel()} — System overview</div>
      <div class="cards-grid">
        <div class="stat-card blue"><div class="label">Total Students</div><div class="value">${STUDENTS.length}</div><div class="sub">B.Tech CS Sem 3</div></div>
        <div class="stat-card red"><div class="label">Critical Attendance</div><div class="value">${STUDENTS.filter(s => getOverallAttendance(s.roll) < 75).length}</div><div class="sub">Students below 75%</div></div>
        <div class="stat-card amber"><div class="label">Pending Complaints</div><div class="value">${COMPLAINTS.filter(c => c.status === 'pending').length}</div><div class="sub">Need resolution</div></div>
        <div class="stat-card red"><div class="label">Cancelled Classes</div><div class="value">${cancelled}</div><div class="sub">Today</div></div>
      </div>
      <div class="section-card">
        <h3>Students at Risk (Attendance &lt;75%)</h3>
        <table>
          <thead><tr><th>Student</th><th>Roll No.</th><th>Attendance</th><th>Status</th></tr></thead>
          <tbody>
            ${STUDENTS
      .map(s => ({ ...s, liveAtt: getOverallAttendance(s.roll) }))
      .filter(s => s.liveAtt < 75)
      .sort((a, b) => a.liveAtt - b.liveAtt)
      .map(s => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar" style="width:28px;height:28px;font-size:11px;background:${s.color}">${s.avatar}</div>${s.name}</div></td>
      <td>${s.roll}</td>
      <td><span style="font-weight:700;color:${s.liveAtt < 75 ? 'var(--red)' : 'var(--amber)'}">${s.liveAtt}%</span></td>
      <td><span class="badge ${s.liveAtt < 75 ? 'absent' : 'pending'}">${s.liveAtt < 75 ? 'Critical' : 'Warning'}</span></td>
    </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="section-card">
        <h3>Analytics 📊</h3>
        <div class="chart-tabs">
          <button class="chart-tab active" onclick="switchChart('attendance',this)">Attendance</button>
          <button class="chart-tab" onclick="switchChart('complaints',this)">Complaints</button>
        </div>
        <div class="chart-wrap" id="analytics-chart">${buildAttendanceChart()}</div>
      </div>
      <div class="section-card">
        <h3>All Complaints</h3>
        <table>
          <thead><tr><th>Student</th><th>Subject</th><th>Category</th><th>Upvotes</th><th>Status</th></tr></thead>
          <tbody>
          ${[...COMPLAINTS].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).map(c => `
            <tr>
              <td>${c.by}</td>
              <td style="max-width:180px">${c.subject}</td>
              <td><span class="badge info">${c.category}</span></td>
              <td><span style="font-weight:700;color:var(--primary)">👍 ${c.upvotes || 0}</span></td>
             <td><span class="badge ${c.status}">${c.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      
    </div>`;
}

// ── ANALYTICS HELPERS ────────────────────────────────────────────────────────

function switchChart(type, btn) {
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wrap = document.getElementById('analytics-chart');
  if (!wrap) return;
  wrap.innerHTML = type === 'attendance' ? buildAttendanceChart() : buildComplaintsChart();
}

function buildAttendanceChart() {
  const ranges = [
    { label: '<60%', min: 0, max: 60, color: 'var(--red)' },
    { label: '60-75%', min: 60, max: 75, color: 'var(--amber)' },
    { label: '75-85%', min: 75, max: 85, color: 'var(--blue)' },
    { label: '85%+', min: 85, max: 101, color: 'var(--green)' },
  ];
  const counts = ranges.map(r =>
    STUDENTS.filter(s => {
      const a = getOverallAttendance(s.roll);
      return a >= r.min && a < r.max;
    }).length
  );
  const maxVal = Math.max(...counts, 1);
  const CHART_H = 180;
  const MIN_H = 8; // zero bhi ho toh ek thin bar dikhega
  return `
    <div style="margin-bottom:10px;font-size:12px;color:var(--text3);font-weight:600">Students by Attendance Range</div>
    <div style="display:flex;align-items:flex-end;gap:16px;height:${CHART_H + 30}px;padding-bottom:28px;border-bottom:2px solid var(--border);position:relative">
        ${ranges.map((r, i) => {
    const logVal = counts[i] === 0 ? 0 : Math.log(counts[i] + 1);
    const logMax = Math.log(maxVal + 1);
    const h = counts[i] === 0 ? MIN_H : Math.max(MIN_H, Math.round((logVal / logMax) * CHART_H));
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:0">
                <div style="width:100%;height:${h}px;background:${r.color};border-radius:6px 6px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:6px;position:relative" title="${counts[i]} students">
               <span style="font-size:13px;font-weight:700;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.4)">${counts[i]}</span>
             </div>
                <span style="font-size:12px;color:var(--text3);margin-top:8px;font-weight:500">${r.label}</span>
            </div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
        ${ranges.map(r => `<span style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:5px">
            <span style="width:10px;height:10px;border-radius:50%;background:${r.color};display:inline-block"></span>${r.label}
        </span>`).join('')}
    </div>`;
}

function buildComplaintsChart() {
  const cats = ['Academic', 'Infrastructure', 'Behavioural', 'Other'];
  const catColors = ['var(--primary)', 'var(--amber)', 'var(--red)', 'var(--blue)'];
  const counts = cats.map(cat => ({
    cat,
    total: COMPLAINTS.filter(c => c.category === cat).length,
  }));
  const maxVal = Math.max(...counts.map(c => c.total), 1);
  const CHART_H = 180;
  const MIN_H = 8;
  return `
    <div style="margin-bottom:10px;font-size:12px;color:var(--text3);font-weight:600">Complaints by Category</div>
    <div style="display:flex;align-items:flex-end;gap:16px;height:${CHART_H + 40}px;padding-bottom:28px;border-bottom:2px solid var(--border)">
        ${counts.map((c, i) => {
    const logVal = c.total === 0 ? 0 : Math.log(c.total + 1);
    const logMax = Math.log(maxVal + 1);
    const h = c.total === 0 ? MIN_H : Math.max(MIN_H, Math.round((logVal / logMax) * CHART_H));
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative">
                <div style="width:100%;height:${h}px;background:${catColors[i]};border-radius:6px 6px 0 0;position:relative">
                    <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:700;color:#111;white-space:nowrap">${c.total}</span>
                </div>
                <span style="font-size:12px;color:var(--text3);margin-top:8px;font-weight:500;text-align:center">${c.cat}</span>
            </div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
        ${cats.map((cat, i) => `<span style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:5px">
            <span style="width:10px;height:10px;border-radius:50%;background:${catColors[i]};display:inline-block"></span>${cat}
        </span>`).join('')}
    </div>`;
}

// ── PAGE: NOTIFICATIONS ───────────────────────────────────────────────────────

function renderNotifications() {
  markNotificationsRead();
  const canPost = currentUser.role !== 'student';

  return `<div class="page active">
    <div class="page-title">Notifications</div>
    <div class="page-sub">All your alerts and updates</div>
    ${canPost ? `
    <div class="section-card">
      <h3>Send New Notification</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="notif-title" placeholder="Notification heading" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="notif-type">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="cancel">Alert / Cancel</option>
          </select>
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label>Message</label>
          <textarea id="notif-body" placeholder="Write your notification..."></textarea>
        </div>
      </div>
      <button class="btn btn-blue" onclick="postNotification()">🔔 Send Notification</button>
    </div>` : ''}
    <div class="section-card">
      ${NOTIFICATIONS.length === 0 ? '<div class="empty-state"><div class="icon">🔔</div><p>No notifications yet</p></div>' :
      [...NOTIFICATIONS].sort((a, b) => new Date(b.time) - new Date(a.time)).map(n => `
        <div class="notif-item">
          <div class="notif-dot read"></div>
          <div>
            <div class="notif-title">${n.type === 'cancel' ? '🚫 ' : n.type === 'success' ? '✅ ' : '📢 '}${n.title}</div>
            <div class="notif-body">${n.body}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

async function postNotification() {
  const title = document.getElementById('notif-title').value.trim();
  const type = document.getElementById('notif-type').value;
  const body = document.getElementById('notif-body').value.trim();
  if (!title || !body) { showToast('Fill in title and message', true); return; }

  const newNotif = { title, body, time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), type, read: false };

  try {
    const docRef = await window.addDoc(window.collection(window.db, "Notifications"), newNotif);
    NOTIFICATIONS.unshift({ id: docRef.id, ...newNotif });
    showToast('Notification sent ✓');
    navigate('notifications');
  } catch (error) {
    console.error("Error sending notification: ", error);
    showToast('Failed to send notification. Try again.', true);
  }
}

async function markNotificationsRead() {
  const unread = NOTIFICATIONS.filter(n => !n.read);

  NOTIFICATIONS.forEach(n => n.read = true);
  const notifCount = document.getElementById('notif-count');
  if (notifCount) notifCount.textContent = '0';
  const nb = document.getElementById('nav-notif-badge');
  if (nb) nb.textContent = '0';

  for (const n of unread) {
    try {
      await window.updateDoc(window.doc(window.db, "Notifications", n.id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read: ", error);
    }
  }
}

// ── PAGE: STUDENTS ────────────────────────────────────────────────────────────

function renderStudents() {
  const mySection = currentUser.section || '';
  const myStudents = currentUser.role === 'teacher'
    ? STUDENTS.filter(s => mySection.includes(getStudentSection(s.roll)))
    : STUDENTS;

  return `<div class="page active">
    <div class="page-title">${currentUser.role === 'teacher' ? 'My Students' : 'Students'}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <div class="page-sub">Admin & Teacher can add students here<br>${myStudents.length} students enrolled · B.Tech CS Sem 3</div>
  </div>

  ${currentUser.role === 'admin' || currentUser.role === 'teacher'
      ? `<button class="btn btn-blue" onclick="showAddStudentForm()">
         + Add Student
       </button>`
      : ''
    }
</div>
    <div class="section-card">
      <table>
        <thead><tr><th>Student</th><th>Roll No.</th><th>Attendance</th><th>Status</th>${(currentUser.role === 'admin' || currentUser.role === 'teacher') ? '<th>Action</th>' : ''}</tr></thead>
        <tbody>
          ${[...myStudents].sort((a, b) => Number(a.roll) - Number(b.roll)).map(s => {
      const liveAttendance = getOverallAttendance(s.roll);
      const color = liveAttendance >= 85 ? 'var(--green)' : liveAttendance >= 75 ? 'var(--amber)' : 'var(--red)';
      const status = liveAttendance >= 85 ? 'present' : liveAttendance >= 75 ? 'late' : 'absent';
      return `<tr>
              <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${s.color}">${s.avatar}</div><div><div style="font-weight:600">${s.name}</div><div style="font-size:12px;color:var(--text3)">${s.class}</div></div></div></td>
              <td>${s.roll}</td>
              <td><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:${color}">${liveAttendance}%</span><div style="width:80px"><div class="progress-bar"><div class="progress-fill" style="width:${liveAttendance}%;background:${color}"></div></div></div></div></td>
              <td><span class="badge ${status}">${liveAttendance >= 85 ? 'Good' : liveAttendance >= 75 ? 'Warning' : 'At Risk'}</span></td>
              ${(currentUser.role === 'admin' || currentUser.role === 'teacher') ? `<td>
  <button class="btn btn-sm btn-outline" style="color:var(--red);border-color:var(--red)" 
    onclick="deleteStudent('${s.id}', '${s.name}')">🗑️ Delete</button>
</td>` : ''}
            </tr>`;
    }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}
async function deleteStudent(docId, name) {
  if (!confirm(`"${name}" ko delete karna chahte ho?\n\nYaad rahe: Firebase Auth se manually bhi delete karna hoga.`)) return;

  try {
    // Firestore se student document delete
    await window.deleteDoc(window.doc(window.db, "Students", docId));

    // Local array se bhi hatao
    window.STUDENTS = window.STUDENTS.filter(s => s.id !== docId);

    showToast(`${name} deleted from records ✓`);
    navigate('students');
  } catch (err) {
    console.error(err);
    showToast('Delete failed. Try again.', true);
  }
}
async function showAddStudentForm() {

  const name = prompt("Student Name");

  if (!name) return;

  const roll = prompt("Roll Number");

  if (!roll) return;

  const studentClass = prompt("Class");

  if (!studentClass) return;

  const email = prompt("Student Email (needed for login)");

  if (!email) return;

  const initials =
    name.split(" ")
      .map(x => x[0])
      .join("")
      .toUpperCase();

  await window.addDoc(window.collection(window.db, "Students"), {  //Create new document in firestore
    name: name,
    roll: Number(roll),
    class: studentClass,
    email: email,
    avatar: initials,
    color: "#3b5bdb"
  });

  // Also write the roll->email pair to RollIndex — this is the ONLY thing
  // that stays publicly readable, so login still works before auth, without
  // exposing the student's full profile.
  await window.setDoc(window.doc(window.db, "RollIndex", String(roll)), { email });

  await window.loadStudents(); //list ko firestore se dobara frtch krne ke liye

  showToast("Student added to records. Ask admin to create their login (Auth account) separately.");

  navigate("students");
}
function renderAddStudent() {
  return
}

// ── PAGE: TEACHERS (admin-only management) ─────────────────────────────────

function renderTeachers() {
  if (currentUser.role !== 'admin') {
    return `<div class="page active"><p>Not authorized.</p></div>`;
  }
  return `<div class="page active">
    <div class="page-title">Teachers</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div class="page-sub">${(window.TEACHERS || []).length} teachers · manage subject & section assignments</div>
      <button class="btn btn-blue" onclick="showAddTeacherForm()">+ Add Teacher</button>
    </div>
    <div class="section-card">
      <table>
        <thead><tr><th>Teacher</th><th>Roll/ID</th><th>Subject</th><th>Section</th><th>Action</th></tr></thead>
        <tbody id="teachers-list">
          ${(window.TEACHERS || []).map(t => `<tr>
              <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${t.color || '#9d174d'}">${t.avatar || ''}</div><div style="font-weight:600">${t.name}</div></div></td>
              <td>${t.roll}</td>
              <td>${t.subject || '—'}</td>
              <td>${t.section || '—'}</td>
              <td><button class="btn btn-sm btn-outline" style="color:var(--red);border-color:var(--red)" onclick="deleteTeacher('${t.id}', '${t.name}')">🗑️ Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

async function showAddTeacherForm() {
  const name = prompt("Teacher Name");
  if (!name) return;

  const roll = prompt("Roll/ID Number (unique — used to log in)");
  if (!roll) return;

  const subject = prompt("Subject they teach");
  if (!subject) return;

  const section = prompt("Section (e.g. A, B, or 'A & B')");
  if (!section) return;

  const email = prompt("Login Email (create this exact email as a Firebase Auth user in the Firebase Console first)");
  if (!email) return;

  const initials = name.split(" ").map(x => x[0]).join("").toUpperCase();

  await window.addDoc(window.collection(window.db, "Teachers"), {
    name,
    roll: String(roll),
    subject,
    section,
    email,
    avatar: initials,
    color: "#9d174d"
  });

  // Public roll->email mapping so this teacher can log in.
  await window.setDoc(window.doc(window.db, "RollIndex", String(roll)), { email });

  // Staff membership — required by the Firestore rules' isStaff() check
  // so this teacher can mark attendance, upload PYQs, cancel classes, etc.
  await window.setDoc(window.doc(window.db, "StaffEmails", email), { role: "teacher", name });

  await window.loadTeachers();

  showToast("Teacher added. Don't forget to create their Firebase Auth account in the console with the same email.");
  navigate("teachers");
}

async function deleteTeacher(docId, name) {
  if (!confirm(`"${name}" ko delete karna chahte ho?\n\nYaad rahe: Firebase Auth se manually bhi delete karna hoga.`)) return;
  try {
    await window.deleteDoc(window.doc(window.db, "Teachers", docId));
    window.TEACHERS = window.TEACHERS.filter(t => t.id !== docId);
    showToast(`${name} deleted from records ✓`);
    navigate('teachers');
  } catch (err) {
    console.error(err);
    showToast('Delete failed. Try again.', true);
  }
}

// ── PAGE: ATTENDANCE ──────────────────────────────────────────────────────────

function renderAttendance() {
  if (currentUser.role === 'student') {
    return `<div class="page active">
      <div class="page-title">My Attendance</div>
      <div class="page-sub">Attendance record for this semester</div>
      ${SUBJECTS.map(s => {
      const d = getAttendanceStats(currentUser.email, s);
      const color = d.pct >= 85 ? 'var(--green)' : d.pct >= 75 ? 'var(--amber)' : 'var(--red)';
      return `<div class="section-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3>${s}</h3>
            <span style="font-size:22px;font-weight:700;color:${color}">${d.pct}%</span>
          </div>
          <div class="cards-grid" style="margin-bottom:12px">
            <div class="stat-card green"><div class="label">Present</div><div class="value">${d.present}</div></div>
            <div class="stat-card red"><div class="label">Absent</div><div class="value">${d.absent}</div></div>
            <div class="stat-card blue"><div class="label">Total Classes</div><div class="value">${d.total}</div></div>
          </div>
          <div class="progress-bar" style="height:10px"><div class="progress-fill" style="width:${d.pct}%;background:${color}"></div></div>
          ${d.pct < 75 ? '<div style="margin-top:8px;font-size:12px;color:var(--red);font-weight:500">⚠️ Attendance below 75% — you may not be allowed to sit for exams.</div>' : ''}
        </div>`;
    }).join('')}
    </div>`;
  }

  // Teacher / Admin: Mark Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  return `<div class="page active">
    <div class="page-title">Mark Attendance</div>
    <div class="page-sub">Select section, type, subject and date</div>
    <div class="section-card">
      <div class="form-row">
        <div class="form-group">
          <label>Section</label>
          <select id="att-section" onchange="onSectionOrTypeChange()">
            <option value="A">Section A (Roll 001–050)</option>
            <option value="B">Section B (Roll 051–101)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Class / Lab</label>
          <select id="att-type" onchange="onSectionOrTypeChange()">
            <option value="class">Class</option>
            <option value="lab">Lab</option>
          </select>
        </div>
        <div class="form-group" id="att-group-wrap" style="display:none">
          <label>Lab Group</label>
          <select id="att-group" onchange="onAttFilterChange()">
            <option value="1">Group 1 </option>
            <option value="2">Group 2 </option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Subject</label>
          <select id="att-subject" onchange="onAttFilterChange()">
            ${SUBJECTS.map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="att-date" value="${todayStr}" onchange="onAttFilterChange()" />
        </div>
      </div>
    </div>
    <div class="section-card" id="att-table-wrap">
      <h3>Students — <span id="att-subject-label">${SUBJECTS[0]}</span></h3>
      <div id="att-rows"></div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-green" onclick="saveAttendance()">Save Attendance</button>
        <button class="btn btn-outline" onclick="markAll('p')">Mark All Present</button>
        <button class="btn btn-outline" id="download-today-btn" onclick="downloadTodaysAttendance()" disabled title="Pehle attendance save karein">⬇️ Download Today's Attendance</button>
      </div>
    </div>
  </div>`;
}

// Builds the student rows for the currently selected subject+date,
// pre-filling already-saved statuses from Firestore (so it's editable anytime)
function buildAttRows() {
  const subj = document.getElementById('att-subject')?.value || SUBJECTS[0];
  const date = document.getElementById('att-date')?.value || new Date().toISOString().split('T')[0];
  const section = document.getElementById('att-section')?.value || 'A';
  const type = document.getElementById('att-type')?.value || 'class';
  const group = document.getElementById('att-group')?.value || '1';

  let filteredStudents;

  if (type === 'lab') {
    // Section + Group dono se filter karo
    // Sec A G1: 001-025, Sec A G2: 026-050, Sec B G1: 051-075, Sec B G2: 076-101
    const groupKey = section + group; // 'A1', 'A2', 'B1', 'B2'
    filteredStudents = STUDENTS.filter(s => getStudentGroup(s.roll) === groupKey);
  } else {
    // Sirf section se filter karo — poore 50 students
    filteredStudents = STUDENTS.filter(s => getStudentSection(s.roll) === section);
  }

  todayAttendanceDraft = {};
  filteredStudents.forEach(s => {
    const existing = window.ATTENDANCE.find(a =>
      String(a.rollNo) === String(s.roll) && a.subject === subj && a.date === date
    );
    todayAttendanceDraft[s.roll] = existing ? existing.status : 'p';
  });

  if (filteredStudents.length === 0) {
    return `<div class="empty-state"><div class="icon">👥</div><p>No students found for this selection</p></div>`;
  }

  const matchingRecords = window.ATTENDANCE.filter(a => a.subject === subj && a.date === date);
  const recordsExist = matchingRecords.length > 0;
  const isLocked = matchingRecords.some(a => a.locked);

  // Locked (downloaded) attendance ko kabhi bhi edit mode me mat jaane do
  if (isLocked) attEditMode = false;

  if (recordsExist && !attEditMode) {
    const presentCount = filteredStudents.filter(s => todayAttendanceDraft[s.roll] === 'p').length;
    const absentCount = filteredStudents.length - presentCount;
    return `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text3)">
      ✅ Attendance already marked for this date — 
      <strong style="color:var(--green)">${presentCount} Present</strong>, 
      <strong style="color:var(--red)">${absentCount} Absent</strong>
      &nbsp;·&nbsp;${isLocked
        ? '<span style="color:var(--text3)">🔒 Downloaded &amp; locked — can\'t be edited</span>'
        : '<button class="btn btn-outline btn-sm" onclick="attEditMode=true; renderAttTable();">Edit</button>'}
    </div>
    ${[...filteredStudents].sort((a, b) => Number(a.roll) - Number(b.roll)).map(s => `
      <div class="att-mark-row">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="width:32px;height:32px;font-size:12px;background:${s.color}">${s.avatar}</div>
          <div><div style="font-size:14px;font-weight:600">${s.name}</div><div style="font-size:12px;color:var(--text3)">${s.roll}</div></div>
        </div>
        <span class="badge ${todayAttendanceDraft[s.roll] === 'p' ? 'present' : 'cancelled'}">${todayAttendanceDraft[s.roll] === 'p' ? 'Present' : 'Absent'}</span>
      </div>`).join('')}
  `;
  }

  return [...filteredStudents].sort((a, b) => Number(a.roll) - Number(b.roll)).map(s => `
        <div class="att-mark-row">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar" style="width:32px;height:32px;font-size:12px;background:${s.color}">${s.avatar}</div>
            <div><div style="font-size:14px;font-weight:600">${s.name}</div><div style="font-size:12px;color:var(--text3)">${s.roll}</div></div>
          </div>
          <div class="att-btns">
            <button class="att-btn p ${todayAttendanceDraft[s.roll] === 'p' ? 'selected' : ''}" onclick="markAtt('${s.roll}','p',this)">P</button>
            <button class="att-btn a ${todayAttendanceDraft[s.roll] === 'a' ? 'selected' : ''}" onclick="markAtt('${s.roll}','a',this)">A</button>
          </div>
        </div>`).join('');
}

function renderAttTable() {
  const subj = document.getElementById('att-subject').value;
  document.getElementById('att-subject-label').textContent = subj;
  document.getElementById('att-rows').innerHTML = buildAttRows();
  updateDownloadButtonState();
}

// "Download Today's Attendance" tabhi kaam karega jab is subject+date ke liye
// attendance already Firestore me save ho chuki ho.
function updateDownloadButtonState() {
  const subj = document.getElementById('att-subject')?.value;
  const date = document.getElementById('att-date')?.value;
  const btn = document.getElementById('download-today-btn');
  if (!btn) return;
  const exists = window.ATTENDANCE.some(a => a.subject === subj && a.date === date);
  btn.disabled = !exists;
  btn.title = exists ? 'Download PDF' : "Pehle attendance save karein";
}
function onAttFilterChange() {
  attEditMode = false;
  renderAttTable();
}

function onSectionOrTypeChange() {
  const type = document.getElementById('att-type')?.value || 'class';
  const groupWrap = document.getElementById('att-group-wrap');
  const subjSelect = document.getElementById('att-subject');

  if (type === 'lab') {
    // Group dropdown dikhao
    groupWrap.style.display = 'block';
    // Sirf lab subjects show karo
    subjSelect.innerHTML = LAB_SUBJECTS.map(s => `<option>${s}</option>`).join('');
  } else {
    // Group dropdown chhupaao
    groupWrap.style.display = 'none';
    // Saare subjects show karo (lab subjects ke bina)
    const classSubjects = SUBJECTS.filter(s => !LAB_SUBJECTS.includes(s));
    subjSelect.innerHTML = classSubjects.map(s => `<option>${s}</option>`).join('');
  }

  onAttFilterChange();
}

// Ek baar attendance download ho jaye to us subject+date ke records lock ho
// jaate hain (locked:true) — ye check karta hai ki current selection locked hai ya nahi.
function isCurrentComboLocked() {
  const subj = document.getElementById('att-subject')?.value;
  const date = document.getElementById('att-date')?.value;
  return window.ATTENDANCE.some(a => a.subject === subj && a.date === date && a.locked);
}

function markAtt(rollNo, status, btn) {
  if (isCurrentComboLocked()) {
    showToast("Ye attendance download ho chuki hai — ab edit nahi ho sakti.", true);
    return;
  }
  todayAttendanceDraft[rollNo] = status;
  const row = btn.closest('.att-btns');
  row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function markAll(status) {
  if (isCurrentComboLocked()) {
    showToast("Ye attendance download ho chuki hai — ab edit nahi ho sakti.", true);
    return;
  }
  const section = document.getElementById('att-section')?.value || 'A';
  const type = document.getElementById('att-type')?.value || 'class';
  const group = document.getElementById('att-group')?.value || '1';

  let filteredStudents;
  if (type === 'lab') {
    const groupKey = section + group;
    filteredStudents = STUDENTS.filter(s => getStudentGroup(s.roll) === groupKey);
  } else {
    filteredStudents = STUDENTS.filter(s => getStudentSection(s.roll) === section);
  }

  filteredStudents.forEach(s => todayAttendanceDraft[s.roll] = status);
  document.querySelectorAll('.att-btn').forEach(b => {
    b.classList.remove('selected');
    if (b.classList.contains(status)) b.classList.add('selected');
  });
}

// Saves attendance to Firestore: one doc per student per subject per date.
// Uses a deterministic doc ID (subject_date_roll) so re-saving the same
// date+subject UPDATES the existing record instead of creating duplicates —
// this is what makes attendance "editable anytime".
async function saveAttendance() {
  const subj = document.getElementById('att-subject')?.value || SUBJECTS[0];
  const date = document.getElementById('att-date')?.value || new Date().toISOString().split('T')[0];
  const section = document.getElementById('att-section')?.value || 'A';
  const type = document.getElementById('att-type')?.value || 'class';
  const group = document.getElementById('att-group')?.value || '1';

  if (isCurrentComboLocked()) {
    showToast("Ye attendance download ho chuki hai — ab edit/save nahi ho sakti.", true);
    return;
  }

  // Sirf wahi students save karo jo screen pe hain
  let filteredStudents;
  if (type === 'lab') {
    const groupKey = section + group;
    filteredStudents = STUDENTS.filter(s => getStudentGroup(s.roll) === groupKey);
  } else {
    filteredStudents = STUDENTS.filter(s => getStudentSection(s.roll) === section);
  }

  try {
    const promises = filteredStudents.map(s => {
      const status = todayAttendanceDraft[s.roll] || 'p';
      const safeSubj = subj.replace(/[^a-zA-Z0-9]/g, '');
      const docId = `${safeSubj}_${date}_${s.roll}`;
      const record = {
        subject: subj,
        date: date,
        rollNo: String(s.roll),
        status: status,
        markedBy: currentUser.name
      };
      return window.setDoc(window.doc(window.db, "Attendance", docId), record)
        .then(() => {
          const idx = window.ATTENDANCE.findIndex(a => a.id === docId);
          if (idx >= 0) window.ATTENDANCE[idx] = { id: docId, ...record };
          else window.ATTENDANCE.push({ id: docId, ...record });
        });
    });

    await Promise.all(promises);
    showToast('Attendance saved for ' + subj + ' ✓');
    navigate('attendance');
  } catch (error) {
    console.error("Error saving attendance: ", error);
    showToast('Failed to save attendance. Try again.', true);
  }
}

// ── ATTENDANCE PDF EXPORT ──────────────────────────────────────────────────────
// Generates register-style PDF attendance reports (jsPDF + autoTable, loaded via
// CDN in app.html). Downloaded attendance gets locked in Firestore (locked:true)
// so nobody can go back and edit a record that's already been handed out as a PDF.

const COLLEGE_NAME = "State Institute of Engineering and Technology, Nilokheri (Karnal)";

// Set this once you have the college logo as a base64 data-URL, e.g.:
//   setCollegeLogo("data:image/png;base64,iVBORw0KG...")
// Until then, a plain text watermark is used instead of the logo.
let COLLEGE_LOGO_BASE64 = "data:image/png;base64,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";
function setCollegeLogo(base64DataUrl) { COLLEGE_LOGO_BASE64 = base64DataUrl; }
window.setCollegeLogo = setCollegeLogo;

function formatDateDMY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

// Draws the college name/logo header + a faint background watermark on a jsPDF doc
function addPDFHeader(docPdf) {
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const pageHeight = docPdf.internal.pageSize.getHeight();

  // Faint background watermark, centered
  if (COLLEGE_LOGO_BASE64) {
    try {
      if (docPdf.GState) docPdf.setGState(new docPdf.GState({ opacity: 0.08 }));
      const size = Math.min(pageWidth, pageHeight) * 0.55;
      docPdf.addImage(COLLEGE_LOGO_BASE64, 'PNG', (pageWidth - size) / 2, (pageHeight - size) / 2, size, size);
      if (docPdf.GState) docPdf.setGState(new docPdf.GState({ opacity: 1 }));
    } catch (e) { console.error('Watermark image error:', e); }
  } else {
    docPdf.setTextColor(225, 225, 225);
    docPdf.setFontSize(38);
    docPdf.text('SIET NILOKHERI', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 30 });
    docPdf.setTextColor(0, 0, 0);
  }

  // Small logo top-left (if available) + college name header
  if (COLLEGE_LOGO_BASE64) {
    try { docPdf.addImage(COLLEGE_LOGO_BASE64, 'PNG', 12, 8, 16, 16); } catch (e) { /* ignore */ }
  }
  docPdf.setFontSize(13);
  docPdf.setFont(undefined, 'bold');
  docPdf.text(COLLEGE_NAME, pageWidth / 2, 16, { align: 'center' });
  docPdf.setFont(undefined, 'normal');
  docPdf.setFontSize(10);
}

// Sets locked:true on the given subject+date+roll Attendance docs in Firestore
// so they show up read-only from now on (see buildAttRows / markAtt / saveAttendance).
async function lockAttendanceRecords(subj, date, rollNos) {
  try {
    const safeSubj = subj.replace(/[^a-zA-Z0-9]/g, '');
    const promises = rollNos.map(roll => {
      const docId = `${safeSubj}_${date}_${roll}`;
      return window.setDoc(window.doc(window.db, "Attendance", docId), { locked: true }, { merge: true })
        .then(() => {
          const idx = window.ATTENDANCE.findIndex(a => a.id === docId);
          if (idx >= 0) window.ATTENDANCE[idx].locked = true;
        });
    });
    await Promise.all(promises);
    if (document.getElementById('att-rows')) renderAttTable();
  } catch (err) {
    console.error('Error locking attendance records:', err);
  }
}

// "Download Today's Attendance" — exports exactly what's on screen right now
// (current section/type/group/subject/date). Only works once that combo has
// been saved at least once (button stays disabled until then).
function downloadTodaysAttendance() {
  const subj = document.getElementById('att-subject')?.value;
  const date = document.getElementById('att-date')?.value;
  const section = document.getElementById('att-section')?.value || 'A';
  const type = document.getElementById('att-type')?.value || 'class';
  const group = document.getElementById('att-group')?.value || '1';

  const recordsExist = window.ATTENDANCE.some(a => a.subject === subj && a.date === date);
  if (!recordsExist) {
    showToast('Pehle attendance save karein, phir download karein.', true);
    return;
  }
  if (!window.jspdf) {
    showToast('PDF library load nahi hui — internet connection check karein.', true);
    return;
  }

  let filteredStudents;
  if (type === 'lab') {
    const groupKey = section + group;
    filteredStudents = STUDENTS.filter(s => getStudentGroup(s.roll) === groupKey);
  } else {
    filteredStudents = STUDENTS.filter(s => getStudentSection(s.roll) === section);
  }
  filteredStudents = [...filteredStudents].sort((a, b) => Number(a.roll) - Number(b.roll));

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addPDFHeader(docPdf);

  docPdf.text(`Subject: ${subj}`, 14, 26);
  docPdf.text(`Section: ${section}${type === 'lab' ? ' (Group ' + group + ')' : ''}`, 14, 32);
  docPdf.text(`Date: ${formatDateDMY(date)}`, 14, 38);

  const body = filteredStudents.map(s => {
    const rec = window.ATTENDANCE.find(a => a.subject === subj && a.date === date && String(a.rollNo) === String(s.roll));
    const status = rec?.status === 'p' ? 'Present' : 'Absent';
    return [s.roll, s.name, status];
  });

  docPdf.autoTable({
    startY: 44,
    head: [['Roll No.', 'Student Name', 'Status']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [59, 91, 219] },
  });

  docPdf.save(`Attendance_${subj.replace(/[^a-zA-Z0-9]/g, '')}_${date}.pdf`);
  showToast("PDF download ho gayi — attendance ab lock ho jaayegi 🔒");
  lockAttendanceRecords(subj, date, filteredStudents.map(s => String(s.roll)));
}
window.downloadTodaysAttendance = downloadTodaysAttendance;

// ── PAGE: ATTENDANCE REGISTER (full history, register-style export) ───────────

function renderAttendanceRegister() {
  if (currentUser.role === 'student') {
    return `<div class="page active"><p>Access denied.</p></div>`;
  }
  return `<div class="page active">
    <div class="page-title">Attendance Register</div>
    <div class="page-sub">Section + subject select karke ab tak ki poori attendance ek register-style PDF me download karein</div>
    <div class="section-card">
      <div class="form-row">
        <div class="form-group">
          <label>Section</label>
          <select id="reg-section">
            <option value="A">Section A (Roll 001–050)</option>
            <option value="B">Section B (Roll 051–101)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <select id="reg-subject" onchange="onRegSubjectChange()">
            ${SUBJECTS.map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="reg-group-wrap" style="display:none">
          <label>Lab Group</label>
          <select id="reg-group">
            <option value="1">Group 1</option>
            <option value="2">Group 2</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="downloadAttendanceRegister()">⬇️ Download Full Attendance Register (PDF)</button>
      <div style="margin-top:10px;font-size:12px;color:var(--text3)">
        Note: register download hone ke baad, is subject/section ki wo saari dates lock ho jaayengi — dobara edit nahi ho sakengi.
      </div>
    </div>
  </div>`;
}

function onRegSubjectChange() {
  const subj = document.getElementById('reg-subject')?.value;
  const wrap = document.getElementById('reg-group-wrap');
  if (wrap) wrap.style.display = LAB_SUBJECTS.includes(subj) ? 'block' : 'none';
}
window.onRegSubjectChange = onRegSubjectChange;

// Builds a register: rows = students, columns = every date attendance was
// taken for this subject/section, plus Total Classes + Total Present.
function downloadAttendanceRegister() {
  const section = document.getElementById('reg-section')?.value || 'A';
  const subj = document.getElementById('reg-subject')?.value;
  const isLab = LAB_SUBJECTS.includes(subj);
  const group = document.getElementById('reg-group')?.value || '1';

  if (!window.jspdf) {
    showToast('PDF library load nahi hui — internet connection check karein.', true);
    return;
  }

  let students;
  if (isLab) {
    const groupKey = section + group;
    students = STUDENTS.filter(s => getStudentGroup(s.roll) === groupKey);
  } else {
    students = STUDENTS.filter(s => getStudentSection(s.roll) === section);
  }
  students = [...students].sort((a, b) => Number(a.roll) - Number(b.roll));

  if (students.length === 0) {
    showToast('Is selection ke liye koi student nahi mila.', true);
    return;
  }

  const rollSet = new Set(students.map(s => String(s.roll)));
  const dateSet = new Set();
  window.ATTENDANCE.forEach(a => {
    if (a.subject === subj && rollSet.has(String(a.rollNo))) dateSet.add(a.date);
  });
  const dates = [...dateSet].sort(); // "YYYY-MM-DD" sorts chronologically as strings

  if (dates.length === 0) {
    showToast('Is subject/section ke liye abhi tak koi attendance record nahi hai.', true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ orientation: dates.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  addPDFHeader(docPdf);

  docPdf.text(`Subject: ${subj}`, 14, 26);
  docPdf.text(`Section: ${section}${isLab ? ' (Group ' + group + ')' : ''}`, 14, 32);

  const head = [['Roll No.', 'Student Name', ...dates.map(formatDateDMY), 'Total Classes', 'Total Present']];
  const body = students.map(s => {
    let present = 0;
    const dateCells = dates.map(d => {
      const rec = window.ATTENDANCE.find(a => a.subject === subj && a.date === d && String(a.rollNo) === String(s.roll));
      if (rec?.status === 'p') present++;
      return rec ? (rec.status === 'p' ? 'P' : 'A') : '-';
    });
    return [s.roll, s.name, ...dateCells, dates.length, present];
  });

  docPdf.autoTable({
    startY: 38,
    head, body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 91, 219] },
  });

  docPdf.save(`AttendanceRegister_${subj.replace(/[^a-zA-Z0-9]/g, '')}_Section${section}.pdf`);
  showToast("Register PDF download ho gayi — in dates ki attendance ab lock ho jaayegi 🔒");

  const rollNos = students.map(s => String(s.roll));
  dates.forEach(d => lockAttendanceRecords(subj, d, rollNos));
}
window.downloadAttendanceRegister = downloadAttendanceRegister;

// ── PAGE: TIMETABLE ───────────────────────────────────────────────────────────

function renderTimetable() { // Section decide karo based on logged-in student's roll
  let activeTable = TIMETABLE;
  let sectionLabel = 'Section A';
  if (currentUser.role === 'student') {
    const sec = getStudentSection(currentUser.email); // email mein roll no. store hai
    if (sec === 'B') {
      activeTable = TIMETABLE_B;
      sectionLabel = 'Section B';
    }
  }

  const rows = Object.entries(activeTable).map(([time, classes]) => {
    if (classes[0] === 'LUNCH') {
      return `<div class="tt-time" style="font-size:11px">${time}</div>${[0, 1, 2, 3, 4].map(() => '<div class="tt-cell" style="background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text3)">Lunch</div>').join('')}`;
    }
    return `<div class="tt-time">${time}</div>${classes.map((c, i) => {
      if (!c) return `<div class="tt-cell"><div class="tt-class free">Free</div></div>`;
      const isCancelled = cancelledClasses[c + '_' + DAYS[i]];
      const isToday = i === TODAY_DAY;
      return `<div class="tt-cell"><div class="tt-class ${isCancelled ? 'cancelled-class' : isToday ? 'active-class' : ''}">${c}${isCancelled ? ' 🚫' : ''}</div></div>`;
    }).join('')}`;
  }).join('');

  return `<div class="page active">
    <div class="page-title">Weekly Timetable</div>
    <div class="page-sub">B.Tech CS Sem 3 ${sectionLabel} — ${getTodayLabel()}</div>
    <div class="alert-banner info" style="margin-bottom:16px">
      <div class="icon">ℹ️</div>
      <div class="alert-text"><strong>${TODAY_DAY === -1 ? "It's the weekend" : 'Today is ' + DAYS[TODAY_DAY]}</strong><span>Classes highlighted in blue are today's classes. Classes marked 🚫 are cancelled.</span></div>
    </div>
    <div class="section-card" style="padding:0;overflow:hidden">
      <div class="timetable">
        <div class="tt-header">Time</div>
        ${DAYS.map((d, i) => `<div class="tt-header" style="${i === TODAY_DAY ? 'background:var(--primary-dark)' : ''}">${d}</div>`).join('')}
        ${rows}
      </div>
    </div>
    <div style="margin-top:12px;display:flex;gap:16px;font-size:12px;color:var(--text3)">
      <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:var(--primary-light);display:inline-block"></span>Today</span>
      <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:3px;background:var(--red-bg);display:inline-block"></span>Cancelled</span>
    </div>
  </div>`;
}

// ── PAGE: CANCEL CLASS ────────────────────────────────────────────────────────

function renderCancel() {
  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Teacher';
  return `<div class="page active">
    <div class="page-title">Cancel a Class</div>
    <div class="page-sub">Students will be notified immediately when you cancel a class</div>
    <div class="section-card">
      <h3>Cancel Today's Class</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Subject</label>
          <select id="cancel-subject">${SUBJECTS.map(s => `<option>${s}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>Day</label>
          <select id="cancel-day">${DAYS.map((d, i) => `<option value="${i}" ${i === TODAY_DAY ? 'selected' : ''}>${d}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label>Reason (optional)</label>
          <input type="text" id="cancel-reason" placeholder="e.g. Faculty on leave, Emergency meeting..." />
        </div>
      </div>
      <button class="btn btn-red" onclick="cancelClass()">🚫 Cancel This Class & Notify Students</button>
    </div>
    <div class="section-card">
      <h3>Currently Cancelled Classes</h3>
      ${Object.keys(cancelledClasses).length === 0 ? '<div class="empty-state"><div class="icon">✅</div><p>No cancelled classes</p></div>' :
      Object.entries(cancelledClasses).map(([key]) => {
        const [subj, day] = key.split('_');
        return `<div class="cancel-class-item">
            <div><div style="font-size:14px;font-weight:600">${subj}</div><div style="font-size:12px;color:var(--text3)">${day} · Students notified</div></div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="badge cancelled">Cancelled</span>
              <button class="btn btn-sm btn-outline" onclick="restoreClass('${key}')">Restore</button>
            </div>
          </div>`;
      }).join('')}
    </div>
  </div>`;
}

async function cancelClass() {
  const subj = document.getElementById('cancel-subject').value;
  const dayIdx = parseInt(document.getElementById('cancel-day').value);
  const day = DAYS[dayIdx];
  const reason = document.getElementById('cancel-reason').value.trim();
  const key = `${subj}_${day}`;

  const record = {
    subject: subj,
    day: day,
    reason: reason || '',
    cancelledBy: currentUser.name,
    cancelledAt: new Date().toISOString()
  };

  try {
    await window.setDoc(window.doc(window.db, "CancelledClasses", key), record);
    cancelledClasses[key] = true;

    const newNotif = {
      title: 'Class Cancelled',
      body: `${subj} on ${day} has been cancelled by ${currentUser.name}.`,
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: 'cancel',
      read: false
    };

    const docRef = await window.addDoc(window.collection(window.db, "Notifications"), newNotif);
    NOTIFICATIONS.unshift({ id: docRef.id, ...newNotif });
    showToast(`${subj} cancelled. Students notified! ✓`);
  } catch (error) {
    console.error("Error cancelling class: ", error);
    showToast(`Failed to cancel class. Try again.`, true);
  }

  navigate('cancel');
}

async function restoreClass(key) {
  try {
    await window.deleteDoc(window.doc(window.db, "CancelledClasses", key));
    delete cancelledClasses[key];
    showToast('Class restored successfully ✓');
  } catch (error) {
    console.error("Error restoring class: ", error);
    showToast('Failed to restore class. Try again.', true);
  }
  navigate('cancel');
}

// ── PAGE: COMPLAINTS ──────────────────────────────────────────────────────────

function renderComplaints() {
  const isStudent = currentUser.role === 'student';
  const myComplaints = isStudent ? COMPLAINTS.filter(c => c.by === currentUser.name) : COMPLAINTS;
  const sortedComplaints = isStudent ? myComplaints : [...myComplaints].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

  return `<div class="page active">
    <div class="page-title">${isStudent ? 'My Complaints' : 'Manage Complaints'}</div>
    <div class="page-sub">${myComplaints.length} complaint${myComplaints.length !== 1 ? 's' : ''} ${isStudent ? 'filed by you' : 'submitted by students — sorted by upvotes'}</div>
    ${isStudent ? `
    <div class="section-card">
      <h3>Submit a New Complaint</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Subject / Title</label>
          <input type="text" id="c-title" placeholder="Brief description of the issue" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="c-cat"><option>Academic</option><option>Infrastructure</option><option>Behavioural</option><option>Other</option></select>
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label>Detailed Description</label>
          <textarea id="c-detail" placeholder="Provide as much detail as possible..."></textarea>
        </div>
      </div>
      <button class="btn btn-blue" onclick="submitComplaint()">Submit Complaint</button>
    </div>` : ''}
    <div class="section-card">
      <h3>${isStudent ? 'Your Complaints' : 'All Complaints'}</h3>
      ${sortedComplaints.length === 0 ? '<div class="empty-state"><div class="icon">🎉</div><p>No complaints filed</p></div>' :
      sortedComplaints.map(c => {
        const alreadyUpvoted = (c.upvoters || []).includes(currentUser.name);
        const upvotes = c.upvotes || 0;
        const canUpvote = !isStudent || c.by !== currentUser.name;
        return `
          <div class="complaint-card">
            <div class="complaint-card-header">
              <h4>${c.subject}</h4>
              <div style="display:flex;align-items:center;gap:8px">
                ${canUpvote ? `
                <button class="upvote-btn ${alreadyUpvoted ? 'upvoted' : ''}" onclick="upvoteComplaint('${c.id}')">
                  👍 <span class="upvote-count">${upvotes}</span>
                </button>` : `<span style="font-size:12px;color:var(--text3)">👍 ${upvotes} upvotes</span>`}
                <span class="badge ${c.status}">${c.status === 'review' ? 'Under Review' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
              </div>
            </div>
            <p>${c.detail}</p>
            <div class="complaint-meta">
              <span>📁 ${c.category}</span>
              <span>👤 ${c.by}</span>
              <span>📅 ${c.date}</span>
            </div>
            ${!isStudent ? `<div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-sm btn-blue" onclick="updateComplaint('${c.id}','review')">Mark Under Review</button>
              <button class="btn btn-sm btn-green" onclick="updateComplaint('${c.id}','resolved')">Mark Resolved</button>
            </div>` : ''}
          </div>`;
      }).join('')}
    </div>
  </div>`;
}

function findSimilarComplaints(title, cat) {
  const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return COMPLAINTS.filter(c => {
    if (c.status === 'resolved') return false;
    const cTitle = (c.subject || '').toLowerCase();
    const sameCategory = c.category === cat;
    const wordMatch = titleWords.some(w => cTitle.includes(w));
    return sameCategory && wordMatch;
  });
}

function showSimilarPopup(similar, onUpvote, onSubmitAnyway) {
  const overlay = document.createElement('div');
  overlay.className = 'similar-popup';
  overlay.id = 'similar-popup';
  overlay.innerHTML = `
        <div class="similar-popup-box">
            <h3>⚠️ Similar Complaint Already Exists!</h3>
            <p>Yeh complaints pehle se hain. Upvote karke zyada log support dikhao — admin ko priority milegi.</p>
            <div class="similar-list">
                ${similar.map(c => `
                    <div class="similar-item">
                        <div class="similar-item-title">${c.subject}</div>
                        <div class="similar-item-meta">📁 ${c.category} &nbsp;👍 ${c.upvotes || 0} upvotes &nbsp;📅 ${c.date}</div>
                    </div>`).join('')}
            </div>
            <div class="popup-actions">
                <button class="btn btn-outline" id="popup-anyway">Submit Anyway</button>
                <button class="btn btn-blue" id="popup-upvote">👍 Upvote Similar</button>
            </div>
        </div>`;
  document.body.appendChild(overlay);
  document.getElementById('popup-upvote').onclick = () => { document.body.removeChild(overlay); onUpvote(); };
  document.getElementById('popup-anyway').onclick = () => { document.body.removeChild(overlay); onSubmitAnyway(); };
}

async function upvoteComplaint(id) {
  const c = COMPLAINTS.find(x => x.id === id);
  if (!c) return;
  const upvoters = c.upvoters || [];
  if (upvoters.includes(currentUser.name)) {
    showToast('Aap pehle se upvote kar chuke ho!', true);
    return;
  }
  const newUpvotes = (c.upvotes || 0) + 1;
  const newUpvoters = [...upvoters, currentUser.name];
  try {
    await window.updateDoc(window.doc(window.db, "Complaints", id), {
      upvotes: newUpvotes,
      upvoters: newUpvoters
    });
    c.upvotes = newUpvotes;
    c.upvoters = newUpvoters;
    showToast('Upvoted! 👍');
    navigate('complaints');
  } catch (err) {
    console.error(err);
    showToast('Upvote failed. Try again.', true);
  }
}

async function submitComplaint() {
  const title = document.getElementById('c-title').value.trim();
  const cat = document.getElementById('c-cat').value;
  const detail = document.getElementById('c-detail').value.trim();
  if (!title || !detail) { showToast('Please fill in all fields', true); return; }

  const similar = findSimilarComplaints(title, cat);
  if (similar.length > 0) {
    showSimilarPopup(
      similar,
      () => { upvoteComplaint(similar[0].id); },
      () => doSubmitComplaint(title, cat, detail)
    );
    return;
  }
  await doSubmitComplaint(title, cat, detail);
}

async function doSubmitComplaint(title, cat, detail) {
  const newComplaint = {
    by: currentUser.name,
    subject: title,
    category: cat,
    detail,
    status: 'pending',
    upvotes: 0,
    upvoters: [],
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };
  try {
    const docRef = await window.addDoc(window.collection(window.db, "Complaints"), newComplaint);
    COMPLAINTS.unshift({ id: docRef.id, ...newComplaint });
    showToast('Complaint submitted successfully ✓');
    navigate('complaints');
  } catch (error) {
    console.error("Error submitting complaint: ", error);
    showToast('Failed to submit complaint. Try again.', true);
  }
}

async function updateComplaint(id, status) {
  const c = COMPLAINTS.find(x => x.id === id);
  if (!c) return;

  try {
    await window.updateDoc(window.doc(window.db, "Complaints", id), { status });
    c.status = status;
    showToast(`Complaint marked as "${status}" ✓`);
    navigate('complaints');
  } catch (error) {
    console.error("Error updating complaint: ", error);
    showToast('Failed to update complaint. Try again.', true);
  }
}

// ── PAGE: PROFILE ─────────────────────────────────────────────────────────────

function renderProfile() {
  const rollNo = currentUser.email; // yahan roll number store hota hai
  const s = STUDENTS.find(stu => String(stu.roll) === String(rollNo));
  const avg = getOverallAttendance(currentUser.roll);

  return `<div class="page active">
    <div class="page-title">My Profile</div>
    <div class="page-sub">Personal information and academic record</div>
    <div class="section-card">
      <div class="profile-header">
        <div class="profile-avatar" style="background:${s.color}">${s.avatar}</div>
        <div>
          <div class="profile-name">${s.name}</div>
          <div class="profile-sub">${s.class}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <span class="badge student">Student</span>
            <span class="badge info">${s.roll}</span>
          </div>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:14px; background-color:#8095e9; color:#041a74" onclick="showChangePasswordForm()">🔒 Change Password</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${[['Email', s.email || 'Not set'], ['Phone', '+91 90*** ***01'], ['Department', 'Computer Engg.'], ['Semester', '3rd Semester'], ['Section', `Section ${getStudentSection(s.roll)}`], ['Advisor', 'Prof. Divya']].map(([l, v]) => `
          <div>
            <div style="font-size:12px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">${l}</div>
            <div style="font-size:14px;font-weight:500">${v}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="cards-grid">
      <div class="stat-card blue"><div class="label">Overall Attendance</div><div class="value">${avg}%</div></div>
      <div class="stat-card green"><div class="label">Subjects</div><div class="value">${SUBJECTS.length}</div></div>
      <div class="stat-card amber"><div class="label">Complaints</div><div class="value">${COMPLAINTS.filter(c => c.by === s.name).length}</div></div>
    </div>
    <div class="section-card">
      <h3>Enrolled Subjects</h3>
      <table>
        <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
        <tbody>
          ${SUBJECTS.map(sub => {
    const d = getAttendanceStats(currentUser.email, sub);
    const color = d.pct >= 85 ? 'var(--green)' : d.pct >= 75 ? 'var(--amber)' : 'var(--red)';
    return `<tr><td style="font-weight:500">${sub}</td><td style="color:var(--green)">${d.present}</td><td style="color:var(--red)">${d.absent}</td><td><span style="font-weight:700;color:${color}">${d.pct}%</span></td></tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── PAGE: PYQ ─────────────────────────────────────────────────────────────────

window.PYQS = window.PYQS || [];

function renderPYQ() {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'teacher';

  return `<div class="page active">
    <div class="page-title">PYQ Papers 📄</div>
    <div class="page-sub">Previous Year Question Papers — Filter by Semester & Year</div>

    ${isAdmin ? `
    <div class="section-card">
      <h3>Upload New PYQ</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Subject Name</label>
          <input type="text" id="pyq-subject" placeholder="e.g. Data Structures" />
        </div>
        <div class="form-group">
          <label>Semester</label>
          <select id="pyq-sem">
            ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}" ${s == 3 ? 'selected' : ''}>Sem ${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Exam Year</label>
          <select id="pyq-year">
            ${[2025, 2024, 2023, 2022, 2021, 2020].map(y => `<option value="${y}">${y}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top:10px">
        <label>PDF File</label>
        <input type="file" id="pyq-file" accept=".pdf"
          style="padding:8px;border:1.5px dashed var(--border);border-radius:8px;width:100%;cursor:pointer;background:var(--bg2)" />
      </div>
      <div id="pyq-upload-progress" style="display:none;margin-top:10px">
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">
          Uploading... <span id="pyq-pct">0</span>%
        </div>
        <div class="progress-bar" style="height:8px">
          <div class="progress-fill" id="pyq-progress-fill" style="width:0%;background:var(--blue)"></div>
        </div>
      </div>
      <button class="btn btn-blue" style="margin-top:14px" onclick="uploadPYQ()">
        📤 Upload PYQ
      </button>
      <div id="pyq-msg" style="margin-top:10px;font-size:13px"></div>
    </div>` : ''}

    <div class="section-card">
      <h3>Browse PYQs</h3>
      <div class="form-row" style="margin-bottom:16px">
        <div class="form-group">
          <label>Filter by Semester</label>
          <select id="pyq-filter-sem" onchange="filterPYQs()">
            <option value="">All Semesters</option>
            ${[1, 2, 3, 4, 5, 6, 7, 8].map(s =>
    `<option value="${s}" ${s == 3 ? 'selected' : ''}>Sem ${s}</option>`
  ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Filter by Year</label>
          <select id="pyq-filter-year" onchange="filterPYQs()">
            <option value="">All Years</option>
            ${[2025, 2024, 2023, 2022, 2021, 2020].map(y =>
    `<option value="${y}">${y}</option>`
  ).join('')}
          </select>
        </div>
      </div>
      <div id="pyq-list">${buildPYQList('3', '')}</div>
    </div>
  </div>`;
}

function buildPYQList(semFilter = '3', yearFilter = '') {
  const list = (window.PYQS || []).filter(p => {
    const semMatch = !semFilter || String(p.sem) === String(semFilter);
    const yearMatch = !yearFilter || String(p.year) === String(yearFilter);
    return semMatch && yearMatch;
  });

  list.sort((a, b) => a.subject.localeCompare(b.subject) || (b.year - a.year));//Alphabetical sorting

  if (list.length === 0) {
    return `<div class="empty-state">
          <div class="icon">📂</div>
          <p>No PYQs found for selected filters</p>
        </div>`;
  }

  return list.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:#fee2e2;border-radius:10px;
                    display:flex;align-items:center;justify-content:center;font-size:20px">📄</div>
        <div>
          <div style="font-size:14px;font-weight:600">${p.subject}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">
            Sem ${p.sem} · Year ${p.year} · By ${p.uploadedBy}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${currentUser.role === 'admin' ? `
          <button class="btn btn-sm btn-outline" style="color:var(--red)"
            onclick="deletePYQ('${p.id}','${p.publicId}')">🗑️</button>` : ''}
        <a href="${p.url}" target="_blank">
          <button class="btn btn-sm btn-blue">⬇️ Download</button>
        </a>
      </div>
    </div>`).join('');
}

function filterPYQs() {
  const sem = document.getElementById('pyq-filter-sem').value;
  const year = document.getElementById('pyq-filter-year').value;
  document.getElementById('pyq-list').innerHTML = buildPYQList(sem, year);
}

async function uploadPYQ() {
  const subject = document.getElementById('pyq-subject').value.trim();
  const sem = document.getElementById('pyq-sem').value;
  const year = document.getElementById('pyq-year').value;
  const file = document.getElementById('pyq-file').files[0];
  const msgDiv = document.getElementById('pyq-msg');

  if (!subject) { showToast('Subject name daalo', true); return; }
  if (!file) { showToast('PDF file select karo', true); return; }
  if (file.type !== 'application/pdf') { showToast('Sirf PDF allowed hai', true); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('File 10MB se chhoti honi chahiye', true); return; }

  // Cloudinary upload via fetch (no SDK needed!)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'pyq_upload');
  formData.append('resource_type', 'raw');

  document.getElementById('pyq-upload-progress').style.display = 'block';
  msgDiv.textContent = '';

  // Progress simulation (Cloudinary fetch doesn't give real progress)
  let fakeP = 0;
  const fakeInterval = setInterval(() => {
    fakeP = Math.min(fakeP + 10, 90);
    document.getElementById('pyq-pct').textContent = fakeP;
    document.getElementById('pyq-progress-fill').style.width = fakeP + '%';
  }, 300);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dhdxrb98h/raw/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();

    clearInterval(fakeInterval);

    if (data.error) {
      showToast('Upload failed: ' + data.error.message, true);
      document.getElementById('pyq-upload-progress').style.display = 'none';
      return;
    }

    document.getElementById('pyq-pct').textContent = '100';
    document.getElementById('pyq-progress-fill').style.width = '100%';

    const pyqData = {
      subject,
      sem: Number(sem),
      year: Number(year),
      url: data.secure_url,
      publicId: data.public_id,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toLocaleDateString('en-GB')
    };

    const docRef = await window.addDoc(
      window.collection(window.db, "PYQs"), pyqData
    );
    window.PYQS.unshift({ id: docRef.id, ...pyqData });

    showToast('PYQ uploaded successfully ✓');
    setTimeout(() => navigate('pyq'), 800);

  } catch (err) {
    clearInterval(fakeInterval);
    console.error(err);
    showToast('Upload failed. Internet check karo.', true);
    document.getElementById('pyq-upload-progress').style.display = 'none';
  }
}

async function deletePYQ(id, publicId) {
  if (!confirm('Yeh PYQ delete karna chahte ho?')) return;
  try {
    await window.deleteDoc(window.doc(window.db, "PYQs", id));
    window.PYQS = window.PYQS.filter(p => p.id !== id);
    showToast('PYQ deleted ✓');
    navigate('pyq');
  } catch (e) {
    console.error(e);
    showToast('Delete failed', true);
  }
}

function showChangePasswordForm() {
  const content = document.getElementById('main-content');
  content.innerHTML = `<div class="page active">
    <div class="page-title">Change Password</div>
    <div class="page-sub">Update your account password</div>
    <div class="section-card">
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" id="cp-old">
      </div>
      <br>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" id="cp-new">
      </div>
      <br>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" id="cp-confirm">
      </div>
      <br>
      <button class="btn btn-blue" onclick="changePassword()">Update Password</button>
      <button class="btn btn-outline" onclick="navigate('profile')">Cancel</button>
    </div>
  </div>`;
}

async function changePassword() {
  const oldPass = document.getElementById('cp-old').value.trim();
  const newPass = document.getElementById('cp-new').value.trim();
  const confirmPass = document.getElementById('cp-confirm').value.trim();

  if (!oldPass || !newPass || !confirmPass) {
    showToast("Fill all fields", true);
    return;
  }

  if (newPass !== confirmPass) {
    showToast("New passwords do not match", true);
    return;
  }

  if (newPass.length < 6) {
    showToast("New password must be at least 6 characters", true);
    return;
  }

  const user = window.firebaseAuth.currentUser;
  if (!user) {
    showToast("Session expired. Please log in again.", true);
    return;
  }

  try {
    // Firebase requires re-authentication with the old password before allowing a password change
    const credential = window.EmailAuthProvider.credential(user.email, oldPass);
    await window.reauthenticateWithCredential(user, credential);

    await window.updatePassword(user, newPass);

    showToast("Password updated successfully ✓");
    navigate('profile');
  } catch (error) {
    console.error("Error updating password: ", error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      showToast("Current password is incorrect", true);
    } else {
      showToast("Failed to update password. Try again.", true);
    }
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--red)' : 'var(--green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// 🟢 PAGE REFRESH PAR AUTO-LOGIN RESTORE KARNE KE LIYE CODE
(function checkSavedSession() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    // DOM parse hone ka wait karke UI restore karega
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loginSuccess);
    } else {
      loginSuccess();
    }
  }
})();
