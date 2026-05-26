import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerStudent } from "../../utils/authUtils";
import { getAllSeries } from "../../config/seriesConfig";
import "./Auth.css";

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    school: "",
    town: "",
    series: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handlePhoneInput = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 9) val = val.slice(0, 9);
    let formatted = val;
    if (val.length > 3 && val.length <= 6) {
      formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    } else if (val.length > 6) {
      formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
    }
    setFormData((prev) => ({
      ...prev,
      phone: formatted,
    }));
  };

  const validateForm = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.passwordConfirm ||
      !formData.school ||
      !formData.town ||
      !formData.series ||
      !formData.phone
    ) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.password.length < 4 || formData.password.length > 6) {
      setError("Password must be between 4 and 6 characters");
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match");
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(formData.email.toLowerCase())) {
      setError("Please use a valid @gmail.com email address");
      return false;
    }

    const phoneRegex = /^6\d{2}-\d{3}-\d{3}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Invalid phone format. Use 6xx-xxx-xxx");
      return false;
    }

    return true;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const result = await registerStudent(formData.email, formData.password, {
      name: formData.name,
      school: formData.school,
      town: formData.town,
      series: formData.series,
      phone: formData.phone,
    });

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        navigate("/signin");
      }, 2000);
    } else {
      setError(result.error || "Registration failed");
    }

    setLoading(false);
  };

  const series = getAllSeries();

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-large">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join LEADEX EDUCATION today</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSignUp}>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (@gmail.com) *</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="your@gmail.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="school">School Name *</label>
            <input
              id="school"
              type="text"
              name="school"
              placeholder="Your school name"
              value={formData.school}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="town">Town *</label>
            <input
              id="town"
              type="text"
              name="town"
              placeholder="Your town"
              value={formData.town}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="series">Series *</label>
            <select
              id="series"
              name="series"
              value={formData.series}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Select your series</option>
              {series.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (6xx-xxx-xxx) *</label>
            <input
              id="phone"
              type="text"
              name="phone"
              placeholder="6xx-xxx-xxx"
              value={formData.phone}
              onChange={handlePhoneInput}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (4-6 characters) *</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">Confirm Password *</label>
            <input
              id="passwordConfirm"
              type="password"
              name="passwordConfirm"
              placeholder="Confirm password"
              value={formData.passwordConfirm}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-text">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="auth-link"
            disabled={loading}
          >
            Sign In
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

export default SignUp;
