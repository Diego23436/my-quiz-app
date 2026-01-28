import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const AdminDashboard = () => {
  const [studentMap, setStudentMap] = useState({});
  const [lockedSessions, setLockedSessions] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Define your subjects and the pass mark (e.g., 15 out of 30)
  const subjectsList = ["Mathematics", "Further Maths", "Physics", "Chemistry", "Biology", "ICT"];
  const PASS_MARK = 15; 

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all quiz results
      const resultsSnapshot = await getDocs(collection(db, "results"));
      const allResults = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch all active sessions
      const sessionsSnapshot = await getDocs(collection(db, "active_sessions"));
      const allSessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Process Results into Horizontal Map (One row per student)
      const map = {};
      allResults.forEach((res) => {
        const email = res.student_email?.toLowerCase().trim();
        if (!map[email]) {
          map[email] = {
            name: res.student_name,
            school: res.school,
            email: email,
            date: res.submitted_at,
            scores: {}, 
            total: 0
          };
        }
        // Map score to specific subject
        map[email].scores[res.subject] = res.score;
        map[email].total += Number(res.score);
      });
      setStudentMap(map);

      // 4. Identify Incomplete Sessions (Locked out students)
      const incomplete = allSessions.filter(session => {
        const hasFinished = allResults.find(r => 
          r.student_email?.toLowerCase().trim() === session.student_email?.toLowerCase().trim() && 
          r.subject === session.subject
        );
        return !hasFinished;
      });
      setLockedSessions(incomplete);

    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
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

  const unlockStudent = async (sessionId) => {
    if(window.confirm("Allow this student to restart this subject?")) {
      try {
        await deleteDoc(doc(db, "active_sessions", sessionId));
        alert("Session cleared. Student can now retry.");
        fetchData(); 
      } catch (err) { alert("Error: " + err.message); }
    }
  };

  return (
    <div className="container" style={{maxWidth: '1200px', width: '95%'}}>
      <h1>Admin Dashboard</h1>
      <hr />
      
      {/* AUTHORIZATION SECTION */}
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

      {/* MASTER RESULTS TABLE */}
      <h3 style={{marginTop: '30px'}}>Global Exam Results (Consolidated)</h3>
      <div className="admin-container" style={{overflowX: 'auto'}}>
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>School</th>
              <th>Email</th>
              {subjectsList.map(sub => <th key={sub}>{sub}</th>)}
              <th style={{background: '#e3f2fd', color: '#1976d2'}}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(studentMap).map((student, index) => (
              <tr key={index}>
                <td>{student.name}</td>
                <td>{student.school}</td>
                <td style={{fontSize: '0.8rem'}}>{student.email}</td>
                
                {/* Subject Columns with Conditional Red Color for Fails */}
                {subjectsList.map(sub => {
                  const mark = student.scores[sub];
                  const isFail = mark !== undefined && mark < PASS_MARK;
                  return (
                    <td 
                      key={sub} 
                      style={{ 
                        color: isFail ? 'red' : 'inherit', 
                        fontWeight: isFail ? 'bold' : 'normal' 
                      }}
                    >
                      {mark !== undefined ? mark : "-"}
                    </td>
                  );
                })}
                
                <td style={{fontWeight: 'bold', background: '#f0f4f8'}}>{student.total}</td>
              </tr>
            ))}
            {Object.values(studentMap).length === 0 && (
              <tr><td colSpan={subjectsList.length + 4}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* INCOMPLETE SESSIONS TABLE */}
      <h3 style={{marginTop: '40px', color: '#d32f2f'}}>Incomplete / Locked Sessions</h3>
      <p style={{fontSize: '0.8rem', marginBottom: '10px'}}>Students listed here are blocked from a subject because they refreshed or exited midway.</p>
      <div className="admin-container">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Subject</th>
              <th>Started At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lockedSessions.map((session) => (
              <tr key={session.id}>
                <td>{session.student_email}</td>
                <td>{session.subject}</td>
                <td>{session.startTime}</td>
                <td>
                  <button 
                    onClick={() => unlockStudent(session.id)}
                    style={{background: '#f44336', padding: '5px 10px', fontSize: '0.8rem', width: 'auto'}}
                  >
                    Unlock/Reset
                  </button>
                </td>
              </tr>
            ))}
            {lockedSessions.length === 0 && <tr><td colSpan="4">No locked sessions found</td></tr>}
          </tbody>
        </table>
      </div>

      <button onClick={() => window.location.href="/"} style={{background: '#707070', marginTop: '40px'}}>Logout</button>
    </div>
  );
};

export default AdminDashboard;