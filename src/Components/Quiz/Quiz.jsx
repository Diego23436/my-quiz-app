import React, { useRef, useState, useEffect, useMemo } from "react";
import "./Quiz.css";
import logo from "../../assets/logoldx.jpeg";
import img2 from "../../assets/img2.jpg";
import img3 from "../../assets/img3.jpg";
import ads11 from "../../assets/ads11.jpg";
import ads12 from "../../assets/ads12.jpg";
import ads13 from "../../assets/ads13.jpg";
import ads14 from "../../assets/ads14.jpg";
import ads21 from "../../assets/ads21.jpg";
import ads22 from "../../assets/ads22.jpg";
import ads23 from "../../assets/ads23.jpg";
import ads31 from "../../assets/ads31.jpg";
import ads32 from "../../assets/ads32.jpg";
import ads33 from "../../assets/ads33.jpg";
import t1 from "../../assets/t1.jpg";
import t2 from "../../assets/t2.jpg";
import t3 from "../../assets/t3.jpg";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, doc, getDoc, setDoc, getDocs } from "firebase/firestore"; // Added getDocs
import { signInWithEmailAndPassword } from "firebase/auth";
import localData from "./questions.json"; 

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
  },
  options: { 
    enableMenu: false,
    ignoreHtmlClass: "tex2jax_ignore",
    processHtmlClass: "tex2jax_process",
    renderActions: {
        addMenu: [] 
    }
  },
  chtml: {
    scale: 1,                       
    minScale: 0.5,                  
    matchFontHeight: true           
  }
};

const QUIZ_TIME = 45 * 60;

const Quiz = () => {
  const [page, setPage] = useState("welcome");
  const [user, setUser] = useState({
    name: "", school: "", email: "", phone: "", password: "", role: "user", town: "", series: "",
  });

  const [questions, setQuestions] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [index, setIndex] = useState(0);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [saved, setSaved] = useState(false);
  const [mathReady, setMathReady] = useState(false);
  const [examSchedules, setExamSchedules] = useState({});
  const [showAds, setShowAds] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [nextQuestionPending, setNextQuestionPending] = useState(false);
  const [adsCanClose, setAdsCanClose] = useState(false);
  const adIntervalRef = useRef(null);
  const adCloseTimerRef = useRef(null);

  // Function to get the correct ads array based on current question
  const getAdsArray = () => {
    const questionNum = index + 1;
    if (questionNum <= 15) {
      return [ads11, ads12, ads13, ads14];
    } else if (questionNum <= 30) {
      return [ads21, ads22, ads23];
    } else {
      return [ads31, ads32, ads33];
    }
  };

  const adsArray = getAdsArray();
  const testimonialImages = [t1, t2, t3];
  const [showTestimonialCarousel, setShowTestimonialCarousel] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialCloseVisible, setTestimonialCloseVisible] = useState(false);
  const [isMobileCarousel, setIsMobileCarousel] = useState(false);
  const testimonialIntervalRef = useRef(null);

  const question = questions[index] || {};
  const option1 = useRef(null);
  const option2 = useRef(null);
  const option3 = useRef(null);
  const option4 = useRef(null);
  const option_array = [option1, option2, option3, option4];

  // Fetch exam schedules from Firebase
  useEffect(() => {
    const fetchExamSchedules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "exam_schedules"));
        const schedules = {};
        querySnapshot.forEach((doc) => {
          schedules[doc.id] = doc.data();
        });
        setExamSchedules(schedules);
      } catch (err) {
        console.error("Error fetching exam schedules:", err);
      }
    };
    fetchExamSchedules();
  }, []);

  // Helper to check time availability
  const isSubjectAvailable = (subName) => {
    const now = new Date();
    const schedule = examSchedules[subName];
    if (!schedule || !schedule.date || !schedule.time) return false;

    const [year, month, day] = schedule.date.split('-').map(Number);
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const scheduledTime = new Date(year, month - 1, day, hours, minutes, 0);

    return now >= scheduledTime;
  };

  // Logic to lock session on Firebase when starting
  const startSubjectQuiz = async (subjectName) => {
    // Check Timing Constraint first
    if (!isSubjectAvailable(subjectName)) {
      const schedule = examSchedules[subjectName];
      if (schedule && schedule.date && schedule.time) {
        alert(`${subjectName} is scheduled for ${schedule.date} at ${schedule.time}. Please wait until the scheduled time.`);
      } else {
        alert(`${subjectName} exam schedule has not been set yet.`);
      }
      return;
    }

    // Generate unique ID for this student and this subject to prevent restart
    const sessionID = `${user.email.toLowerCase().trim()}_${subjectName.replace(/\s+/g, '')}`;
    const sessionRef = doc(db, "active_sessions", sessionID);

    try {
      /* // SESSION LOCKING LOGIC - COMMENTED OUT TO ALLOW RE-ENTRY
          npm run dev  const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        alert(`Access Denied: You have already attempted or started ${subjectName}. You cannot restart.`);
        return;
      }

      // Record the start of the session in Firebase
      await setDoc(sessionRef, {
        student_email: user.email.toLowerCase().trim(),
        subject: subjectName,
        startTime: new Date().toLocaleString(),
        status: "in-progress"
      });
      */

      const data = localData[subjectName];
      if (data && data.length > 0) {
        setMathReady(false); 
        setQuestions(data);
        setSelectedSubject(subjectName);
        setPage("quiz");
      } else {
        alert("No questions found locally for " + subjectName);
      }
    } catch (error) {
      alert("Error checking session: " + error.message);
    }
  };

  useEffect(() => {
    if (page !== "quiz" || result || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTestimonialCarousel(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [page, result, questions.length]);

  const handleUnifiedLogin = async () => {
    if (user.role === "user") {
      if (!user.name || !user.email || !user.school || !user.phone || !user.town || !user.series) {
        alert("Please fill all required fields");
        return;
      }

      // EMAIL CONSTRAINT: Only @gmail.com or @icloud.com
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|icloud)\.com$/;
      if (!emailRegex.test(user.email.toLowerCase().trim())) {
        alert("Access Denied: Please use a valid @gmail.com or @icloud.com email address.");
        return;
      }

      // PHONE CONSTRAINT: 6xx-xxx-xxx
      const phoneRegex = /^6\d{2}-\d{3}-\d{3}$/;
      if (!phoneRegex.test(user.phone)) {
        alert("Invalid Phone Format: Please use the format 6xx-xxx-xxx");
        return;
      }

      setPage("subject-select");
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
      e.currentTarget.classList.add("correct");
      setScore((prev) => prev + 1);
    } else {
      e.currentTarget.classList.add("wrong");
    }
    // Highlight the correct answer and expand it
    option_array[question.ans - 1]?.current?.classList.add("correct", "expanded");
    setLock(true);
  };

  const proceedToNextQuestion = () => {
    setMathReady(false);
    option_array.forEach((opt) => opt.current?.classList.remove("wrong", "correct", "expanded"));
    setShowAds(false);
    setNextQuestionPending(false);
    setAdsCanClose(false);

    if (index === questions.length - 1) {
      setShowTestimonialCarousel(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setLock(false);
  };

  const handleCloseAds = () => {
    if (!adsCanClose) return;
    proceedToNextQuestion();
  };

  const next = () => {
    if (!lock) return;
    
    if (index === questions.length - 1) {
      setShowTestimonialCarousel(true);
      return;
    }
    
    if ((index + 1) % 15 === 0) {
      setShowAds(true);
      setCurrentAdIndex(0);
      setAdsCanClose(false);
      setNextQuestionPending(true);
    } else {
      proceedToNextQuestion();
    }
  };

  // Handle ads display sequence
  useEffect(() => {
    if (!showAds) return;
    
    setAdsCanClose(false);
    if (adIntervalRef.current) {
      clearInterval(adIntervalRef.current);
    }
    if (adCloseTimerRef.current) {
      clearTimeout(adCloseTimerRef.current);
    }

    adIntervalRef.current = setInterval(() => {
      setCurrentAdIndex((prev) => {
        if (prev < adsArray.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 500);

    adCloseTimerRef.current = setTimeout(() => {
      setAdsCanClose(true);
    }, 10000);

    return () => {
      clearInterval(adIntervalRef.current);
      clearTimeout(adCloseTimerRef.current);
    };
  }, [showAds, adsArray.length]);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobileCarousel(typeof window !== "undefined" && window.innerWidth <= 768);
    };

    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    if (!showTestimonialCarousel) return;

    setTestimonialIndex(0);
    setTestimonialCloseVisible(false);
    if (testimonialIntervalRef.current) {
      clearInterval(testimonialIntervalRef.current);
    }

    testimonialIntervalRef.current = setInterval(() => {
      setTestimonialIndex((prev) => {
        if (prev < testimonialImages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 11000);

    return () => {
      clearInterval(testimonialIntervalRef.current);
    };
  }, [showTestimonialCarousel]);

  useEffect(() => {
    if (showTestimonialCarousel && testimonialIndex === testimonialImages.length - 1) {
      setTestimonialCloseVisible(true);
    }
  }, [showTestimonialCarousel, testimonialIndex]);

  const handleCloseCarousel = () => {
    if (!testimonialCloseVisible) return;
    setShowTestimonialCarousel(false);
    setResult(true);
    setTestimonialIndex(0);
    setTestimonialCloseVisible(false);
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
            town: user.town,
            series: user.series,
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

  const returnToSubjectPage = () => {
    setPage("subject-select");
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
    setSaved(false);
    setTimeLeft(QUIZ_TIME);
    setQuestions([]);
    setSelectedSubject("");
  };

  const quizContent = useMemo(() => (
    <div className={`tex2jax_process ${mathReady ? "visible" : "hidden"}`}>
      <MathJax 
        dynamic 
        key={`math-box-${index}`} 
        onTypeset={() => setMathReady(true)}
      >
        <h2>
          {index + 1}. <span dangerouslySetInnerHTML={{ __html: question.question }} />
        </h2>

        <ul>
          {[1, 2, 3, 4].map((num) => (
            <li 
              key={`opt-${index}-${num}`} 
              ref={option_array[num-1]} 
              onClick={(e) => checkAns(e, num)}
              className="option-box"
            >
              <div className="option-text">
                <span dangerouslySetInnerHTML={{ __html: question[`option${num}`] }} />
              </div>
              
              {/* Solution box appears only if this is the correct answer AND the user has locked their choice */}
              {lock && question.ans === num && question.explanation && (
                <div className="solution-payload">
                   <strong>Solution:</strong> <span dangerouslySetInnerHTML={{ __html: question.explanation }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </MathJax>
    </div>
  ), [index, mathReady, question, lock]);

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="container">
        <h1>PDV LEADEX EDUCATION</h1>
        <h1>National Quiz</h1>
        <div className="logo-container">
          <img src={logo} alt="Logo" className="logo-image" />
          <img src={img3} alt="Additional" className="logo-image" />
        </div>
        <hr />

        {page === "welcome" && (
          <div className="welcome-page">
            <div className="welcome-card">
              <div className="welcome-image"><img src={img2} alt="Welcome" /></div>
              <div className="welcome-text">
                <h2>Welcome to PDV LEADEX EDUCATION</h2>
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
            <input 
              type="email" 
              placeholder="Email (@gmail or @icloud)" 
              value={user.email}
              onChange={(e) => setUser({...user, email: e.target.value})} 
            />
            {user.role === "user" ? (
              <>
                <input type="text" placeholder="Full Name" onChange={(e) => setUser({...user, name: e.target.value})} />
                <input type="text" placeholder="School Name" onChange={(e) => setUser({...user, school: e.target.value})} />
                <input type="text" placeholder="Town" onChange={(e) => setUser({...user, town: e.target.value})} />
                <input type="text" placeholder="Series" onChange={(e) => setUser({...user, series: e.target.value})} />
                <input 
                  type="text" 
                  placeholder="Phone Number (6xx-xxx-xxx)" 
                  value={user.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, ""); 
                    if (val.length > 9) val = val.slice(0, 9);
                    let formatted = val;
                    if (val.length > 3 && val.length <= 6) {
                      formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
                    } else if (val.length > 6) {
                      formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
                    }
                    setUser({...user, phone: formatted});
                  }} 
                />
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
            <p style={{textAlign: 'center', fontSize: '0.9rem', color: '#553f9a'}}>
                {Object.keys(examSchedules).length > 0
                  ? "View the lock status below. Click on an available subject to begin."
                  : "Exam schedules are being updated by your school."}
            </p>
            <div className="subject-grid">
              {["Mathematics", "Further Maths", "Physics", "Chemistry", "Biology", "ICT"].map((sub) => {
                const available = isSubjectAvailable(sub);
                const schedule = examSchedules[sub];
                return (
                  <button
                    key={sub}
                    className="subject-btn"
                    onClick={() => startSubjectQuiz(sub)}
                    title={schedule ? `${schedule.date} at ${schedule.time}` : "Schedule not set"}
                    style={{
                        opacity: available ? 1 : 0.6,
                        filter: available ? 'none' : 'grayscale(80%)'
                    }}
                  >
                    {sub} {!available && "(Locked)"}
                  </button>
                );
              })}
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

                <div className="progress-container">
                  <div className="progress-info">
                    <span>Question {index + 1} of {questions.length}</span>
                    <span>{Math.round(((index + 1) / questions.length) * 100)}%</span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {quizContent}

                {!mathReady && <div className="spinner"></div>}

                <button onClick={next} disabled={!lock || !mathReady || showAds || showTestimonialCarousel}>
                  {index === questions.length - 1 ? "Finish Quiz" : "Next"}
                </button>

                {/* Ads Modal */}
                {showAds && (
                  <div className="ads-modal-overlay">
                    <div className="ads-modal">
                      {adsArray.map((ad, idx) => (
                        <img
                          key={idx}
                          src={ad}
                          alt={`Ad ${idx + 1}`}
                          className={`ads-image ads-${idx} ${idx <= currentAdIndex ? "ads-show" : "ads-hide"}`}
                        />
                      ))}
                      <button
                        className={`ads-close-button ${adsCanClose ? "visible" : "hidden"}`}
                        onClick={handleCloseAds}
                        disabled={!adsCanClose}
                        aria-label="Close ads"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {showTestimonialCarousel && (
                  <div className="carousel-overlay">
                    <div className="carousel-modal">
                      <div className="carousel-track" style={{
                        transform: isMobileCarousel
                          ? `translateY(-${testimonialIndex * 100}%)`
                          : `translateX(-${testimonialIndex * 100}%)`
                      }}>
                        {testimonialImages.map((img, idx) => (
                          <div key={idx} className="carousel-slide">
                            <img src={img} alt={`Testimonial ${idx + 1}`} />
                          </div>
                        ))}
                      </div>
                      <button
                        className={`carousel-close-button ${testimonialCloseVisible ? "visible" : "hidden"}`}
                        onClick={handleCloseCarousel}
                        disabled={!testimonialCloseVisible}
                        aria-label="Close testimonial carousel"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="result">
                <h2>Quiz Completed</h2>
                <h3>Score: {score}/{questions.length}</h3>
                <p>Your results have been sent to the board.</p>
                <button onClick={returnToSubjectPage}>Return to Subject Page</button>
              </div>
            )}
          </>
        )}
      </div>
    </MathJaxContext>
  );
};

export default Quiz;