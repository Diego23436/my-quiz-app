import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

const TeacherDashboard = () => {
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
        const schedule = schedules[subject] || { date: "", time: "" };
        if (schedule.date && schedule.time) {
          await setDoc(doc(db, "exam_schedules", subject), {
            date: schedule.date,
            time: schedule.time,
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

  if (loading) return <div className="container"><p>Loading schedules...</p></div>;

  return (
    <div className="container" style={{maxWidth: '1000px', width: '95%'}}>
      <h1>Teacher Dashboard - Exam Scheduling</h1>
      <p style={{textAlign: 'center', color: '#666'}}>Set the date and time when each subject's exam becomes available to students</p>
      <hr />

      <div style={{background: '#e8f5e9', border: '1px solid #4caf50', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#2e7d32'}}>
        <strong>ℹ️ Questions:</strong> Managed through questions.json file. This interface controls when exams are available.
      </div>

      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: '#f5f5f5', borderBottom: '2px solid #ddd'}}>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Subject</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Exam Date</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Exam Time</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: 'bold'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const schedule = schedules[subject] || { date: "", time: "" };
              const isScheduled = schedule.date && schedule.time;
              return (
                <tr key={subject} style={{borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '12px', fontWeight: '500'}}>{subject}</td>
                  <td style={{padding: '12px'}}>
                    <input
                      type="date"
                      value={schedule.date || ""}
                      onChange={(e) => handleScheduleChange(subject, 'date', e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '150px'}}
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    <input
                      type="time"
                      value={schedule.time || ""}
                      onChange={(e) => handleScheduleChange(subject, 'time', e.target.value)}
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '120px'}}
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    {isScheduled ? (
                      <span style={{color: '#4caf50', fontWeight: 'bold'}}>✓ Scheduled</span>
                    ) : (
                      <span style={{color: '#ff9800', fontWeight: 'bold'}}>⚠ Not Set</span>
                    )}
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
          onClick={() => window.location.href="/"}
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
          Logout
        </button>
      </div>

      <div style={{marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd'}}>
        <h3>How This Works:</h3>
        <ul style={{lineHeight: '1.8', color: '#555'}}>
          <li>📅 Set the exact <strong>date</strong> and <strong>time</strong> each subject exam should become available</li>
          <li>🔒 Students won't be able to access an exam until the scheduled date and time</li>
          <li>⏰ After setting schedules, students will see "(Locked)" on unavailable subjects</li>
          <li>💾 All changes are saved to the database when you click "Save All Schedules"</li>
        </ul>
      </div>
    </div>
  );
};

export default TeacherDashboard;