import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let auth = null;
let googleProvider = null;
let isFirebaseConfigured = false;

// Check if configuration keys are defined
if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    isFirebaseConfigured = true;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.warn(
    "Firebase environment variables are missing. " +
    "Please add VITE_FIREBASE_* variables to your .env file to enable Firebase Authentication."
  );
}

export { auth, googleProvider, isFirebaseConfigured };
