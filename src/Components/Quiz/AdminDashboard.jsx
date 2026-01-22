import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

const AdminDashboard = () => {
  const [results, setResults] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const getResults = async () => {
      const querySnapshot = await getDocs(collection(db, "results"));
      setResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    getResults();
  }, []);

  const authorizeStudent = async () => {
    if (!newEmail) return alert("Enter an email");
    try {
      await setDoc(doc(db, "acredited_students", newEmail.toLowerCase().trim()), {
        status: "authorized"
      });
      alert("Student added to Accredited List!");
      setNewEmail("");
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="container" style={{maxWidth: '900px'}}>
      <h1>Admin Dashboard</h1>
      <hr />
      
      <div className="start-page">
        <h3>Authorize New Student</h3>
        <div style={{display: 'flex', gap: '10px'}}>
          <input 
            placeholder="student@email.com" 
            value={newEmail} 
            onChange={(e) => setNewEmail(e.target.value)} 
          />
          <button onClick={authorizeStudent} style={{margin: 0, width: '150px'}}>Authorize</button>
        </div>
      </div>

      <h3 style={{marginTop: '20px'}}>Global Exam Results</h3>
      <div className="admin-container">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Subject</th>
              <th>Score</th>
              <th>Time</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res) => (
              <tr key={res.id}>
                <td>{res.student_name}</td>
                <td>{res.subject}</td>
                <td>{res.score}/{res.total}</td>
                <td>{Math.floor(res.time_spent/60)}m {res.time_spent%60}s</td>
                <td>{res.submitted_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => window.location.href="/"} style={{background: '#707070', marginTop: '20px'}}>Logout</button>
    </div>
  );
};

export default AdminDashboard;