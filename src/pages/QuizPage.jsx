import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const QuizPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);

  const generateQuiz = async () => {
    setLoading(true);
    setError('');
    setQuestions([]);
    setShowScore(false);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUserAnswers([]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Please set VITE_GEMINI_API_KEY in your .env file');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const randomSeed = Math.floor(Math.random() * 999999);
      const prompt = `Generate a 10-question multiple choice quiz based strictly on the following biblical church topics taught at HMCI Waterberg: The Holy Bible guidelines, End Times, Book of Revelation, Junior Youth teachings, Kingdom Kids, and Anagkazo by Dag Heward-Mills. 
      CRITICAL INSTRUCTION: Ensure the questions are highly varied and completely different from standard basic questions. Focus on deep details, specific biblical parables, historical contexts, practical daily examples, and advanced nuances of the teachings. Do not simply ask definitions. Random execution seed: ${randomSeed}.
      Output ONLY a valid JSON array of objects, with no markdown formatting or extra text. Each object should have:
      - "question" (string)
      - "options" (array of 4 strings)
      - "answer" (string, must exactly match one of the options)
      Example: [{"question": "What is Anagkazo?", "options": ["Compel", "Leave", "Pray", "Sing"], "answer": "Compel"}]`;
      let result;
      let attempt = 0;
      const maxRetries = 3;
      
      while (attempt < maxRetries) {
        try {
          result = await model.generateContent(prompt);
          break; // success, exit the retry loop
        } catch (e) {
          if (e.message.includes('503') && attempt < maxRetries - 1) {
            attempt++;
            // wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          } else {
            throw e; // throw if it's not a 503 or we ran out of retries
          }
        }
      }

      const responseText = result.response.text();
      
      let parsedQuestions = [];
      try {
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedQuestions = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('Failed to parse quiz format from AI response.');
      }

      setQuestions(parsedQuestions);
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('Quota')) {
        // Fallback unlimited local quiz pool when Google disables the free tier
        const offlineQuestionsPool = [
          { question: "What is the primary meaning of the word 'Anagkazo'?", options: ["To leave", "To compel", "To sleep", "To walk"], answer: "To compel" },
          { question: "Who is the author of the Anagkazo teachings?", options: ["Benny Hinn", "Dag Heward-Mills", "Chris Oyakhilome", "Kenneth Hagin"], answer: "Dag Heward-Mills" },
          { question: "Which book of the Bible primarily deals with End Times prophecies?", options: ["Genesis", "Proverbs", "Revelation", "Psalms"], answer: "Revelation" },
          { question: "How does the Bible suggest we should treat the End Times?", options: ["Be watchful and prepared", "Ignore them completely", "Be terrified daily", "Only pray once a year"], answer: "Be watchful and prepared" },
          { question: "The Junior Youth teachings at HMCI target which primary age group?", options: ["Adults", "Pastors only", "13 to 15 years", "Infants"], answer: "13 to 15 years" },
          { question: "What is Kingdom Kids designed for?", options: ["Building elderly homes", "Teaching the Gospel to young children", "Cooking competitions", "Financial seminars"], answer: "Teaching the Gospel to young children" },
          { question: "According to biblical guidelines, the Holy Bible is inspired by who?", options: ["Angels", "Government", "God", "Scientists"], answer: "God" },
          { question: "What does 'Revelation' mean in the biblical context?", options: ["To hide something", "To unveil or disclose", "A loud noise", "A new song"], answer: "To unveil or disclose" },
          { question: "What does the 'Anagkazo' mandate urge Christians to do?", options: ["Relax at home", "Compel people into God's house", "Avoid strangers", "Only focus on themselves"], answer: "Compel people into God's house" },
          { question: "Which is considered a key sign of the End Times in biblical teachings?", options: ["Universal peace", "Deception and false prophets", "Everyone getting rich", "No more sickness globally"], answer: "Deception and false prophets" },
          { question: "What is the main weapon of a Christian according to the Holy Bible?", options: ["Money", "The Word of God", "Physical strength", "Popularity"], answer: "The Word of God" },
          { question: "In the context of the Junior Youth teachings, how should youth act?", options: ["As examples to believers", "With constant rebellion", "By avoiding church", "By isolating themselves"], answer: "As examples to believers" },
          { question: "The word 'Bible' comes from the Greek word 'Biblia', which means?", options: ["Holy Word", "The Books", "Ancient Scroll", "God's Voice"], answer: "The Books" },
          { question: "How many books make up the standard Protestant Holy Bible?", options: ["66", "73", "39", "27"], answer: "66" },
          { question: "Which event is often described as the 'Rapture' in End Times doctrine?", options: ["The end of the universe", "Believers being caught up to meet the Lord", "A thousand years of peace", "The rebuilding of the temple"], answer: "Believers being caught up to meet the Lord" },
          { question: "Who wrote the Book of Revelation?", options: ["Paul", "Peter", "John", "Matthew"], answer: "John" },
          { question: "Where was the author of Revelation exiled when he received the vision?", options: ["Island of Patmos", "Rome", "Jerusalem", "Egypt"], answer: "Island of Patmos" },
          { question: "What is the primary goal of the Kingdom Kids ministry?", options: ["Entertaining children while parents pray", "Laying a solid biblical foundation for childhood", "Teaching math and science", "Organizing field trips"], answer: "Laying a solid biblical foundation for childhood" },
          { question: "Dag Heward-Mills emphasizes that compelled evangelism requires what?", options: ["A massive budget", "Persistence and urgency", "A theological degree", "A famous speaker"], answer: "Persistence and urgency" },
          { question: "Which beast is commonly referenced in the Book of Revelation?", options: ["The Leviathan", "The Beast from the Sea", "The Golden Calf", "The Giant Serpent"], answer: "The Beast from the Sea" },
          { question: "What is the 'Mark of the Beast' commonly associated with in End Times teaching?", options: ["A tattoo of an angel", "The number 666", "A barcode on clothing", "A special ID card given by the church"], answer: "The number 666" },
          { question: "What should Junior Youth be encouraged to develop daily?", options: ["A consistent prayer life", "A massive social media following", "A rebellious streak", "An apathy towards authority"], answer: "A consistent prayer life" },
          { question: "According to the Bible Guidelines, what is scripture useful for?", options: ["Only historical record", "Teaching, rebuking, correcting and training in righteousness", "Scientific research", "Entertainment and leisure"], answer: "Teaching, rebuking, correcting and training in righteousness" },
          { question: "What is the final battle mentioned in Revelation called?", options: ["Battle of Jericho", "Armageddon", "Gog and Magog", "Waterloo"], answer: "Armageddon" },
          { question: "In Anagkazo, why do we need to 'compel' people?", options: ["Because they naturally want to go to church", "Because human nature resists the things of God", "Because force is better than love", "Because the church needs more money"], answer: "Because human nature resists the things of God" },
          { question: "A foundational lesson in Kingdom Kids is often about whose love?", options: ["The Pastor's love", "Jesus' love", "The government's love", "Their own self-love"], answer: "Jesus' love" },
          { question: "The Old Testament contains how many books?", options: ["27", "66", "39", "46"], answer: "39" },
          { question: "The New Testament contains how many books?", options: ["27", "39", "66", "12"], answer: "27" },
          { question: "What is described as descending out of heaven from God in Revelation 21?", options: ["A golden chariot", "The New Jerusalem", "A flaming sword", "A great flood"], answer: "The New Jerusalem" },
          { question: "Which principle is highly valued in the Junior Youth (13-15 age group)?", options: ["Obedience and purity", "Financial independence", "Political activism", "Separating from parents entirely"], answer: "Obedience and purity" },
          { question: "In the Great Commission, Jesus commands believers to do what?", options: ["Make disciples of all nations", "Build larger temples", "Wait silently for his return", "Accumulate vast wealth"], answer: "Make disciples of all nations" },
          { question: "Which symbol represents the Holy Spirit in many biblical verses?", options: ["A dove", "A lion", "An eagle", "A serpent"], answer: "A dove" },
          { question: "Which church is NOT one of the seven churches of Asia in Revelation?", options: ["Ephesus", "Smyrna", "Antioch", "Laodicea"], answer: "Antioch" },
          { question: "Dag Heward-Mills' teachings suggest soul-winning is whose responsibility?", options: ["Only the pastor", "Every believer", "Only the choir", "Only the ushers"], answer: "Every believer" },
          { question: "What is a main focal point for children transitioning out of Kingdom Kids?", options: ["To stop attending church", "To graduate into Junior Youth", "To become lead pastors", "To never read the Bible again"], answer: "To graduate into Junior Youth" },
          { question: "Revelation describes Jesus returning on what?", options: ["A white horse", "A golden throne", "A cloud of fire", "A rainbow"], answer: "A white horse" },
          { question: "The biblical guidelines teach that the Bible should be read how often?", options: ["Once a year", "Daily", "Only on Sundays", "When you feel like it"], answer: "Daily" },
          { question: "Which apostle is known for his extensive teachings on the End Times in his letters?", options: ["Paul", "Judas", "Thomas", "James"], answer: "Paul" },
          { question: "What does the 'Anagkazo' power ultimately try to save people from?", options: ["Poverty", "Hell and eternal damnation", "Boredom", "Political oppression"], answer: "Hell and eternal damnation" },
          { question: "The central message of the Holy Bible is about?", options: ["Good morals only", "God's redemption plan through Jesus Christ", "Historical wars", "A set of strict dietary rules"], answer: "God's redemption plan through Jesus Christ" }
        ];
        
        // Shuffle and pick 10
        const shuffled = offlineQuestionsPool.sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
      } else {
        setError(err.message || 'An error occurred while generating the quiz.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQuiz();
  }, []);

  const handleAnswerClick = (option) => {
    if (selectedAnswer !== null) return;

    const correct = option === questions[currentQuestion].answer;
    setSelectedAnswer(option);
    setIsCorrect(correct);

    setUserAnswers(prev => [...prev, {
      questionObj: questions[currentQuestion],
      chosen: option,
      isCorrect: correct
    }]);

    if (correct) {
      setScore(score + 1);
    }

    setTimeout(() => {
      const nextQuestion = currentQuestion + 1;
      if (nextQuestion < questions.length) {
        setCurrentQuestion(nextQuestion);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowScore(true);
      }
    }, 1500);
  };

  return (
    <div className="quiz-view">
      <div className="notes-header">
        <h1>Topic Quiz</h1>
        <p>Test your knowledge on HMCI teachings.</p>
      </div>

      <div className="quiz-content">
        {loading && (
          <div className="quiz-loading">
             <div className="spinner"></div>
          </div>
        )}
        
        {error && (
          <div className="quiz-error">
             <p>{error}</p>
             <button className="quiz-btn" onClick={generateQuiz}>Try Again</button>
          </div>
        )}

        {!loading && !error && showScore && (
          <div className="quiz-score-section">
            <h2>Quiz Complete!</h2>
            <p className="quiz-final-score">
              You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
            </p>
            
            <div className="quiz-review-list">
              {userAnswers.map((ans, idx) => (
                <div key={idx} className={`quiz-review-item ${ans.isCorrect ? 'correct' : 'incorrect'}`}>
                  <p style={{marginBottom: '8px', fontSize: '15px'}}><strong>Q{idx + 1}: {ans.questionObj.question}</strong></p>
                  <p style={{marginBottom: '4px', fontSize: '14px'}}>
                    Your answer: <span style={{color: ans.isCorrect ? 'var(--success-color)' : 'var(--error-color)'}}>{ans.chosen}</span>
                    {ans.isCorrect ? ' ✅' : ' ❌'}
                  </p>
                  {!ans.isCorrect && (
                    <p style={{fontSize: '14px'}}>
                      Correct answer: <span style={{color: 'var(--success-color)'}}>{ans.questionObj.answer}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button className="quiz-btn" onClick={generateQuiz} style={{marginTop: '20px'}}>Take Another Quiz</button>
          </div>
        )}

        {!loading && !error && !showScore && questions.length > 0 && (
          <div className="quiz-question-section">
            <div className="quiz-progress-bar">
               <div className="quiz-progress" style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}></div>
            </div>
            <div className="quiz-question-count">
              <span>Question {currentQuestion + 1}</span>/{questions.length}
            </div>
            <div className="quiz-question-text">
              <h2>{questions[currentQuestion].question}</h2>
            </div>
            <div className="quiz-options-container">
              {questions[currentQuestion].options.map((option, index) => {
                let btnClass = "quiz-option-btn";
                if (selectedAnswer !== null) {
                  if (option === questions[currentQuestion].answer) {
                    btnClass += " correct";
                  } else if (option === selectedAnswer) {
                    btnClass += " incorrect";
                  }
                }
                
                return (
                  <button
                    key={index}
                    className={btnClass}
                    onClick={() => handleAnswerClick(option)}
                    disabled={selectedAnswer !== null}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
