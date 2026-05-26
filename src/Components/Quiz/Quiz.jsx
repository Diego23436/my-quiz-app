import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import localData from "./questions.json";
import { getSubjectsForSeries } from "../../config/seriesConfig";
// ─── MathJax Config ────────────────────────────────────────────────────────────
const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
  },
  options: {
    enableMenu: false,
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
  },
  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: true,
  },
};
const QUIZ_TIME = 60 * 60;
// ─── The minimum question index (0-based) at which the session lock is committed.
// index 24 = the student is ON question 25. Once they reach this point and
// move forward (or the session is written), they are permanently locked out
// for this subject/schedule window.
const LOCK_THRESHOLD_INDEX = 24;
// ─── Helper: normalise strings for comparison (lowercase, trim whitespace) ────
const norm = (str) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
const Quiz = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState("welcome");
  const [authUser, setAuthUser] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false); // For teacher testing
  const [user, setUser] = useState({
    name: "",
    school: "",
    email: "",
    phone: "",
    town: "",
    series: "",
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
  const [examEndTimes, setExamEndTimes] = useState({}); // New: End times for exams
  // Tracks whether the permanent lock record has already been written for this
  // session so we don't duplicate Firestore writes.
  const lockWrittenRef = useRef(false);
  const [showAds, setShowAds] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [nextQuestionPending, setNextQuestionPending] = useState(false);
  const [adsCanClose, setAdsCanClose] = useState(false);
  const adIntervalRef = useRef(null);
  const adCloseTimerRef = useRef(null);
  const getAdsArray = () => {
    const questionNum = index + 1;
    if (questionNum <= 15) return [ads11, ads12, ads13, ads14];
    if (questionNum <= 30) return [ads21, ads22, ads23];
    return [ads31, ads32, ads33];
  };
  const adsArray = getAdsArray();
  const testimonialImages = [t1, t2, t3];
  const [showTestimonials, setShowTestimonials] = useState(false);
  const [testimonialCanClose, setTestimonialCanClose] = useState(false);
  const testimonialIntervalRef = useRef(null);
  const testimonialCloseTimerRef = useRef(null);

  // Get subjects based on user's series (filtered)
  const subjectOptions = useMemo(() => {
    return user.series ? getSubjectsForSeries(user.series) : [];
  }, [user.series]);

  const question = questions[index] || {};

  const concoursInfo = [
    "Medicine (FMPS, FMBS, FHS and many others)",
    "IUT",
    "FET",
    "COT",
    "COLTECH",
    "PUBLIC WORKS",
  ];

  const promoMessages = [
    "With Leadex, you will have the best for your preparatory classes",
    "Choose Leadex today and celebrate tomorrow",
    "Catch-up lessons will be provided for medical students who didn’t offer physics",
    "Your success is our top priority",
    "Leadex helps you stay ahead with exam-ready support",
    "Strong performance starts with focused preparation",
  ];
  const displayQuestionNumber = index + 1;
  const promoExclusions = new Set([16, 31, 46]);
  const showPromoPhrase =
    displayQuestionNumber > 5 &&
    displayQuestionNumber % 5 === 1 &&
    !promoExclusions.has(displayQuestionNumber);
  const promoPhrase = promoMessages[
    Math.floor((displayQuestionNumber - 6) / 5) % promoMessages.length
  ];
  const option1 = useRef(null);
  const option2 = useRef(null);
  const option3 = useRef(null);
  const option4 = useRef(null);
  const option_array = [option1, option2, option3, option4];

  useEffect(() => {
    setMathReady(false);
  }, [index, question.question]);

  // ─── Fetch exam schedules from Firebase ────────────────────────────────────
  useEffect(() => {
    const fetchExamSchedules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "exam_schedules"));
        const schedules = {};
        querySnapshot.forEach((docSnap) => {
          schedules[docSnap.id] = docSnap.data();
        });
        setExamSchedules(schedules);
      } catch (err) {
        console.error("Error fetching exam schedules:", err);
      }
    };
    fetchExamSchedules();
  }, []);
  // ─── Time availability check ────────────────────────────────────────────────
  const isSubjectAvailable = (subName) => {
    const now = new Date();
    const schedule = examSchedules[subName];
    if (!schedule || !schedule.date || !schedule.time) return false;
    const [year, month, day] = schedule.date.split("-").map(Number);
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const scheduledTime = new Date(year, month - 1, day, hours, minutes, 0);
    return now >= scheduledTime;
  };
  // ─── Get the current schedule key for a subject ─────────────────────────────
  // The schedule key is derived from the subject's current date+time in Firebase.
  // When admins reschedule a subject to a new date/time, this key changes,
  // which makes all old lock records irrelevant — the new session is open to all.
  //
  // Firebase session document path:
  //   active_sessions / {subjectName}_{scheduleKey}_{fieldHash}
  //
  // Where fieldHash encodes one of: email, phone, or normalised full name.
  // We store THREE documents per student per session (one per field), so any
  // single matching field will trigger the lock.
  const getScheduleKey = (subName) => {
    const schedule = examSchedules[subName];
    if (!schedule || !schedule.date || !schedule.time) return "unscheduled";
    // e.g. "2025-11-15_09:00" — unique per schedule window
    return `${schedule.date}_${schedule.time}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  };
  // ─── Build the 3 session doc IDs for a student + subject ───────────────────
  // Each ID encodes ONE identifying field so that matching any one is sufficient.
  // The student never knows which field triggered the block.
  const buildSessionIDs = (subName, scheduleKey) => {
    const subKey = subName.replace(/\s+/g, "");
    const emailKey = norm(user.email).replace(/[^a-z0-9]/g, "_");
    const phoneKey = norm(user.phone).replace(/[^0-9]/g, "");
    const nameKey = norm(user.name).replace(/[^a-z0-9]/g, "_");
    return [
      `${subKey}_${scheduleKey}_e_${emailKey}`,
      `${subKey}_${scheduleKey}_p_${phoneKey}`,
      `${subKey}_${scheduleKey}_n_${nameKey}`,
    ];
  };
  // ─── Check if student is already locked out (any field match) ──────────────
  const isStudentLocked = async (subName) => {
    const scheduleKey = getScheduleKey(subName);
    const sessionIDs = buildSessionIDs(subName, scheduleKey);
    // Check all 3 documents in parallel — if ANY exists, student is locked
    const checks = await Promise.all(
      sessionIDs.map((id) => getDoc(doc(db, "active_sessions", id)))
    );
    return checks.some((snap) => snap.exists());
  };
  // ─── Write the lock records to Firebase (called at question 25) ────────────
  // Writing all 3 documents ensures that even if the student logs in next time
  // with a different email but same phone or name, they are still blocked.
  const writeLockRecords = async (subName) => {
    if (lockWrittenRef.current) return; // already written this session
    lockWrittenRef.current = true;
    const scheduleKey = getScheduleKey(subName);
    const sessionIDs = buildSessionIDs(subName, scheduleKey);
    const payload = {
      subject: subName,
      schedule_key: scheduleKey,
      student_email: norm(user.email),
      student_phone: norm(user.phone),
      student_name: norm(user.name),
      locked_at: new Date().toLocaleString(),
      locked_at_question: index + 1,
    };
    try {
      await Promise.all(
        sessionIDs.map((id) => setDoc(doc(db, "active_sessions", id), payload))
      );
    } catch (err) {
      console.error("Failed to write lock records:", err);
    }
  };
  // ─── Start subject quiz ─────────────────────────────────────────────────────
  const startSubjectQuiz = async (subjectName) => {
    // 1. Check timing
    if (!isSubjectAvailable(subjectName)) {
      const schedule = examSchedules[subjectName];
      if (schedule && schedule.date && schedule.time) {
        alert(
          `${subjectName} is scheduled for ${schedule.date} at ${schedule.time}. Please wait until the scheduled time.`
        );
      } else {
        alert(`${subjectName} exam schedule has not been set yet.`);
      }
      return;
    }

    // 1b. Check if exam has ended (if end time is set)
    const schedule = examSchedules[subjectName];
    if (schedule && schedule.end_time) {
      const now = new Date();
      const [endHours, endMinutes] = schedule.end_time.split(":").map(Number);
      const [endDateYear, endDateMonth, endDateDay] = schedule.date.split("-").map(Number);
      const endDateTime = new Date(endDateYear, endDateMonth - 1, endDateDay, endHours, endMinutes, 0);
      
      if (now > endDateTime) {
        alert(`${subjectName} exam has ended. You can no longer access this subject.`);
        return;
      }
    }

    // 2. Check if student is locked out (any of the 3 fields already recorded)
    // Skip lock check if in test mode
    if (!isTestMode) {
      try {
        const locked = await isStudentLocked(subjectName);
        if (locked) {
          alert(
            ` Access Denied\n\nYour session for "${subjectName}" has already been recorded.\n\nPlease wait for the next scheduled session to attempt it again.`
          );
          return;
        }
      } catch (err) {
        alert("Error verifying your session: " + err.message);
        return;
      }
    }

    // 3. Load questions and start
    const data = localData[subjectName];
    if (data && data.length > 0) {
      lockWrittenRef.current = false; // reset for fresh session
      setMathReady(false);
      setQuestions(data);
      setSelectedSubject(subjectName);
      setPage("quiz");
    } else {
      alert("No questions found locally for " + subjectName);
    }
  };
  // ─── Commit the lock when student reaches question 25 ──────────────────────
  // This fires whenever `index` changes during an active quiz session.
  // Once index >= LOCK_THRESHOLD_INDEX (i.e. question 25+), the 3 lock records
  // are written to Firebase. From this point on, even a page refresh cannot
  // let the student back in — the check in startSubjectQuiz will block them.
  useEffect(() => {
    if (
      page === "quiz" &&
      !result &&
      selectedSubject &&
      index >= LOCK_THRESHOLD_INDEX &&
      !lockWrittenRef.current
    ) {
      writeLockRecords(selectedSubject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, page, result, selectedSubject]);
  // ─── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (page !== "quiz" || result || questions.length === 0 || showTestimonials) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTestimonials(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [page, result, questions.length, showTestimonials]);

  // ─── Check authentication on mount and load user data ──────────────────────
  useEffect(() => {
    // Check for test mode from teacher
    const testModeData = localStorage.getItem("testMode");
    if (testModeData) {
      try {
        const testData = JSON.parse(testModeData);
        if (testData.enabled) {
          setIsTestMode(true);
          // Set dummy user data for test mode
          setUser({
            name: "Teacher Test",
            email: "teacher@test.com",
            school: "Test School",
            phone: "000-000-000",
            town: "Test Town",
            series: "S1",
          });
          setPage("subject-select");
          localStorage.removeItem("testMode"); // Remove after reading
          return;
        }
      } catch (error) {
        console.error("Error parsing test mode data:", error);
      }
    }

    // Normal authentication flow
    const unsubscribe = onAuthStateChanged(auth, async (authUserFromFirebase) => {
      if (authUserFromFirebase) {
        setAuthUser(authUserFromFirebase);
        // Load user data from Firestore
        const userDocSnap = await getDoc(doc(db, "users", authUserFromFirebase.uid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({
            name: userData.name,
            email: userData.email,
            school: userData.school,
            phone: userData.phone,
            town: userData.town,
            series: userData.series,
          });
          setPage("subject-select");
        }
      } else {
        // Check if user data exists in localStorage (student who just signed in)
        const storedUserData = localStorage.getItem("studentUser");
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser({
              name: userData.name,
              email: userData.email,
              school: userData.school,
              phone: userData.phone,
              town: userData.town,
              series: userData.series,
            });
            setPage("subject-select");
          } catch (error) {
            console.error("Error parsing stored user data:", error);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── Login handler (DEPRECATED - kept for reference but not used) ────────────
  // Students now use SignIn/SignUp components
  const handleUnifiedLogin = async () => {
    // This is kept for backward compatibility but should not be called
    // New authentication flow uses SignIn.jsx and SignUp.jsx components
    alert("Please use the Sign In page to login");
    navigate("/signin");
  };
  // ─── Answer checker ─────────────────────────────────────────────────────────
  const checkAns = (e, ansIndex) => {
    if (lock || !question.ans) return;
    if (question.ans === ansIndex) {
      e.currentTarget.classList.add("correct");
      setScore((prev) => prev + 1);
    } else {
      e.currentTarget.classList.add("wrong");
    }
    option_array[question.ans - 1]?.current?.classList.add("correct", "expanded");
    setLock(true);
  };
  // ─── Proceed to next question ────────────────────────────────────────────────
  const proceedToNextQuestion = () => {
    setMathReady(false);
    option_array.forEach((opt) =>
      opt.current?.classList.remove("wrong", "correct", "expanded")
    );
    setShowAds(false);
    setNextQuestionPending(false);
    setAdsCanClose(false);
    if (index === questions.length - 1) {
      setShowTestimonials(true);
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
      setShowTestimonials(true);
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
  // ─── Ads display sequence ───────────────────────────────────────────────────
  useEffect(() => {
    if (!showAds) return;
    setAdsCanClose(false);
    setCurrentAdIndex(0);
    if (adIntervalRef.current) clearInterval(adIntervalRef.current);
    if (adCloseTimerRef.current) clearTimeout(adCloseTimerRef.current);
    adIntervalRef.current = setInterval(() => {
      setCurrentAdIndex((prev) => {
        if (prev < adsArray.length - 1) return prev + 1;
        clearInterval(adIntervalRef.current);
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
  }, [showAds]);
  // ─── Testimonials display ───────────────────────────────────────────────────
  useEffect(() => {
    if (!showTestimonials) return;
    setTestimonialCanClose(true);
    if (testimonialIntervalRef.current) clearTimeout(testimonialIntervalRef.current);
    if (testimonialCloseTimerRef.current) clearTimeout(testimonialCloseTimerRef.current);
    testimonialCloseTimerRef.current = setTimeout(() => {
      setShowTestimonials(false);
      setResult(true);
    }, 30000);
    return () => {
      if (testimonialIntervalRef.current) clearTimeout(testimonialIntervalRef.current);
      if (testimonialCloseTimerRef.current) clearTimeout(testimonialCloseTimerRef.current);
    };
  }, [showTestimonials]);
  // ─── Save result to Firebase ─────────────────────────────────────────────────
  // Skip saving if in test mode or if user is not properly authenticated
  useEffect(() => {
    if (result && !saved && !isTestMode && user.email) {
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
            is_test: false, // Add flag for filtering if needed
          });
          setSaved(true);
        } catch (e) {
          console.error("Error saving result:", e);
        }
      };
      saveResult();
    } else if (result && !saved && isTestMode) {
      // In test mode, skip saving and just mark as saved
      setSaved(true);
    }
  }, [result, saved, isTestMode, questions.length, score, selectedSubject, timeLeft, user]);
  const handleCloseTestimonials = () => {
    if (!testimonialCanClose) return;
    if (testimonialIntervalRef.current) clearTimeout(testimonialIntervalRef.current);
    if (testimonialCloseTimerRef.current) clearTimeout(testimonialCloseTimerRef.current);
    setShowTestimonials(false);
    setResult(true);
  };
  // ─── Reset helpers ──────────────────────────────────────────────────────────
  const reset = () => {
    setPage("welcome");
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
    setSaved(false);
    setShowTestimonials(false);
    setTestimonialCanClose(false);
    setTimeLeft(QUIZ_TIME);
    lockWrittenRef.current = false;
  };
  const returnToSubjectPage = () => {
    setPage("subject-select");
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
    setSaved(false);
    setShowTestimonials(false);
    setTestimonialCanClose(false);
    setTimeLeft(QUIZ_TIME);
    setQuestions([]);
    setSelectedSubject("");
    lockWrittenRef.current = false;
  };
  // ─── Quiz content (MathJax) ──────────────────────────────────────────────────
  const quizContent = useMemo(
    () => (
      <div className="quiz-question-wrapper">
        {!mathReady && <div className="spinner"></div>}
        <MathJax
          dynamic={true}
          key={`math-box-${index}`}
          onTypeset={() => setMathReady(true)}
          hideUntilTypeset="every"
        >
          <h2>
            {index + 1}.{" "}
            <span dangerouslySetInnerHTML={{ __html: question.question }} />
          </h2>
          <ul>
            {[1, 2, 3, 4].map((num) => (
              <li
                key={`opt-${index}-${num}`}
                ref={option_array[num - 1]}
                onClick={(e) => checkAns(e, num)}
                className="option-box"
              >
                <div className="option-text">
                  <span
                    dangerouslySetInnerHTML={{ __html: question[`option${num}`] }}
                  />
                </div>
                {lock && question.ans === num && question.explanation && (
                  <div className="solution-payload">
                    <strong>Solution:</strong>{" "}
                    <span
                      dangerouslySetInnerHTML={{ __html: question.explanation }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </MathJax>
      </div>
    ),
    [index, mathReady, question, lock]
  );
  // ─── Result message ──────────────────────────────────────────────────────────
  const getResultMessage = () => {
    const percentage =
      questions.length > 0 ? (score / questions.length) * 100 : 0;

    if (percentage > 50) {
      return (
        <div className="result-message result-message--success">
          <span className="result-message__icon">🎉</span>
          <div>
            <p>
              <strong>Congratulations!</strong> You scored {score}/{questions.length} ({Math.round(percentage)}%).
            </p>
            <p>
              Great work! Keep using the app and continue your progress every day.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="result-message result-message--fail">
        <span className="result-message__icon">😢</span>
        <div>
          <p>
            <strong>Not yet there</strong> — but everything is still possible.
          </p>
          <p>
            Use our app and continue your daily progression.
          </p>
        </div>
      </div>
    );
  };
  // ─── Render ──────────────────────────────────────────────────────────────────
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
        {/* 
── Welcome ── */}
        {page === "welcome" && (
          <div className="welcome-page">
            <div className="welcome-card">
              <div className="welcome-image">
                <img src={img2} alt="Welcome" />
              </div>
              <div className="welcome-text">
                <h2>Welcome to PDV LEADEX EDUCATION</h2>
                <p>
                  Dear Candidate,
                  <br />
                  <br />
                  You are welcome to the{" "}
                  <strong>LEADEX National Quiz Application</strong>, a carefully
                  structured academic platform designed to strengthen your
                  examination readiness.
                  <br />
                  <br />
                  This quiz environment simulates real examination conditions,
                  helping you improve accuracy, time management, and confidence.
                  <br />
                  <br />
                  Read each question carefully and manage your time wisely. This
                  is a vital step toward achieving academic excellence.
                </p>
                <button onClick={() => navigate("/signin")}>Get Started</button>
              </div>
            </div>
          </div>
        )}
        {/* ── Login Page Removed - Now Using Separate SignIn/SignUp Pages ── */}
        {page === "subject-select" && (
          <div className="start-page">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <div style={{fontSize: '0.9rem', color: '#666'}}>
                <strong>Welcome:</strong> {user.name} ({user.series}) 
              </div>
              <button
                onClick={async () => {
                  await signOut(auth);
                  localStorage.removeItem("studentUser");
                  setUser({name: "", school: "", email: "", phone: "", town: "", series: ""});
                  setPage("welcome");
                  navigate("/");
                }}
                style={{
                  background: '#f44336',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                Logout
              </button>
            </div>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.9rem",
                color: "#553f9a",
              }}
            >
              {Object.keys(examSchedules).length > 0
                ? "View the lock status below. Click on an available subject to begin."
                : "Exam schedules are being updated by your school."}
            </p>
            <h2>CAMEROON GCE EXAMINATION</h2>
            <div className="subject-grid">
              {subjectOptions.map((subject) => {
                const available = isSubjectAvailable(subject.key);
                const schedule = examSchedules[subject.key];
                return (
                  <button
                    key={subject.key}
                    className="subject-btn"
                    onClick={() => startSubjectQuiz(subject.key)}
                    title={
                      schedule
                        ? `${schedule.date} at ${schedule.time}`
                        : "Schedule not set"
                    }
                    style={{
                      opacity: available ? 1 : 0.6,
                      filter: available ? "none" : "grayscale(80%)",
                    }}
                  >
                    {subject.label} {!available && "(Locked)"}
                  </button>
                );
              })}
            </div>
            <h2>CAMEROON CONCOURS</h2>
            <div className="subject-grid">
              {concoursInfo.map((item) => (
                <div key={item} className="subject-info-box">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── Quiz ── */}
        {page === "quiz" && (
          <>
            {!result ? (
              <>
                <div className="quiz-header">
                  <span>Subject: {selectedSubject}</span>
                  <span>
                     {Math.floor(timeLeft / 60)}:
                    {String(timeLeft % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="progress-container">
                  <div className="progress-info">
                    <span>
                      Question {index + 1} of {questions.length}
                    </span>
                    <span>
                      {Math.round(((index + 1) / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${((index + 1) / questions.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                {!showTestimonials && (
                  <>
                    {showPromoPhrase && (
                      <div className="promo-banner">
                        <strong>{promoPhrase}</strong>
                      </div>
                    )}
                    {quizContent}
                    <button
                      onClick={next}
                      disabled={!lock || showAds || showTestimonials}
                    >
                      {index === questions.length - 1 ? "Finish Quiz" : "Next"}
                    </button>
                  </>
                )}
                {/* ── Ads Modal ── */}
                {showAds && (
                  <div className="ads-modal-overlay">
                    <div className="ads-modal">
                      {adsArray.map((ad, idx) => (
                        <img
                          key={idx}
                          src={ad}
                          alt={`Ad ${idx + 1}`}
                          className={`ads-image ads-${idx} ${
                            idx <= currentAdIndex ? "ads-show" : "ads-hide"
                          }`}
                        />
                      ))}
                      <button
                        className="ads-close-button"
                        onClick={handleCloseAds}
                        disabled={!adsCanClose}
                        aria-label="Close ads"
                        style={{
                          opacity: adsCanClose ? 1 : 0,
                          pointerEvents: adsCanClose ? "auto" : "none",
                          transition: "opacity 0.4s ease",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                {/* ── Testimonials Modal ── */}
                {showTestimonials && (
                  <div className="testimonials-stage">
                    <div className="testimonials-card">
                      <button
                        className="testimonial-close-button"
                        onClick={handleCloseTestimonials}
                        disabled={!testimonialCanClose}
                        aria-label="Close testimonials"
                        style={{
                          opacity: testimonialCanClose ? 1 : 0,
                          pointerEvents: testimonialCanClose ? "auto" : "none",
                          transition: "opacity 0.4s ease",
                        }}
                      >
                        ×
                      </button>
                      <h2>Student Testimonials</h2>
                      <div className="testimonial-images">
                        {testimonialImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Testimonial ${idx + 1}`}
                            className={`testimonial-image testimonial-image-${
                              idx + 1
                            }`}
                          />
                        ))}
                      </div>
                      <p className="testimonial-note">
                        Your results are loading. Thank you for completing the
                        quiz.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── Results ── */
              <div className="result">
                <h2>Quiz Completed</h2>
                <h3>
                  Score: {score}/{questions.length}
                </h3>
                {getResultMessage()}
                <p>Your results have been sent to the board.</p>
                <button onClick={returnToSubjectPage}>
                  Return to Subject Page
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MathJaxContext>
  );
};
export default Quiz;