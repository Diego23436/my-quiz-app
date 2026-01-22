import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MathJaxContext } from "better-react-mathjax";

// Ensure these paths are correct based on your folder structure
import Quiz from "./Components/Quiz/Quiz";
import TeacherDashboard from "./Components/Quiz/TeacherDashboard";
import AdminDashboard from "./Components/Quiz/AdminDashboard";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    enableMenu: false,
    ignoreHtmlClass: "tex2jax_ignore",
    processHtmlClass: "tex2jax_process",
  },
  chtml: {
    fontURL: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2"
  }
};

function App() {
  return (
    <MathJaxContext config={mathJaxConfig}>
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
    </MathJaxContext>
  );
}

export default App;