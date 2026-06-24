// ── DATA ──────────────────────────────────────────────────────────────────────

// Admin/Teacher accounts are now authenticated via Firebase Auth (see STATIC_EMAIL_MAP below)
let currentUser = null;
window.STUDENTS = [];

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
    const total = present + absent; // Late ignore — aapke decision ke mutabik
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
        { id: 'attendance', label: 'Attendance', icon: 'check' },
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

async function waitForStudents(maxWaitMs = 4000) {
  const start = Date.now();
  while ((!window.STUDENTS || window.STUDENTS.length === 0) && (Date.now() - start) < maxWaitMs) {
    await new Promise(r => setTimeout(r, 150));
  }
}

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

    // 1. Resolve roll number -> email
    let emailToUse = null;

  if (STATIC_EMAIL_MAP[rollInput]) {
    emailToUse = STATIC_EMAIL_MAP[rollInput];
  } else {
    if (!window.STUDENTS || window.STUDENTS.length === 0) {
      await waitForStudents();
    }
    const dbStudent = window.STUDENTS.find(student => String(student.roll) === rollInput);
    if (dbStudent && dbStudent.email) {
      emailToUse = dbStudent.email;
    }
  }

    if (!emailToUse) {
        errorDiv.textContent = "Invalid roll number or password. Try again.";
        errorDiv.style.display = 'block';
        return;
    }

    // 2. Authenticate with Firebase Auth
    window.signInWithEmailAndPassword(window.firebaseAuth, emailToUse, passInput)
        .then((userCredential) => {
            const uid = userCredential.user.uid;

            if (rollInput === '13141516') {
                currentUser = { email: rollInput, uid, role: 'admin', name: 'Team Project', initials: 'TP', color: '#5b21b6' };
            } else if (rollInput === '123456789') {
                currentUser = { email: rollInput, uid, role: 'teacher', name: 'Miss Divya', initials: 'MD', color: '#9d174d' };
            } else {
                const dbStudent = window.STUDENTS.find(student => String(student.roll) === rollInput);
                currentUser = {
                    email: rollInput,
                    uid,
                    role: 'student',
                    name: dbStudent.name,
                    initials: dbStudent.avatar || dbStudent.name.split(" ").map(x => x[0]).join("").toUpperCase(),
                    color: dbStudent.color || '#3b5bdb'
                };
            }

            loginSuccess();
        })
        .catch((error) => {
            console.error('Login error:', error.code, error.message);
            errorDiv.textContent = "Invalid roll number or password. Try again.";
            errorDiv.style.display = 'block';
        });
}

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

function navigate(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');
    const titles = {
        dashboard: 'Dashboard', notifications: 'Notifications', students: 'Students',
        attendance: currentUser?.role === 'student' ? 'My Attendance' : 'Attendance',
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
        attendance: renderAttendance,
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
    const cancelled = Object.keys(cancelledClasses).length;

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
        <div class="stat-card amber"><div class="label">Complaints</div><div class="value">${COMPLAINTS.filter(c => c.by === 'Arjun Mehta').length}</div><div class="sub">Filed by you</div></div>
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
        return `
    <div class="page active">
      <div class="page-title">Welcome, Divya! 👩‍🏫</div>
      <div class="page-sub">${getTodayLabel()} — Class overview</div>
      <div class="cards-grid">
        <div class="stat-card blue"><div class="label">My Students</div><div class="value">${STUDENTS.length}</div><div class="sub">Active this semester</div></div>
        <div class="stat-card green"><div class="label">Subjects</div><div class="value">${SUBJECTS.length}</div><div class="sub">Teaching this term</div></div>
        <div class="stat-card amber"><div class="label">Pending Complaints</div><div class="value">${COMPLAINTS.filter(c => c.status === 'pending').length}</div><div class="sub">Require attention</div></div>
        <div class="stat-card red"><div class="label">Cancelled Today</div><div class="value">${cancelled}</div><div class="sub">Classes cancelled</div></div>
      </div>
      <div class="section-card">
        <h3>Today's Classes — ${TODAY_DAY === -1 ? 'Weekend' : DAYS[TODAY_DAY]}</h3>
        ${SUBJECTS.slice(0, 3).map(s => {
          const cancelled = TODAY_DAY !== -1 && cancelledClasses[s + '_' + DAYS[TODAY_DAY]];
            return `<div class="cancel-class-item">
            <div><div style="font-size:14px;font-weight:600">${s}</div><div style="font-size:12px;color:var(--text3)">Room 201 · 50 students</div></div>
            <div style="display:flex;gap:8px;align-items:center">
              ${isCancelled ? '<span class="badge cancelled">Cancelled</span>' : '<span class="badge present">Scheduled</span>'}
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
        <h3>All Complaints</h3>
        <table>
          <thead><tr><th>Student</th><th>Subject</th><th>Category</th><th>Status</th></tr></thead>
          <tbody>
            ${COMPLAINTS.map(c => `
              <tr>
                <td>${c.by}</td>
                <td style="max-width:220px">${c.subject}</td>
                <td><span class="badge info">${c.category}</span></td>
                <td><span class="badge ${c.status}">${c.status}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
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
    return `<div class="page active">
    <div class="page-title">${currentUser.role === 'teacher' ? 'My Students' : 'All Students'}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <div class="page-sub">Admin & Teacher can add students here<br>${STUDENTS.length} students enrolled · B.Tech CS Sem 3</div>
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
          ${[...STUDENTS].sort((a, b) => Number(a.roll) - Number(b.roll)).map(s => {
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

    await window.loadStudents(); //list ko firestore se dobara frtch krne ke liye

    showToast("Student added to records. Ask admin to create their login (Auth account) separately.");

    navigate("students");
}
function renderAddStudent() {
    return }

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
          <select id="att-group" onchange="renderAttTable()">
            <option value="1">Group 1 </option>
            <option value="2">Group 2 </option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Subject</label>
          <select id="att-subject" onchange="renderAttTable()">
            ${SUBJECTS.map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="att-date" value="${todayStr}" onchange="renderAttTable()" />
        </div>
      </div>
    </div>
    <div class="section-card" id="att-table-wrap">
      <h3>Students — <span id="att-subject-label">${SUBJECTS[0]}</span></h3>
      <div id="att-rows"></div>
      <div style="margin-top:16px;display:flex;gap:10px">
        <button class="btn btn-green" onclick="saveAttendance()">Save Attendance</button>
        <button class="btn btn-outline" onclick="markAll('p')">Mark All Present</button>
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

  renderAttTable();
}

function markAtt(rollNo, status, btn) {
    todayAttendanceDraft[rollNo] = status;
    const row = btn.closest('.att-btns');
    row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function markAll(status) {
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

    return `<div class="page active">
    <div class="page-title">${isStudent ? 'My Complaints' : 'Manage Complaints'}</div>
    <div class="page-sub">${myComplaints.length} complaint${myComplaints.length !== 1 ? 's' : ''} ${isStudent ? 'filed by you' : 'submitted by students'}</div>
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
      ${myComplaints.length === 0 ? '<div class="empty-state"><div class="icon">🎉</div><p>No complaints filed</p></div>' :
        myComplaints.map(c => `
          <div class="complaint-card">
            <div class="complaint-card-header">
              <h4>${c.subject}</h4>
              <span class="badge ${c.status}">${c.status === 'review' ? 'Under Review' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
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
          </div>`).join('')}
    </div>
  </div>`;
}

async function submitComplaint() {
    const title = document.getElementById('c-title').value.trim();
    const cat = document.getElementById('c-cat').value;
    const detail = document.getElementById('c-detail').value.trim();
    if (!title || !detail) { showToast('Please fill in all fields', true); return; }

    const newComplaint = {
        by: currentUser.name,
        subject: title,
        category: cat,
        detail,
        status: 'pending',
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
