/**
 * Authentication Utility Functions
 * Handles Firebase authentication for students
 * Teacher/Admin uses Firebase Auth directly with hardcoded credentials
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { verifyCredentials } from "../config/authConfig";

/**
 * Register a new student user
 * @param {string} email - Student email
 * @param {string} password - Student password
 * @param {object} userData - Additional user data (name, school, series, etc.)
 * @returns {Promise<object>} User object or error
 */
export const registerStudent = async (email, password, userData) => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Send verification email
    // Note: Firebase automatically sends verification email after signup
    // You can also manually call sendEmailVerification if needed

    // Store user data in Firestore
    await setDoc(doc(db, "users", uid), {
      email: email.toLowerCase(),
      name: userData.name,
      school: userData.school,
      town: userData.town,
      series: userData.series,
      phone: userData.phone,
      role: "user", // Student role
      createdAt: new Date().toISOString(),
      emailVerified: false,
    });

    return {
      success: true,
      uid: uid,
      message: "Registration successful! Please check your email to verify your account.",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sign in a student user
 * @param {string} email - Student email
 * @param {string} password - Student password
 * @returns {Promise<object>} User object or error
 */
export const signInStudent = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Get user data from Firestore
    const userDocSnap = await getDoc(doc(db, "users", uid));
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return {
        success: true,
        uid: uid,
        user: userData,
        emailVerified: userCredential.user.emailVerified,
      };
    } else {
      return {
        success: false,
        error: "User data not found",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sign in a teacher or admin user
 * Uses hardcoded credentials from authConfig
 * @param {string} email - Teacher/Admin email
 * @param {string} password - Teacher/Admin password
 * @returns {Promise<object>} User object or error
 */
export const signInTeacherAdmin = async (email, password) => {
  try {
    // Verify against hardcoded credentials
    const user = verifyCredentials(email, password);
    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Attempt Firebase Auth login (for consistency)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        uid: userCredential.user.uid,
        user: user,
        role: user.role,
      };
    } catch (authError) {
      // If not in Firebase Auth, still return success with hardcoded credentials
      // This is for teacher/admin accounts that might not be in Firebase Auth yet
      return {
        success: true,
        uid: null, // No UID for hardcoded users
        user: user,
        role: user.role,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<object>} Success or error
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sign out user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
};

/**
 * Get current user from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<object>} User data or null
 */
export const getUserData = async (uid) => {
  try {
    const userDocSnap = await getDoc(doc(db, "users", uid));
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};
