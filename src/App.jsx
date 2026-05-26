import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components
import Quiz from "./Components/Quiz/Quiz";
import TeacherDashboard from "./Components/Quiz/TeacherDashboard";
import AdminDashboard from "./Components/Quiz/AdminDashboard";
import SignIn from "./Components/Auth/SignIn";
import SignUp from "./Components/Auth/SignUp";

function App() {
  return (
    <Router>
      <Routes>
        {/* Home/Welcome - Student Entry Point */}
        <Route path="/" element={<Quiz />} />

        {/* Authentication Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Quiz Route (after signin) */}
        <Route path="/quiz" element={<Quiz />} />

        {/* Teacher Dashboard */}
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;