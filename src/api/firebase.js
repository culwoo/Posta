// Real Firebase Adapter
// Re-exports actual Firebase SDK functions to replace the Mock Adapter.

import { initializeApp } from "firebase/app";
import {
    getAuth,
    connectAuthEmulator,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signInAnonymously
} from "firebase/auth";
import {
    getFirestore,
    connectFirestoreEmulator,
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit
} from "firebase/firestore";
import {
    getFunctions,
    connectFunctionsEmulator,
    httpsCallable
} from "firebase/functions";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-northeast3");
export const storage = getStorage(app);

const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Re-export Auth Functions
export {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signInAnonymously
};

// Re-export Firestore Functions
export {
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit
};

export { httpsCallable };

// Re-export Storage Functions
export { storageRef, uploadBytes, getDownloadURL, deleteObject };
