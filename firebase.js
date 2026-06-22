// ── FIREBASE SETUP ──────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8a44AQf81SY8fkvyKFV9gGsZ-X3ubgY4",
    authDomain: "smart-campus-connect-siet.firebaseapp.com",
    projectId: "smart-campus-connect-siet",
    storageBucket: "smart-campus-connect-siet.firebasestorage.app",
    messagingSenderId: "654877774859",
    appId: "1:654877774859:web:fef7926800f07400dbe30e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
window.storage = storage;
const authInstance = getAuth(app);

window.db = db;
window.addDoc = addDoc;
window.collection = collection;
window.doc = doc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.query = query;
window.where = where;
window.setDoc = setDoc;


// Auth exports for script.js to use
window.firebaseAuth = authInstance;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.reauthenticateWithCredential = reauthenticateWithCredential;
window.EmailAuthProvider = EmailAuthProvider;
window.updatePassword = updatePassword;

//load students from firestore
async function loadStudents() {
    try {
        const querySnapshot = await getDocs(collection(db, "Students"));

        window.STUDENTS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("📚 Students loaded from Firestore:", window.STUDENTS);

        if (typeof renderStudents === "function" && document.getElementById("students-list")) {
            renderStudents();
        }
    } catch (error) {
        console.error("Error loading students: ", error);
    }
}

window.loadStudents = loadStudents;
loadStudents();

async function loadComplaints() {
    try {
        const querySnapshot = await getDocs(collection(db, "Complaints"));

        window.COMPLAINTS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("📋 Complaints loaded from Firestore:", window.COMPLAINTS);

        if (typeof navigate === "function" && typeof currentUser !== "undefined" && currentUser && document.getElementById("main-content")) {
            navigate(currentPage);
        }
    } catch (error) {
        console.error("Error loading complaints: ", error);
    }
}

window.loadComplaints = loadComplaints;

async function loadNotifications() {
    try {
        const querySnapshot = await getDocs(collection(db, "Notifications"));

        window.NOTIFICATIONS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("🔔 Notifications loaded from Firestore:", window.NOTIFICATIONS);

        if (typeof navigate === "function" && typeof currentUser !== "undefined" && currentUser && document.getElementById("main-content")) {
            navigate(currentPage);
        }
    } catch (error) {
        console.error("Error loading notifications: ", error);
    }
}

window.loadNotifications = loadNotifications;

// load attendance from firestore
async function loadAttendance() {
    try {
        const querySnapshot = await getDocs(collection(db, "Attendance"));

        window.ATTENDANCE = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("🗓️ Attendance loaded from Firestore:", window.ATTENDANCE);

        if (typeof navigate === "function" && typeof currentUser !== "undefined" && currentUser && document.getElementById("main-content")) {
            navigate(currentPage);
        }
    } catch (error) {
        console.error("Error loading attendance: ", error);
    }
}

window.loadAttendance = loadAttendance;

// load cancelled classes from firestore
async function loadCancelledClasses() {
    try {
        const querySnapshot = await getDocs(collection(db, "CancelledClasses"));

        window.cancelledClasses = {};
        querySnapshot.docs.forEach(doc => {
            window.cancelledClasses[doc.id] = true;
        });

        console.log("🚫 Cancelled classes loaded from Firestore:", window.cancelledClasses);

        if (typeof navigate === "function" && typeof currentUser !== "undefined" && currentUser && document.getElementById("main-content")) {
            navigate(currentPage);
        }
    } catch (error) {
        console.error("Error loading cancelled classes: ", error);
    }
}

window.loadCancelledClasses = loadCancelledClasses;

async function loadPYQs() {
    try {
        const querySnapshot = await getDocs(collection(db, "PYQs"));
        window.PYQS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("📄 PYQs loaded:", window.PYQS);
    } catch (error) {
        console.error("Error loading PYQs: ", error);
    }
}
window.loadPYQs = loadPYQs;

async function loadAnnouncements() {
    try {
        const querySnapshot = await getDocs(collection(db, "Announcements"));

        window.ANNOUNCEMENTS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        window.ANNOUNCEMENTS.sort((a, b) => {
            if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        console.log("📢 Announcements loaded:", window.ANNOUNCEMENTS);

        if (typeof navigate === "function" && typeof currentUser !== "undefined" && currentUser && document.getElementById("main-content")) {
            navigate(currentPage);
        }
    } catch (error) {
        console.error("Error loading announcements: ", error);
    }
}

window.loadAnnouncements = loadAnnouncements;

// Signal that firebase.js has finished setting up window.firebaseAuth etc.
window.dispatchEvent(new Event('firebase-ready'));

// ── Load all Firestore-backed data, but ONLY after a user is authenticated ──
let dataLoadedOnce = false;

onAuthStateChanged(authInstance, (user) => {
    if (user) {
        if (!dataLoadedOnce) {
            dataLoadedOnce = true;
            Promise.all([
                loadComplaints(),
                loadNotifications(),
                loadAttendance(),
                loadCancelledClasses(),
                loadPYQs(),
                loadAnnouncements()
            ]).then(() => {
                window.dispatchEvent(new Event('firebase-data-ready'));
                if (typeof currentUser !== "undefined" && currentUser && typeof navigate === "function" && document.getElementById("main-content")) {
                    navigate(currentPage || 'dashboard');
                }
            });
        }
    } else {
        dataLoadedOnce = false;
    }
});

console.log("✅ Firebase connected successfully!", app.name);
