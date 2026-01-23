import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Ensure these paths are correct based on your folder structure
import Quiz from "./Components/Quiz/Quiz";
import TeacherDashboard from "./Components/Quiz/TeacherDashboard";
import AdminDashboard from "./Components/Quiz/AdminDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* The Student View */}
        <Route path="/" element={<Quiz />} />

        {/* The Teacher View */}
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* The Admin View */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;