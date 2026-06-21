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

window.cancelledClasses = {}; // Firestore se loadCancelledClasses()
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
        { id: 'announce', label: 'Announcements', icon: 'megaphone' },
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
        { id: 'announce', label: 'Announcements', icon: 'megaphone' },
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
    };
    return icons[name] || '';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

// Static admin/teacher accounts now map roll -> placeholder email (real password lives in Firebase Auth)
const STATIC_EMAIL_MAP = {
    '13141516': 'admin@campusconnect.local',
    '123456789': 'divya.teacher@campusconnect.local',
};

function login() {
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
        announce: 'Announcements', profile: 'My Profile'
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
        announce: renderAnnounce,
        profile: renderProfile,
        addstudent: renderAddStudent,
    };
    content.innerHTML = (renders[page] || (() => '<div class="page active"><p>Coming soon</p></div>'))();
}

// ── PAGE: DASHBOARD ───────────────────────────────────────────────────────────

function renderDashboard() {
    const r = currentUser.role;
    const unread = NOTIFICATIONS.filter(n => !n.read).length;
    const cancelled = Object.keys(cancelledClasses).length;

    // Cancelled class alerts for today
    const alerts = Object.entries(cancelledClasses).map(([key]) => {
        const [subj, day] = key.split('_');
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
            const cancelled = cancelledClasses[s + '_Mon'];
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
            const isCancelled = cancelledClasses[s + '_Mon'];
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
    const totalAtt = Math.round(STUDENTS.reduce((a, b) => a + b.attendance, 0) / STUDENTS.length);
    return `
    <div class="page active">
      <div class="page-title">Admin Dashboard 🏛️</div>
      <div class="page-sub">${getTodayLabel()} — System overview</div>
      <div class="cards-grid">
        <div class="stat-card blue"><div class="label">Total Students</div><div class="value">${STUDENTS.length}</div><div class="sub">B.Tech CS Sem 3</div></div>
        <div class="stat-card green"><div class="label">Avg Attendance</div><div class="value">${totalAtt}%</div><div class="sub">Across all students</div></div>
        <div class="stat-card amber"><div class="label">Pending Complaints</div><div class="value">${COMPLAINTS.filter(c => c.status === 'pending').length}</div><div class="sub">Need resolution</div></div>
        <div class="stat-card red"><div class="label">Cancelled Classes</div><div class="value">${cancelled}</div><div class="sub">Today</div></div>
      </div>
      <div class="section-card">
        <h3>Students at Risk (Attendance &lt;75%)</h3>
        <table>
          <thead><tr><th>Student</th><th>Roll No.</th><th>Attendance</th><th>Status</th></tr></thead>
          <tbody>
            ${STUDENTS.filter(s => s.attendance < 80).map(s => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar" style="width:28px;height:28px;font-size:11px;background:${s.color}">${s.avatar}</div>${s.name}</div></td>
                <td>${s.roll}</td>
                <td><span style="font-weight:700;color:${s.attendance < 75 ? 'var(--red)' : 'var(--amber)'}">${s.attendance}%</span></td>
                <td><span class="badge ${s.attendance < 75 ? 'absent' : 'pending'}">${s.attendance < 75 ? 'Critical' : 'Warning'}</span></td>
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
            NOTIFICATIONS.map(n => `
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

  ${currentUser.role === 'admin' || 'teacher'
        ? `<button class="btn btn-blue" onclick="showAddStudentForm()">
         + Add Student
       </button>`
        : ''
        }
</div>
    <div class="section-card">
      <table>
        <thead><tr><th>Student</th><th>Roll No.</th><th>Attendance</th><th>Status</th>${currentUser.role === 'admin' ? '<th>Action</th>' : ''}</tr></thead>
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
              ${currentUser.role === 'admin' ? `<td><button class="btn btn-sm btn-outline">View</button></td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
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
    <div class="page-sub">Select subject and date, then mark attendance</div>
    <div class="section-card">
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
      <div id="att-rows">${buildAttRows()}</div>
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

    todayAttendanceDraft = {};
    STUDENTS.forEach(s => {
        const existing = window.ATTENDANCE.find(a =>
            String(a.rollNo) === String(s.roll) && a.subject === subj && a.date === date
        );
        todayAttendanceDraft[s.roll] = existing ? existing.status : 'p';
    });

  return [...STUDENTS].sort((a, b) => Number(a.roll) - Number(b.roll)).map(s => `
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

function markAtt(rollNo, status, btn) {
    todayAttendanceDraft[rollNo] = status;
    const row = btn.closest('.att-btns');
    row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function markAll(status) {
    STUDENTS.forEach(s => todayAttendanceDraft[s.roll] = status);
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

    try {
        const promises = STUDENTS.map(s => {
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
                    // update local cache so % recalculates immediately without a refetch
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

function renderTimetable() {
    const rows = Object.entries(TIMETABLE).map(([time, classes]) => {
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
    <div class="page-sub">B.Tech CS Sem 3 Section A — ${getTodayLabel()}</div>
    <div class="alert-banner info" style="margin-bottom:16px">
      <div class="icon">ℹ️</div>
      <div class="alert-text"><strong>${TODAY_DAY === -1 ? "It's the weekend" : 'Today is ' + DAYS[TODAY_DAY]}</strong><span>Classes highlighted in blue are today's classes. Classes marked 🚫 are cancelled.</span></div>
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

// ── PAGE: ANNOUNCEMENTS ───────────────────────────────────────────────────────

const announcements = [
    { id: 1, title: 'Mid-Semester Exam Schedule Released', body: 'Mid-semester exams will be held from 1st July to 8th July 2026. Individual timetables have been sent to your email. All students must carry their ID cards.', by: 'Dr. Anand Verma', role: 'Admin', date: '14 Jun 2026', pinned: true },
    { id: 2, title: 'Library Hours Extended', body: 'The central library will now remain open until 10 PM on weekdays for the exam preparation period. This is valid from 20 June to 10 July 2026.', by: 'Admin Office', role: 'Admin', date: '13 Jun 2026', pinned: false },
    { id: 3, title: 'Data Structures Assignment 3 Released', body: 'Assignment 3 covering Graph Algorithms has been uploaded to the portal. Submission deadline is 25th June 2026. Late submissions will not be accepted.', by: 'Riya Sharma', role: 'Teacher', date: '12 Jun 2026', pinned: false },
];

function renderAnnounce() {
    const canPost = currentUser.role !== 'student';
    return `<div class="page active">
    <div class="page-title">Announcements</div>
    <div class="page-sub">Important notices from teachers and administration</div>
    ${canPost ? `
    <div class="section-card">
      <h3>Post New Announcement</h3>
      <div class="form-row single"><div class="form-group"><label>Title</label><input type="text" id="ann-title" placeholder="Announcement heading" /></div></div>
      <div class="form-row single"><div class="form-group"><label>Message</label><textarea id="ann-body" placeholder="Write your announcement..."></textarea></div></div>
      <button class="btn btn-blue" onclick="postAnnouncement()">📢 Post Announcement</button>
    </div>` : ''}
    <div class="section-card">
      <h3>All Announcements</h3>
      ${announcements.map(a => `
        <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px;${a.pinned ? 'border-left:4px solid var(--primary)' : ''}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:15px;font-weight:600">${a.pinned ? '📌 ' : ''}${a.title}</div>
            <span class="badge ${a.role === 'Admin' ? 'admin' : 'teacher'}">${a.role}</span>
          </div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:10px;line-height:1.6">${a.body}</div>
          <div style="font-size:12px;color:var(--text3)">By ${a.by} · ${a.date}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

function postAnnouncement() {
    const title = document.getElementById('ann-title').value.trim();
    const body = document.getElementById('ann-body').value.trim();
    if (!title || !body) { showToast('Fill in title and message', true); return; }
    announcements.unshift({ id: Date.now(), title, body, by: currentUser.name, role: currentUser.role === 'admin' ? 'Admin' : 'Teacher', date: '15 Jun 2026', pinned: false });
    showToast('Announcement posted ✓');
    navigate('announce');
}

// ── PAGE: PROFILE ─────────────────────────────────────────────────────────────

function renderProfile() {
    const s = STUDENTS.find(stu => String(stu.roll) === String(currentUser.email)) || STUDENTS[0];
    const avg = getOverallAttendance(currentUser.email);

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
        ${[['Email', s.email || 'Not set'], ['Phone', '+91 90*** ***01'], ['Department', 'Computer Engg.'], ['Semester', '3rd Semester'], ['Section', 'Section A'], ['Advisor', 'Prof. Divya']].map(([l, v]) => `
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