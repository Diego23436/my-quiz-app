import React, { useRef, useState, useEffect } from "react";
import "./Quiz.css";
import logo from "../../assets/logoldx.jpeg";
import img2 from "../../assets/img2.jpg";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { db, auth } from "../../firebaseConfig"; 
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import localData from "./questions.json"; // ✅ Import your partitioned JSON

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
  },
  options: { enableMenu: false }
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
  const option1 = useRef(null);
  const option2 = useRef(null);
  const option3 = useRef(null);
  const option4 = useRef(null);
  const option_array = [option1, option2, option3, option4];

  // ✅ UPDATED: Loads from JSON instead of Firebase
  const startSubjectQuiz = (subjectName) => {
    const data = localData[subjectName];
    if (data && data.length > 0) {
      setQuestions(data);
      setSelectedSubject(subjectName);
      setPage("quiz");
    } else {
      alert("No questions found locally for " + subjectName);
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
  }, [result, saved, questions.length, score, selectedSubject, timeLeft, user]);

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
                <h2>Welcome to LEADEX National Quiz</h2>
                <p>Dear Candidate,<br /><br />
          You are welcome to the <strong>LEADEX National Quiz Application</strong>,
          a carefully structured academic platform designed to strengthen your
          examination readiness.
          <br /><br />
          This quiz environment simulates real examination conditions, helping
          you improve accuracy, time management, and confidence.
          <br /><br />
          Read each question carefully and manage your time wisely.
          This is a vital step toward achieving academic excellence.</p>
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
              {/* Added Further Maths to the grid */}
              {["Mathematics", "Further Maths", "Physics", "Chemistry", "Biology", "ICT"].map((sub) => (
                <button key={sub} className="subject-btn" onClick={() => startSubjectQuiz(sub)}>{sub}</button>
              ))}
            </div>
          </div>
        )}

        {page === "quiz" && (
          <>
            {!result ? (
              <>
                <div className="quiz-header">
                  <span>Subject: {selectedSubject}</span>
                  <span>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
                </div>
                
                <h2>
                  {index + 1}.{" "}
                  <MathJax dynamic key={`q-${index}`}>
                    <span dangerouslySetInnerHTML={{ __html: question.question }} />
                  </MathJax>
                </h2>

                <ul>
                  <li ref={option1} onClick={(e) => checkAns(e, 1)}>
                    <MathJax dynamic key={`o1-${index}`}>
                       <span dangerouslySetInnerHTML={{ __html: question.option1 }} />
                    </MathJax>
                  </li>
                  <li ref={option2} onClick={(e) => checkAns(e, 2)}>
                    <MathJax dynamic key={`o2-${index}`}>
                       <span dangerouslySetInnerHTML={{ __html: question.option2 }} />
                    </MathJax>
                  </li>
                  <li ref={option3} onClick={(e) => checkAns(e, 3)}>
                    <MathJax dynamic key={`o3-${index}`}>
                       <span dangerouslySetInnerHTML={{ __html: question.option3 }} />
                    </MathJax>
                  </li>
                  <li ref={option4} onClick={(e) => checkAns(e, 4)}>
                    <MathJax dynamic key={`o4-${index}`}>
                       <span dangerouslySetInnerHTML={{ __html: question.option4 }} />
                    </MathJax>
                  </li>
                </ul>

                <button onClick={next} disabled={!lock}>{index === questions.length - 1 ? "Finish Quiz" : "Next"}</button>
                <div className="index">{index + 1} of {questions.length} questions</div>
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