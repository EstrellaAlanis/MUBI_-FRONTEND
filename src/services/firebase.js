import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBB-1JObyZpG0MytM6yexsuJQ6N0LQZz94",
  authDomain: "mubi-c96c0.firebaseapp.com",
  projectId: "mubi-c96c0",
  storageBucket: "mubi-c96c0.firebasestorage.app",
  messagingSenderId: "647010495125",
  appId: "1:647010495125:web:a6fef8c7d6db9a6c64899c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();