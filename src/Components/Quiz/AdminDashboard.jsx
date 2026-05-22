import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

const AdminDashboard = () => {
  const [studentMap, setStudentMap] = useState({});
  const [lockedSessions, setLockedSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const subjectsList = ["Mathematics", "Further Maths", "Physics", "Chemistry", "Biology", "ICT"];
  const PASS_MARK = 15;

  // Helper function to parse date string in DD/MM/YYYY format to comparable number
  const dateStringToTimestamp = (dateStr, timeStr) => {
    try {
      const [day, month, year] = dateStr.split('/').map(Number);
      const [hour, minute, second] = timeStr.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    } catch (e) {
      return 0;
    }
  };

  // Helper to format seconds to HH:MM:SS
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

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
        const parts = res.submitted_at ? res.submitted_at.split(', ') : ["01/01/2000", "00:00:00"];
        const dateKey = parts[0];
        const timeValue = parts[1] || "00:00:00";
        const duration = res.time_spent || 0;

        if (!map[email]) {
          map[email] = {
            name: res.student_name,
            school: res.school,
            series: res.series,
            email: email,
            scores: {},
            dbIds: [],
            latestSubmission: { date: "", time: "", timestamp: 0 },
            totalDuration: 0
          };
        }

        // Store subject-level details
        map[email].scores[res.subject] = {
          score: res.score,
          date: dateKey,
          time: timeValue,
          duration: duration
        };

        // Update latest submission
        const currentTimestamp = dateStringToTimestamp(dateKey, timeValue);
        if (currentTimestamp > map[email].latestSubmission.timestamp) {
          map[email].latestSubmission = {
            date: dateKey,
            time: timeValue,
            timestamp: currentTimestamp
          };
        }

        map[email].totalDuration += duration;
        map[email].dbIds.push(res.id);
      });

      setStudentMap(map);

      const resultSet = new Set(
        allResults.map(r => `${r.student_email?.toLowerCase().trim()}_${r.subject}`)
      );
      const incomplete = allSessions.filter(session =>
        !resultSet.has(`${session.student_email?.toLowerCase().trim()}_${session.subject}`)
      );
      setLockedSessions(incomplete);

    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const authorizeStudent = async () => {
    if (!newEmail) return alert("Enter an email");
    try {
      await setDoc(doc(db, "acredited_students", newEmail.toLowerCase().trim()), { status: "authorized" });
      alert("Authorized!");
      setNewEmail("");
    } catch (err) { alert(err.message); }
  };

  const clearResults = async () => {
    if (!window.confirm("Are you sure you want to clear all saved results? This cannot be undone.")) return;
    try {
      const resultsSnapshot = await getDocs(collection(db, "results"));
      if (resultsSnapshot.empty) {
        alert("No results to clear.");
        return;
      }
      const docs = resultsSnapshot.docs;
      const chunkSize = 400;
      let clearedCount = 0;

      for (let i = 0; i < docs.length; i += chunkSize) {
        const batch = writeBatch(db);
        docs.slice(i, i + chunkSize).forEach((resultDoc) => {
          batch.delete(resultDoc.ref);
          clearedCount += 1;
        });
        await batch.commit();
      }

      alert(`✓ Cleared ${clearedCount} result record(s).`);
      fetchData();
    } catch (err) {
      console.error("Error clearing results:", err);
      alert("Failed to clear results: " + err.message);
    }
  };

  const unlockStudent = async (id) => {
    if(window.confirm("Unlock this session?")) {
      await deleteDoc(doc(db, "active_sessions", id));
      fetchData();
    }
  };

  // Handle selecting/deselecting a session
  const toggleSessionSelect = (sessionId) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedSessions.size === lockedSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(lockedSessions.map(s => s.id)));
    }
  };

  // Handle unlock selected
  const unlockSelected = async () => {
    if (selectedSessions.size === 0) return;
    const confirmUnlock = window.confirm(`Unlock ${selectedSessions.size} selected session(s)?`);
    if (confirmUnlock) {
      try {
        const batch = writeBatch(db);
        selectedSessions.forEach(sessionId => {
          batch.delete(doc(db, "active_sessions", sessionId));
        });
        await batch.commit();
        alert(`✓ ${selectedSessions.size} session(s) unlocked successfully!`);
        setSelectedSessions(new Set());
        fetchData();
      } catch (err) {
        alert("Error unlocking sessions: " + err.message);
      }
    }
  };

  // Get sorted students list
  const sortedStudents = useMemo(() => {
    let students = Object.values(studentMap);

    // Sort by latest submission (newest first)
    students.sort((a, b) => b.latestSubmission.timestamp - a.latestSubmission.timestamp);

    // Apply filters
    students = students.filter(student => {
      // Search by name
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filter by subject completion
      if (filterSubject) {
        const hasSubject = student.scores[filterSubject];
        const isCompleted = hasSubject;
        // For simplicity, we show all. To filter "not completed", user would need checkbox
        if (!isCompleted) return false;
      }

      // Filter by date range
      if (filterDateFrom || filterDateTo) {
        const [d, m, y] = student.latestSubmission.date.split('/').map(Number);
        const studentDate = new Date(y, m - 1, d);

        if (filterDateFrom) {
          const [fD, fM, fY] = filterDateFrom.split('-');
          const fromDate = new Date(fY, fM - 1, fD);
          if (studentDate < fromDate) return false;
        }

        if (filterDateTo) {
          const [tD, tM, tY] = filterDateTo.split('-');
          const toDate = new Date(tY, tM - 1, tD);
          if (studentDate > toDate) return false;
        }
      }

      return true;
    });

    return students;
  }, [studentMap, searchTerm, filterSubject, filterDateFrom, filterDateTo]);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = sortedStudents.map(student => {
        const row = {
          'Name': student.name,
          'School': student.school,
          'Email': student.email,
          'Series': student.series,
          'Latest Date': student.latestSubmission.date,
          'Latest Time': student.latestSubmission.time,
          'Total Duration': formatDuration(student.totalDuration)
        };

        // Add subject scores
        subjectsList.forEach(subject => {
          const subjectData = student.scores[subject];
          row[subject] = subjectData ? subjectData.score : '-';
        });

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-width columns
      const colWidths = {};
      Object.keys(data[0] || {}).forEach(key => {
        colWidths[key] = 12;
      });
      worksheet['!cols'] = Object.values(colWidths).map(w => ({ wch: w }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

      XLSX.writeFile(workbook, `ExamResults_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error downloading Excel file. Please try again.");
    }
  };

  // Calculate total and completion status for display
  const getStudentTotal = (scores) => {
    return Object.values(scores).reduce((sum, item) => {
      if (typeof item === 'object' && item.score) {
        return sum + Number(item.score);
      }
      return sum;
    }, 0);
  };

  const getSubjectScore = (scores, subject) => {
    const subjectData = scores[subject];
    return subjectData ? subjectData.score : '-';
  };

  return (
    <div className="container" style={{maxWidth: '1400px', width: '95%'}}>
      <h1>Admin Management Portal - Exam Results</h1>
      <hr />

      {/* AUTHORIZATION SECTION */}
      <div className="start-page" style={{background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
        <h3>Authorize New Student</h3>
        <div style={{display: 'flex', gap: '10px'}}>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
          <button onClick={authorizeStudent} style={{margin: 0, width: '150px'}}>Authorize</button>
        </div>
      </div>

      {/* EXPORT BUTTON */}
      <div style={{marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
        <button
          onClick={exportToExcel}
          style={{background: '#1976d2', color: 'white', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
        >
          📥 Download Excel
        </button>
        <button
          onClick={() => { setSearchTerm(""); setFilterSubject(""); setFilterDateFrom(""); setFilterDateTo(""); }}
          style={{background: '#666', color: 'white', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer'}}
        >
          Clear Filters
        </button>
        <button
          onClick={clearResults}
          style={{background: '#d32f2f', color: 'white', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
        >
          🧹 Clear Results Table
        </button>
      </div>

      {/* SEARCH & FILTER SECTION */}
      <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px'}}>
        <div>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Search Name:</label>
          <input
            type="text"
            placeholder="e.g., John"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
          />
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Subject Completed:</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
          >
            <option value="">-- All Subjects --</option>
            {subjectsList.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>From Date:</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
          />
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>To Date:</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
          />
        </div>
      </div>

      {/* UNIFIED RESULTS TABLE */}
      <h2>All Exam Results ({sortedStudents.length} students)</h2>
      {loading ? (
        <p>Loading data...</p>
      ) : sortedStudents.length === 0 ? (
        <p style={{color: '#999', textAlign: 'center', padding: '20px'}}>No results found</p>
      ) : (
        <div style={{overflowX: 'auto', marginBottom: '40px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse',fontSize: '0.9rem', background: '#fff', border: '1px solid #ddd'}}>
            <thead>
              <tr style={{background: '#f5f5f5', borderBottom: '2px solid #1976d2'}}>
                <th style={{padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold'}}>Name</th>
                <th style={{padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold'}}>School</th>
                {subjectsList.map(sub => (
                  <th key={sub} style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold', minWidth: '60px'}}>
                    {sub.split(' ')[0]}
                  </th>
                ))}
                <th style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold', background: '#e3f2fd'}}>Total</th>
                <th style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold'}}>Duration</th>
                <th style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold'}}>Latest Date/Time</th>
                <th style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const studentTotal = getStudentTotal(student.scores);
                const isExpanded = expandedStudent === student.email;

                return (
                  <React.Fragment key={student.email}>
                    {/* Main Row */}
                    <tr style={{borderBottom: '1px solid #eee', background: isExpanded ? '#f9f9f9' : '#fff'}}>
                      <td style={{padding: '12px', borderRight: '1px solid #ddd', fontWeight: '500'}}>{student.name}</td>
                      <td style={{padding: '12px', borderRight: '1px solid #ddd', fontSize: '0.85rem', color: '#666'}}>{student.school}</td>

                      {/* Subject Columns */}
                      {subjectsList.map(subject => {
                        const score = getSubjectScore(student.scores, subject);
                        const isFail = score !== '-' && Number(score) < PASS_MARK;
                        return (
                          <td key={subject} style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', color: isFail ? '#d32f2f' : '#333', fontWeight: isFail ? 'bold' : 'normal'}}>
                            {score}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold', background: '#f0f4f8'}}>
                        {studentTotal}
                      </td>

                      {/* Duration */}
                      <td style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontSize: '0.85rem', color: '#666'}}>
                        {formatDuration(student.totalDuration)}
                      </td>

                      {/* Latest */}
                      <td style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontSize: '0.85rem'}}>
                        {student.latestSubmission.date} <br/> {student.latestSubmission.time}
                      </td>

                      {/* Details Button */}
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <button
                          onClick={() => setExpandedStudent(isExpanded ? null : student.email)}
                          style={{background: isExpanded ? '#ff9800' : '#1976d2', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.85rem'}}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr style={{background: '#f9f9f9', borderBottom: '2px solid #1976d2'}}>
                        <td colSpan="100%" style={{padding: '20px', borderRight: '1px solid #ddd'}}>
                          <div style={{background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #e0e0e0'}}>
                            <h4 style={{margin: '0 0 15px 0', color: '#1976d2'}}>📋 Subject Details for {student.name}</h4>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                              <thead>
                                <tr style={{background: '#f5f5f5', borderBottom: '1px solid #ddd'}}>
                                  <th style={{padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd'}}>Subject</th>
                                  <th style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd'}}>Score</th>
                                  <th style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd'}}>Date</th>
                                  <th style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd'}}>Time</th>
                                  <th style={{padding: '10px', textAlign: 'center'}}>Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subjectsList.map(subject => {
                                  const subjectData = student.scores[subject];
                                  if (!subjectData) {
                                    return (
                                      <tr key={subject} style={{borderBottom: '1px solid #eee', background: '#fafafa'}}>
                                        <td style={{padding: '10px', borderRight: '1px solid #ddd'}}>{subject}</td>
                                        <td colSpan="4" style={{padding: '10px', color: '#999', textAlign: 'center'}}>Not attempted</td>
                                      </tr>
                                    );
                                  }
                                  const isFail = subjectData.score < PASS_MARK;
                                  return (
                                    <tr key={subject} style={{borderBottom: '1px solid #eee'}}>
                                      <td style={{padding: '10px', borderRight: '1px solid #ddd', fontWeight: '500'}}>{subject}</td>
                                      <td style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd', color: isFail ? '#d32f2f' : '#333', fontWeight: isFail ? 'bold' : 'normal'}}>
                                        {subjectData.score}
                                      </td>
                                      <td style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#666'}}>{subjectData.date}</td>
                                      <td style={{padding: '10px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#666'}}>{subjectData.time}</td>
                                      <td style={{padding: '10px', textAlign: 'center', color: '#666'}}>{formatDuration(subjectData.duration)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* INCOMPLETE SESSIONS */}
      <h3 style={{marginTop: '40px', color: '#d32f2f'}}>Active/Locked Sessions ({lockedSessions.length})</h3>

      {lockedSessions.length > 0 && selectedSessions.size > 0 && (
        <div style={{marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center'}}>
          <span style={{color: '#333', fontWeight: 'bold'}}>{selectedSessions.size} session(s) selected</span>
          <button
            onClick={unlockSelected}
            style={{background: '#f44336', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
          >
            🔓 Unlock Selected
          </button>
          <button
            onClick={() => setSelectedSessions(new Set())}
            style={{background: '#999', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer'}}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead><tr style={{background: '#f5f5f5', borderBottom: '2px solid #d32f2f'}}>
            <th style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', width: '40px'}}>
              {lockedSessions.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedSessions.size === lockedSessions.length && lockedSessions.length > 0}
                  onChange={toggleSelectAll}
                  style={{cursor: 'pointer', width: '18px', height: '18px'}}
                  title="Select all"
                />
              )}
            </th>
            <th style={{padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd'}}>Email</th>
            <th style={{padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd'}}>Subject</th>
            <th style={{padding: '12px', textAlign: 'center'}}>Action</th>
          </tr></thead>
          <tbody>
            {lockedSessions.length > 0 ? lockedSessions.map((session) => (
              <tr key={session.id} style={{borderBottom: '1px solid #eee', background: selectedSessions.has(session.id) ? '#fff3cd' : '#fff'}}>
                <td style={{padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd'}}>
                  <input
                    type="checkbox"
                    checked={selectedSessions.has(session.id)}
                    onChange={() => toggleSessionSelect(session.id)}
                    style={{cursor: 'pointer', width: '18px', height: '18px'}}
                  />
                </td>
                <td style={{padding: '12px', borderRight: '1px solid #ddd'}}>{session.student_email}</td>
                <td style={{padding: '12px', borderRight: '1px solid #ddd'}}>{session.subject}</td>
                <td style={{padding: '12px', textAlign: 'center'}}>
                  <button onClick={() => unlockStudent(session.id)} style={{background: '#f44336', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer'}}>Unlock</button>
                </td>
              </tr>
            )) : <tr><td colSpan="4" style={{padding: '12px', textAlign: 'center', color: '#999'}}>No locked sessions</td></tr>}
          </tbody>
        </table>
      </div>

      <button onClick={() => window.location.href="/"} style={{background: '#707070', color: 'white', marginTop: '40px', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Logout</button>
    </div>
  );
};

export default AdminDashboard;
