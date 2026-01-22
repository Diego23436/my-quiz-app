import React, { useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const TeacherDashboard = () => {
  const [q, setQ] = useState({
    subject: "Mathematics",
    question: "",
    option1: "", option2: "", option3: "", option4: "",
    ans: 1
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "quizzes"), {
        ...q,
        ans: Number(q.ans)
      });
      alert("Question successfully added to " + q.subject);
      setQ({ ...q, question: "", option1: "", option2: "", option3: "", option4: "" });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="container">
      <h1>Teacher Panel</h1>
      <p style={{textAlign: 'center', color: '#666'}}>Add new questions to the National Database</p>
      <hr />
      <form className="start-page" onSubmit={handleUpload}>
        <label>Select Subject:</label>
        <select value={q.subject} onChange={(e) => setQ({...q, subject: e.target.value})}>
          <option value="Mathematics">Mathematics</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Biology">Biology</option>
          <option value="ICT">ICT</option>
        </select>

        <label>Question Text (supports LaTeX):</label>
        <textarea 
          placeholder="Enter the questions here!" 
          value={q.question} 
          onChange={(e) => setQ({...q, question: e.target.value})}
          required 
        />

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
          <input placeholder="Option 1" value={q.option1} onChange={(e) => setQ({...q, option1: e.target.value})} required />
          <input placeholder="Option 2" value={q.option2} onChange={(e) => setQ({...q, option2: e.target.value})} required />
          <input placeholder="Option 3" value={q.option3} onChange={(e) => setQ({...q, option3: e.target.value})} required />
          <input placeholder="Option 4" value={q.option4} onChange={(e) => setQ({...q, option4: e.target.value})} required />
        </div>

        <label>Correct Option Number (1-4):</label>
        <input type="number" min="1" max="4" value={q.ans} onChange={(e) => setQ({...q, ans: e.target.value})} required />
        
        <button type="submit">Upload Question</button>
        <button type="button" onClick={() => window.location.href="/"} style={{background: '#707070'}}>Logout</button>
      </form>
    </div>
  );
};

export default TeacherDashboard;