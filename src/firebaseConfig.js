import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbxXFIh7Gl89A3ZMmBFJ3ZpHBcy6CaTho",
  authDomain: "leadex-quiz.firebaseapp.com",
  projectId: "leadex-quiz",
  storageBucket: "leadex-quiz.firebasestorage.app",
  messagingSenderId: "462317123313",
  appId: "1:462317123313:web:00dfdaf968772fe0881b50",
  measurementId: "G-RZJH29KTX4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // For Teacher/Admin login
export const db = getFirestore(app); // For Questions and Results