import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAy02pLzQ3t5FnwsZ7Hxb7H9aju-a7Lf1o',
  authDomain: 'mastermind-b7b4c.firebaseapp.com',
  projectId: 'mastermind-b7b4c',
  storageBucket: 'mastermind-b7b4c.firebasestorage.app',
  messagingSenderId: '848023061940',
  appId: '1:848023061940:web:548088b00aae38401b5ee1',
  measurementId: 'G-L4S92B2SSL',
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
