import React, { useRef, useState } from 'react';
import './Quiz.css';
import { data } from '../../assets/data';
import { MathJax, MathJaxContext } from "better-react-mathjax";

/* ✅ MathJax configuration */
const mathJaxConfig = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
  },
};

const Quiz = () => {

  const [index, setIndex] = useState(0);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(false);

  const question = data[index];

  const option1 = useRef(null);
  const option2 = useRef(null);
  const option3 = useRef(null);
  const option4 = useRef(null);

  const option_array = [option1, option2, option3, option4];

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

  const next = () => {
    if (!lock) return;

    option_array.forEach(option => {
      option.current.classList.remove("wrong");
      option.current.classList.remove("correct");
    });

    if (index === data.length - 1) {
      setResult(true);
    } else {
      setIndex(prev => prev + 1);
      setLock(false);
    }
  };

  const reset = () => {
    setIndex(0);
    setScore(0);
    setLock(false);
    setResult(false);
  };

  return (
    <div className="container">
      <h1>Quiz App</h1>
      <hr />

      <MathJaxContext config={mathJaxConfig}>
        {!result ? (
          <>
            {/* ✅ QUESTION */}
            <h2>
              {index + 1}.{" "}
              <MathJax dynamic>
                {question.question}
              </MathJax>
            </h2>

            {/* ✅ OPTIONS */}
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
            <h2>You scored {score} out of {data.length}</h2>
            <button onClick={reset}>Reset</button>
          </>
        )}
      </MathJaxContext>
    </div>
  );
};

export default Quiz;
