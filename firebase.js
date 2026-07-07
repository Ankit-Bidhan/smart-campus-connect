// ── FIREBASE SETUP ──────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const authInstance = getAuth(app);
const storage = getStorage(app);
window.storage = storage;

window.db = db;
window.addDoc = addDoc;
window.collection = collection;
window.doc = doc;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.query = query;
window.where = where;
window.setDoc = setDoc;
window.sendPasswordResetEmail = sendPasswordResetEmail;
// Cloudinary config
window.CLOUDINARY_CLOUD_NAME = 'dhdxrb98h';
window.CLOUDINARY_UPLOAD_PRESET = 'pyq_upload';

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
// ⚠️ NOTE: loadStudents() is intentionally NOT called here anymore.
// Previously it ran the moment this file loaded — before any login check —
// so anyone who simply opened the site (no login needed) could see the full
// Students collection in window.STUDENTS via the console. Now it only runs
// after Firebase Auth confirms a signed-in user (see onAuthStateChanged below),
// same pattern as Complaints/Notifications/Attendance already used.

// load teachers from firestore (full profiles — only after login, same reasoning as above)
async function loadTeachers() {
    try {
        const querySnapshot = await getDocs(collection(db, "Teachers"));

        window.TEACHERS = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("👩‍🏫 Teachers loaded from Firestore:", window.TEACHERS);

        if (typeof renderTeachers === "function" && document.getElementById("teachers-list")) {
            renderTeachers();
        }
    } catch (error) {
        console.error("Error loading teachers: ", error);
    }
}
window.loadTeachers = loadTeachers;

// ── Public login lookup (roll -> email) ──────────────────────────────────────
// This reads ONE document from a small "RollIndex" collection (doc id = roll
// number, only field = email). It is the ONLY thing allowed to be read before
// login, and it only ever returns the single roll requested — never the whole
// list — so a console-snooper can no longer dump everyone's data at once.
async function lookupEmailByRoll(roll) {
    try {
        const snap = await getDoc(doc(db, "RollIndex", String(roll)));
        return snap.exists() ? snap.data().email : null;
    } catch (error) {
        console.error("Error looking up roll in RollIndex: ", error);
        return null;
    }
}
window.lookupEmailByRoll = lookupEmailByRoll;

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

// Signal that firebase.js has finished setting up window.firebaseAuth etc.
window.dispatchEvent(new Event('firebase-ready'));

// ── Load all Firestore-backed data, but ONLY after a user is authenticated ──
let dataLoadedOnce = false;

onAuthStateChanged(authInstance, (user) => {
    if (user) {
        if (!dataLoadedOnce) {
            dataLoadedOnce = true;
            Promise.all([
                loadStudents(),
                loadTeachers(),
                loadComplaints(),
                loadNotifications(),
                loadAttendance(),
                loadCancelledClasses(),
                loadPYQs()
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
