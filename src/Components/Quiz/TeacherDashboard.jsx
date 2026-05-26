import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const subjects = ["PMM", "PMS", "Further Maths", "Physics", "Chemistry", "Biology", "ICT", "Computer Science", "Food Science"];
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current exam schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "exam_schedules"));
        const data = {};
        querySnapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        setSchedules(data);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      }
      setLoading(false);
    };
    fetchSchedules();
  }, []);

  // Handle schedule update
  const handleScheduleChange = (subject, field, value) => {
    setSchedules(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: value
      }
    }));
  };

  // Save all schedules
  const saveSchedules = async () => {
    setSaving(true);
    try {
      for (const subject of subjects) {
        const schedule = schedules[subject] || { date: "", time: "", end_time: "" };
        if (schedule.date && schedule.time) {
          await setDoc(doc(db, "exam_schedules", subject), {
            date: schedule.date,
            time: schedule.time,
            end_time: schedule.end_time || "", // New: end time field
            subject: subject,
            lastUpdated: new Date().toISOString()
          });
        }
      }
      alert("✓ Exam schedules updated successfully!");
    } catch (err) {
      alert("Error saving schedules: " + err.message);
    }
    setSaving(false);
  };

  // Test subject (opens quiz in test mode without saving results)
  const testSubject = (subject) => {
    localStorage.setItem("testMode", JSON.stringify({ enabled: true, subject: subject }));
    window.location.href = "/quiz";
  };

  // Logout teacher
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      alert("Error logging out: " + error.message);
    }
  };

  if (loading) return <div className="container"><p>Loading schedules...</p></div>;

  return (
    <div className="container" style={{maxWidth: '1200px', width: '95%'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1>Teacher Dashboard - Exam Scheduling</h1>
        <button
          onClick={handleLogout}
          style={{
            background: '#f44336',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </div>
      <p style={{textAlign: 'center', color: '#666', marginBottom: '10px'}}>Set the date, start time, and end time when each subject's exam becomes available to students</p>
      <hr />

      <div style={{background: '#e8f5e9', border: '1px solid #4caf50', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#2e7d32'}}>
        <strong>ℹ️ Features:</strong>
        <ul style={{margin: '10px 0 0 20px'}}>
          <li>Questions: Managed through questions.json file</li>
          <li>This interface controls when exams are available</li>
          <li>Use the "Test Subject" button to practice questions without saving results</li>
          <li>Set an end time to automatically stop exams at a specific time</li>
        </ul>
      </div>

      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: '#f5f5f5', borderBottom: '2px solid #ddd'}}>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Subject</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Exam Date</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Start Time</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>End Time</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Status</th>
              <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const schedule = schedules[subject] || { date: "", time: "", end_time: "" };
              const isScheduled = schedule.date && schedule.time;
              return (
                <tr key={subject} style={{borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '12px', fontWeight: '500'}}>{subject}</td>
                  <td style={{padding: '12px'}}>
                    <input
                      type="date"
                      value={schedule.date || ""}
                      onChange={(e) => handleScheduleChange(subject, 'date', e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '150px', fontSize: '0.9rem'}}
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    <input
                      type="time"
                      value={schedule.time || ""}
                      onChange={(e) => handleScheduleChange(subject, 'time', e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '120px', fontSize: '0.9rem'}}
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    <input
                      type="time"
                      value={schedule.end_time || ""}
                      onChange={(e) => handleScheduleChange(subject, 'end_time', e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '120px', fontSize: '0.9rem'}}
                      title="When exam should automatically end"
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    {isScheduled ? (
                      <span style={{color: '#4caf50', fontWeight: 'bold'}}>✓ Scheduled</span>
                    ) : (
                      <span style={{color: '#ff9800', fontWeight: 'bold'}}>⚠ Not Set</span>
                    )}
                  </td>
                  <td style={{padding: '12px', textAlign: 'center'}}>
                    <button
                      onClick={() => testSubject(subject)}
                      style={{
                        background: '#2196F3',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}
                      title="Test this subject (results not saved)"
                    >
                      Test
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
        <button
          onClick={saveSchedules}
          disabled={saving}
          style={{
            background: '#1976d2',
            color: 'white',
            padding: '12px 30px',
            borderRadius: '4px',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: saving ? 0.6 : 1
          }}
        >
          {saving ? "Saving..." : "Save All Schedules"}
        </button>
        <button
          onClick={() => navigate("/")}
          style={{
            background: '#707070',
            color: 'white',
            padding: '12px 30px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;