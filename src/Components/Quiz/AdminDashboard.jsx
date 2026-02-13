import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

const AdminDashboard = () => {
  const [studentMap, setStudentMap] = useState({});
  const [lockedSessions, setLockedSessions] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const subjectsList = ["Mathematics", "Further Maths", "Physics", "Chemistry", "Biology", "ICT"];
  const PASS_MARK = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const resultsSnapshot = await getDocs(collection(db, "results"));
      const allResults = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sessionsSnapshot = await getDocs(collection(db, "active_sessions"));
      const allSessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const map = {};
      allResults.forEach((res) => {
        const email = res.student_email?.toLowerCase().trim();
        // Split "Date, Time" string (Expected format: "DD/MM/YYYY, HH:MM:SS")
        const parts = res.submitted_at ? res.submitted_at.split(', ') : ["Unknown Date", "00:00:00"];
        const dateKey = parts[0];
        const timeValue = parts[1] || "00:00:00";

        if (!map[email]) {
          map[email] = {
            name: res.student_name,
            school: res.school,
            series: res.series,
            email: email,
            date: dateKey,
            time: timeValue, 
            scores: {},
            total: 0,
            dbIds: [] 
          };
        }
        map[email].scores[res.subject] = res.score;
        map[email].total += Number(res.score);
        map[email].dbIds.push(res.id);
      });
      setStudentMap(map);

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

  useEffect(() => { fetchData(); }, []);

  const deleteDayResults = async (day, students) => {
    const confirmFirst = window.confirm(`Are you sure you want to delete ALL records for ${day}?`);
    if (confirmFirst) {
      const confirmSecond = window.confirm("This action is permanent and cannot be undone. Proceed?");
      if (confirmSecond) {
        try {
          const batch = writeBatch(db);
          students.forEach(student => {
            student.dbIds.forEach(docId => {
              batch.delete(doc(db, "results", docId));
            });
          });
          await batch.commit();
          alert(`All records for ${day} have been deleted.`);
          fetchData();
        } catch (err) {
          alert("Error deleting records: " + err.message);
        }
      }
    }
  };

  const exportDayToCSV = (day, dayStudents) => {
    const headers = ["Name", "School", "Email", "Submission Time", ...subjectsList, "Grand Total"];
    const rows = dayStudents.map(s => [
      s.name, s.school, s.email, s.time,
      ...subjectsList.map(sub => s.scores[sub] || 0),
      s.total
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Results_${day.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGroupedData = () => {
    const students = Object.values(studentMap);
    return students.reduce((acc, student) => {
      const day = student.date;
      if (!acc[day]) acc[day] = [];
      acc[day].push(student);
      return acc;
    }, {});
  };

  const authorizeStudent = async () => {
    if (!newEmail) return alert("Enter an email");
    try {
      await setDoc(doc(db, "acredited_students", newEmail.toLowerCase().trim()), { status: "authorized" });
      alert("Authorized!");
      setNewEmail("");
    } catch (err) { alert(err.message); }
  };

  const unlockStudent = async (id) => {
    if(window.confirm("Unlock this session?")) {
      await deleteDoc(doc(db, "active_sessions", id));
      fetchData();
    }
  };

  const groupedData = getGroupedData();

  return (
    <div className="container" style={{maxWidth: '1200px', width: '95%'}}>
      <h1>Admin Management Portal</h1>
      <hr />
      
      {/* AUTHORIZATION SECTION */}
      <div className="start-page" style={{background: '#f9f9f9', padding: '20px', borderRadius: '8px'}}>
        <h3>Authorize New Student</h3>
        <div style={{display: 'flex', gap: '10px'}}>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
          <button onClick={authorizeStudent} style={{margin: 0, width: '150px'}}>Authorize</button>
        </div>
      </div>

      {/* RENDER TABLES BY DAY - SORTED ASCENDING (Further to Closest) */}
      <h2 style={{marginTop: '40px'}}>Examination History</h2>
      
      {loading ? <p>Loading data...</p> : Object.keys(groupedData)
        .sort((a, b) => {
          // Manual Date parsing for DD/MM/YYYY format
          const [dA, mA, yA] = a.split('/').map(Number);
          const [dB, mB, yB] = b.split('/').map(Number);
          return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB);
        })
        .map(day => (
        <div key={day} style={{marginBottom: '60px', border: '1px solid #eee', padding: '20px', borderRadius: '12px', background: '#fff'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
            <h3 style={{color: '#1976d2', margin: 0}}>📅 Records for {day}</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => exportDayToCSV(day, groupedData[day])} style={{background: '#2e7d32', width: 'auto', padding: '8px 15px'}}>Export CSV</button>
              <button onClick={() => deleteDayResults(day, groupedData[day])} style={{background: '#d32f2f', width: 'auto', padding: '8px 15px'}}>Delete Day</button>
            </div>
          </div>

          <div className="admin-container" style={{overflowX: 'auto', marginTop: '15px'}}>
            <table style={{fontSize: '0.9rem'}}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                  <th>Time</th>
                  {subjectsList.map(sub => <th key={sub}>{sub}</th>)}
                  <th style={{background: '#e3f2fd'}}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {groupedData[day].map((student, idx) => (
                  <tr key={idx}>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.school}</td>
                    <td style={{color: '#666'}}>{student.time}</td>
                    {subjectsList.map(sub => {
                      const mark = student.scores[sub];
                      const isFail = mark !== undefined && mark < PASS_MARK;
                      return (
                        <td key={sub} style={{ color: isFail ? 'red' : 'inherit', fontWeight: isFail ? 'bold' : 'normal' }}>
                          {mark !== undefined ? mark : "-"}
                        </td>
                      );
                    })}
                    <td style={{fontWeight: 'bold', background: '#f0f4f8'}}>{student.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* INCOMPLETE SESSIONS */}
      <h3 style={{marginTop: '40px', color: '#d32f2f'}}>Active/Locked Sessions</h3>
      <div className="admin-container">
        <table>
          <thead><tr><th>Email</th><th>Subject</th><th>Action</th></tr></thead>
          <tbody>
            {lockedSessions.length > 0 ? lockedSessions.map((session) => (
              <tr key={session.id}>
                <td>{session.student_email}</td>
                <td>{session.subject}</td>
                <td><button onClick={() => unlockStudent(session.id)} style={{background: '#f44336', padding: '5px'}}>Unlock</button></td>
              </tr>
            )) : <tr><td colSpan="3">No locked sessions.</td></tr>}
          </tbody>
        </table>
      </div>

      <button onClick={() => window.location.href="/"} style={{background: '#707070', marginTop: '40px'}}>Logout</button>
    </div>
  );
};

export default AdminDashboard;