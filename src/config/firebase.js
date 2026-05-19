// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your exact web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKzwUVejyOv9RqWj88emSB6xXRMp49LXY",
  authDomain: "brewly-7eb15.firebaseapp.com",
  projectId: "brewly-7eb15",
  storageBucket: "brewly-7eb15.firebasestorage.app",
  messagingSenderId: "363437730542",
  appId: "1:363437730542:web:47b4127f98857981bfa1ff",
  measurementId: "G-46D4SGV8Z1",
};

// Initialize the core Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Auth and Database, and EXPORT them for the rest of the app to use
export const auth = getAuth(app);
export const db = getFirestore(app);
