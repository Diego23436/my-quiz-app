import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInStudent, signInTeacherAdmin } from "../../utils/authUtils";
import { isTeacherOrAdmin } from "../../config/authConfig";
import "./Auth.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Check if this is a teacher/admin email
    if (isTeacherOrAdmin(email)) {
      const result = await signInTeacherAdmin(email, password);
      if (result.success) {
        // Redirect based on role
        if (result.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/teacher");
        }
      } else {
        setError(result.error || "Sign in failed");
      }
    } else {
      // Student sign in
      const result = await signInStudent(email, password);
      if (result.success) {
        // Store user data in localStorage for quick access
        localStorage.setItem("studentUser", JSON.stringify(result.user));
        localStorage.setItem("uid", result.uid);
        navigate("/quiz");
      } else {
        setError(result.error || "Sign in failed");
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign In</h2>
        <p className="auth-subtitle">Welcome back to LEADEX EDUCATION</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignIn}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <p className="auth-text">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="auth-link"
            disabled={loading}
          >
            Create one
          </button>
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="auth-back-button"
          disabled={loading}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default SignIn;
