import React, { useRef, useState, useEffect } from "react";
import "./Quiz.css";
import logo from "../../assets/logoldx.jpeg";
import img2 from "../../assets/img2.jpg";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { db, auth } from "../../firebaseConfig"; 
import { collection, getDocs, addDoc, doc, getDoc, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

// Import local questions as fallback
import questionsData from "./questions.json";

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

const QUIZ_TIME = 30 * 60; 

const Quiz = () => {
  const [page, setPage] = useState("welcome");
  const [user, setUser] = useState({
    name: "", school: "", email: "", phone: "", password: "", role: "user",
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(""); 
  const [index, setIndex] = useState(0);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [saved, setSaved] = useState(false);

  const question = questions[index] || {};
  const option_array = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const renderContent = (content) => {
    if (!content) return null;

    // Check if content contains HTML (like tables)
    if (content.includes('<table>') || content.includes('<')) {
      return (
        <MathJax dynamic>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </MathJax>
      );
    }

    // For pure LaTeX/math content, render as text
    return (
      <MathJax dynamic>
        {content}
      </MathJax>
    );
  };

  const startSubjectQuiz = async (subjectName) => {
    setLoading(true);
    try {
      const q = query(collection(db, "quizzes"), where("subject", "==", subjectName));
      const querySnapshot = await getDocs(q);
      const firebaseData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (firebaseData.length > 0) {
        // Use Firebase data if available
        setQuestions(firebaseData);
        setSelectedSubject(subjectName);
        setPage("quiz");
      } else {
        // Fallback to local questions if no Firebase data
        console.log(`No Firebase questions found for ${subjectName}, using local questions`);
        const localQuestions = questionsData.map(q => ({
          ...q,
          subject: subjectName, // Add subject to local questions
          id: `local_${q.id}`
        }));
        setQuestions(localQuestions);
        setSelectedSubject(subjectName);
        setPage("quiz");
      }
    } catch (error) {
      console.error("Firebase error, using local questions:", error);
      // Fallback to local questions on error
      const localQuestions = questionsData.map(q => ({
        ...q,
        subject: subjectName,
        id: `local_${q.id}`
      }));
      setQuestions(localQuestions);
      setSelectedSubject(subjectName);
      setPage("quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (page !== "quiz" || result || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [page, result, questions.length]);

  const handleUnifiedLogin = async () => {
    if (user.role === "user") {
      if (!user.name || !user.email || !user.school || !user.phone) {
        alert("Please fill all required fields");
        return;
      }
      try {
        const docRef = doc(db, "acredited_students", user.email.toLowerCase().trim());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPage("subject-select"); 
        } else {
          alert("Access Denied: Your email is not on the accredited list.");
        }
      } catch (error) {
        alert("Database connection error.");
      }
    } else {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
        const userDocSnap = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDocSnap.exists() && userDocSnap.data().role === user.role) {
          window.location.href = user.role === "teacher" ? "/teacher" : "/admin";
        } else {
          alert(`Unauthorized role.`);
        }
      } catch (error) {
        alert("Login failed: " + error.message);
      }
    }
  };

  const checkAns = (e, ansIndex) => {
    if (lock || !question.ans) return;
    if (question.ans === ansIndex) {
      e.target.classList.add("correct");
      setScore((prev) => prev + 1);
    } else {
      e.target.classList.add("wrong");
      option_array[question.ans - 1]?.current?.classList.add("correct");
    }
    setLock(true);
  };

  const next = () => {
    if (!lock) return;
    option_array.forEach((opt) => opt.current?.classList.remove("wrong", "correct"));
    if (index === questions.length - 1) {
      setResult(true);
    } else {
      setIndex((prev) => prev + 1);
      setLock(false);
    }
  };

  useEffect(() => {
    if (result && !saved && user.role === "user") {
      const saveResult = async () => {
        try {
          await addDoc(collection(db, "results"), {
            student_name: user.name,
            student_email: user.email,
            school: user.school,
            phone: user.phone,
            subject: selectedSubject, 
            score: score,
            total: questions.length,
            time_spent: QUIZ_TIME - timeLeft,
            submitted_at: new Date().toLocaleString(),
          });
          setSaved(true);
        } catch (e) { console.error(e); }
      };
      saveResult();
    }
  }, [result, saved]);

  const reset = () => {
    setPage("welcome");
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
    setSaved(false);
    setTimeLeft(QUIZ_TIME);
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="container">
        <h1>PDV LEADEX EDUCATION</h1>
        <h1>National Quiz</h1>
        <img src={logo} alt="Logo" className="logo" />
        <hr />

        {page === "welcome" && (
          <div className="welcome-page">
            <div className="welcome-card">
              <div className="welcome-image"><img src={img2} alt="Welcome" /></div>
              <div className="welcome-text">
                <h2>Empowering Your Future</h2>
                <p>Join the national challenge and test your knowledge across all major subjects.</p>
                <button onClick={() => setPage("login")}>Get Started</button>
              </div>
            </div>
          </div>
        )}

        {page === "login" && (
          <div className="start-page">
            <h2>Login / Identification</h2>
            <select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>
              <option value="user">User (Student)</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <input type="email" placeholder="Email" onChange={(e) => setUser({...user, email: e.target.value})} />
            {user.role === "user" ? (
              <>
                <input type="text" placeholder="Full Name" onChange={(e) => setUser({...user, name: e.target.value})} />
                <input type="text" placeholder="School Name" onChange={(e) => setUser({...user, school: e.target.value})} />
                <input type="text" placeholder="Phone Number" onChange={(e) => setUser({...user, phone: e.target.value})} />
              </>
            ) : (
              <input type="password" placeholder="Password" onChange={(e) => setUser({...user, password: e.target.value})} />
            )}
            <button onClick={handleUnifiedLogin}>Continue</button>
          </div>
        )}

        {page === "subject-select" && (
          <div className="start-page">
            <h2>Select Your Subject</h2>
            <div className="subject-grid">
              {["Mathematics", "Physics", "Chemistry", "Biology", "ICT"].map((sub) => (
                <button key={sub} className="subject-btn" onClick={() => startSubjectQuiz(sub)}>{sub}</button>
              ))}
            </div>
          </div>
        )}

        {page === "quiz" && (
          <>
            {loading ? (
              <div className="loading-container"><div className="spinner"></div></div>
            ) : !result ? (
              <>
                <div className="quiz-header">
                  <span>Subject: {selectedSubject}</span>
                  <span>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
                </div>
                <h2>{index + 1}. {renderContent(question.question)}</h2>
                <ul>
                  {option_array.map((opt, i) => (
                    <li key={i} ref={opt} onClick={(e) => checkAns(e, i + 1)}>
                      {renderContent(question[`option${i + 1}`])}
                    </li>
                  ))}
                </ul>
                <button onClick={next} disabled={!lock}>{index === questions.length - 1 ? "Finish Quiz" : "Next"}</button>
                <div className="index">{index + 1} of {questions.length}</div>
              </>
            ) : (
              <div className="result">
                <h2>Quiz Completed</h2>
                <h3>Score: {score}/{questions.length}</h3>
                <p>Your results have been sent to the board.</p>
                <button onClick={reset}>Restart</button>
              </div>
            )}
          </>
        )}
      </div>
    </MathJaxContext>
  );
};

export default Quiz;