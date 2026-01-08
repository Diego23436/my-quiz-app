import React, { useRef, useState, useEffect } from 'react';
import './Quiz.css';
import { data } from '../../assets/data';
import { MathJax, MathJaxContext } from "better-react-mathjax";
import emailjs from "emailjs-com";

// import emailjs from "emailjs-com"; // ← uncomment when ready

/* ================= MathJax config ================= */
const mathJaxConfig = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
  },
};

/* ================= Timer config ================= */
const QUIZ_TIME = 10 * 60; // 10 minutes

const Quiz = () => {

  /* ================= User info ================= */
  const [started, setStarted] = useState(false);
  const [user, setUser] = useState({
    name: "",
    school: "",
    town: "",
    email: "",
    phone: ""
  });

  /* ================= Quiz state ================= */
  const [index, setIndex] = useState(0);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);

  const question = data[index];

  /* ================= Option refs ================= */
  const option1 = useRef(null);
  const option2 = useRef(null);
  const option3 = useRef(null);
  const option4 = useRef(null);

  const option_array = [option1, option2, option3, option4];

  /* ================= Timer logic ================= */
  useEffect(() => {
    if (!started || result) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setResult(true);
          // sendResult(); // ← enable when EmailJS is ready
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, result]);

  /* ================= Answer check ================= */
  const checkAns = (e, ans) => {
    if (lock) return;

    if (question.ans === ans) {
      e.target.classList.add("correct");
      setScore(prev => prev + 1);
    } else {
      e.target.classList.add("wrong");
      option_array[question.ans - 1].current.classList.add("correct");
    }
    setLock(true);
  };

  /* ================= Next question ================= */
  const next = () => {
    if (!lock) return;

    option_array.forEach(option => {
      option.current.classList.remove("wrong");
      option.current.classList.remove("correct");
    });

    if (index === data.length - 1) {
      setResult(true);
       sendResult(); // ← enable when EmailJS is ready
    } else {
      setIndex(prev => prev + 1);
      setLock(false);
    }
  };

  /* ================= Reset ================= */
  const reset = () => {
    setStarted(false);
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
    setTimeLeft(QUIZ_TIME);
    setUser({ name: "", email: "", phone: "" });
  };

  /* ================= EmailJS (READY) ================= */
  
  const sendResult = () => {
    emailjs.send(
      "service_5ojaxm8",
      "template_yucjlem",
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        town: user.town,
        score: score,
        total: data.length
      },
      "0tav0bQO5S58qS97H"
    );
  };
  

  return (
    <div className="container">
      <h1>Quiz App</h1>
      <hr />

      {/* ================= START PAGE ================= */}
      {!started && (
        <div className="start-page">
          <h2>Enter Your Details</h2>

          <input
            type="text"
            placeholder="Full Name"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
          />

          <input
            type="text"
            placeholder="your school"
            value={user.school}
            onChange={(e) => setUser({ ...user, school: e.target.value })}
          />

          <input
            type="text"
            placeholder="your town"
            value={user.town}
            onChange={(e) => setUser({ ...user, town: e.target.value })}
          />

          <input
            type="email"
            placeholder="Email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={user.phone}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
          />

          <button
            onClick={() => {
              if (!user.name || !user.email || !user.school || !user.town || !user.phone) {
                alert("Please fill all fields");
              } else {
                setStarted(true);
              }
            }}
          >
            Start Quiz
          </button>
        </div>
      )}

      {/* ================= QUIZ ================= */}
      {started && (
        <MathJaxContext config={mathJaxConfig}>

          {/* ===== Header with timer ===== */}
          {!result && (
            <div className="quiz-header">
              ⏱ Time Left: {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}

          {!result ? (
            <>
              <h2>
                {index + 1}.{" "}
                <MathJax dynamic>{question.question}</MathJax>
              </h2>

              <ul>
                <li ref={option1} onClick={(e) => checkAns(e, 1)}>
                  <MathJax dynamic>{question.option1}</MathJax>
                </li>
                <li ref={option2} onClick={(e) => checkAns(e, 2)}>
                  <MathJax dynamic>{question.option2}</MathJax>
                </li>
                <li ref={option3} onClick={(e) => checkAns(e, 3)}>
                  <MathJax dynamic>{question.option3}</MathJax>
                </li>
                <li ref={option4} onClick={(e) => checkAns(e, 4)}>
                  <MathJax dynamic>{question.option4}</MathJax>
                </li>
              </ul>

              <button onClick={next}>Next</button>

              <div className="index">
                {index + 1} of {data.length} questions
              </div>
            </>
          ) : (
            <>
              <h2>Quiz Completed</h2>
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>School:</strong> {user.school}</p>
              <p><strong>Town:</strong> {user.town}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Phone:</strong> {user.phone}</p>
              <h3>Score: {score} / {data.length}</h3>

              <button onClick={reset}>Reset</button>
            </>
          )}

        </MathJaxContext>
      )}
    </div>
  );
};

export default Quiz;
