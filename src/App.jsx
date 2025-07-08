import React, { useReducer, useEffect } from 'react';
import './App.css';
import flags from './flags/flags';

// --- Initial State ---
const initialState = {
  score: 0,
  highScore: parseInt(localStorage.getItem('HIGH_SCORE')) || 0,
  hintsLeft: 3,
  livesLeft: 3, // Added livesLeft
  streak: 0,
  correctAnswer: '',
  options: [],
  flag: '',
  selectedOptionIndex: null,
  feedbackMessage: '',
  isAnswering: false,
  gameEnded: false,
  disabledButtons: [],
};

// --- Action Types ---
const ACTION_TYPES = {
  GENERATE_QUESTION: 'GENERATE_QUESTION',
  ANSWER_CORRECTLY: 'ANSWER_CORRECTLY',
  ANSWER_INCORRECTLY: 'ANSWER_INCORRECTLY',
  USE_HINT: 'USE_HINT',
  START_NEW_GAME: 'START_NEW_GAME',
};

// --- Reducer ---
function gameReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.GENERATE_QUESTION: {
      if (state.gameEnded) return state;

      const entries = Object.entries(flags);
      if (entries.length < 4) return state;

      const [correctCode, correctData] = entries[Math.floor(Math.random() * entries.length)];
      const correctName = correctData.name;
      const flagImg = correctData.img;

      let otherOptions = entries
        .filter(([code]) => code !== correctCode)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(([_, value]) => value.name);

      while (otherOptions.length < 3) {
        const extra = entries[Math.floor(Math.random() * entries.length)][1].name;
        if (extra !== correctName && !otherOptions.includes(extra)) {
          otherOptions.push(extra);
        }
      }

      const allOptions = [...otherOptions, correctName].sort(() => 0.5 - Math.random());

      return {
        ...state,
        correctAnswer: correctName,
        flag: flagImg,
        options: allOptions,
        selectedOptionIndex: null,
        feedbackMessage: '',
        isAnswering: false,
        disabledButtons: [],
      };
    }

    case ACTION_TYPES.ANSWER_CORRECTLY: {
      if (state.isAnswering || state.gameEnded) return state;

      const newScore = state.score + 1;
      const newStreak = state.streak + 1;
      const newHighScore = Math.max(newScore, state.highScore);

      if (newHighScore > state.highScore) {
        localStorage.setItem('HIGH_SCORE', newHighScore);
      }

      let newHintsLeft = state.hintsLeft;
      if (newStreak % 3 === 0) {
        newHintsLeft += 1;
      }

      return {
        ...state,
        score: newScore,
        streak: newStreak,
        highScore: newHighScore,
        hintsLeft: newHintsLeft,
        feedbackMessage: 'Correct!',
        selectedOptionIndex: action.payload.index,
        isAnswering: true,
      };
    }

    case ACTION_TYPES.ANSWER_INCORRECTLY: {
      if (state.isAnswering || state.gameEnded) return state;

      const newLivesLeft = state.livesLeft - 1;
      const gameOver = newLivesLeft <= 0;

      return {
        ...state,
        livesLeft: newLivesLeft,
        streak: 0, // Reset streak on incorrect answer
        feedbackMessage: `Wrong! It was ${state.correctAnswer}. You have ${newLivesLeft} lives left.`,
        selectedOptionIndex: action.payload.index,
        isAnswering: true,
        gameEnded: gameOver,
        score: gameOver ? state.score : 0, // Reset score only if game ends
      };
    }

    case ACTION_TYPES.USE_HINT: {
      if (state.hintsLeft <= 0 || state.isAnswering || state.gameEnded) return state;

      const incorrectIndices = state.options
        .map((opt, idx) => ({ opt, idx }))
        .filter(o => o.opt !== state.correctAnswer && !state.disabledButtons.includes(o.idx));

      if (incorrectIndices.length > 0) {
        const toDisable = incorrectIndices[Math.floor(Math.random() * incorrectIndices.length)].idx;
        return {
          ...state,
          disabledButtons: [...state.disabledButtons, toDisable],
          hintsLeft: state.hintsLeft - 1,
        };
      }
      return state;
    }

    case ACTION_TYPES.START_NEW_GAME: {
      return {
        ...initialState,
        highScore: state.highScore, // Preserve high score
        gameEnded: false,
        hintsLeft: 3,
        livesLeft: 3, // Reset lives for new game
      };
    }

    default:
      return state;
  }
}

// --- App Component ---
function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const {
    score,
    highScore,
    hintsLeft,
    livesLeft, // Destructure livesLeft
    streak,
    correctAnswer,
    options,
    flag,
    selectedOptionIndex,
    feedbackMessage,
    isAnswering,
    gameEnded,
    disabledButtons,
  } = state;

  // Load new question on first mount or when game restarts
  useEffect(() => {
    if (!gameEnded) {
      dispatch({ type: ACTION_TYPES.GENERATE_QUESTION });
    }
  }, [gameEnded]);

  // Automatically load next question after a correct answer or if lives are remaining
  useEffect(() => {
    if (isAnswering && !gameEnded) {
      const timeout = setTimeout(() => {
        dispatch({ type: ACTION_TYPES.GENERATE_QUESTION });
      }, 1500);
      return () => clearTimeout(timeout);
    }
    // If game ended due to lives running out, do not generate a new question immediately
    if (isAnswering && gameEnded && livesLeft === 0) {
        // Do nothing, let the game over screen show
    }
  }, [isAnswering, gameEnded, livesLeft]); // Add livesLeft to dependency array

  const handleAnswer = (option, index) => {
    if (isAnswering || gameEnded) return;

    if (option === correctAnswer) {
      dispatch({ type: ACTION_TYPES.ANSWER_CORRECTLY, payload: { option, index } });
    } else {
      dispatch({ type: ACTION_TYPES.ANSWER_INCORRECTLY, payload: { option, index } });
    }
  };

  const useHint = () => dispatch({ type: ACTION_TYPES.USE_HINT });
  const startNewGame = () => dispatch({ type: ACTION_TYPES.START_NEW_GAME });

  const getButtonClass = (option, index) => {
    let className = 'option-button';
    if (selectedOptionIndex !== null) {
      if (option === correctAnswer) {
        className += ' correct';
      } else if (index === selectedOptionIndex) {
        className += ' wrong';
      }
    }
    if (disabledButtons.includes(index)) {
      className += ' hint-disabled';
    }
    return className;
  };

  return (
    <div className="app-container">
      <header className="game-header">
        <h1>Guess the Flag</h1>
        <div className="score-info">
          <p>Score: <span>{score}</span></p>
          <p>High Score: <span>{highScore}</span></p>
          <p>Streak: <span>{streak}</span></p>
          <p>Lives: <span>{livesLeft}</span></p> {/* Display livesLeft */}
        </div>
      </header>

      <main className="game-content">
        <div className="flag-display">
          {flag && <img src={flag} alt="country flag" className="flag-image" />}
          {feedbackMessage && (
            <p className={`feedback ${selectedOptionIndex !== null ? (options[selectedOptionIndex] === correctAnswer ? 'feedback-correct' : 'feedback-wrong') : ''}`}>
              {feedbackMessage}
            </p>
          )}
        </div>

        {gameEnded ? (
          <div className="game-over-screen">
            <h2>Game Over!</h2>
            <p>Your final score was: {score}</p>
            <button onClick={startNewGame} className="control-button start-button">
              New Game
            </button>
          </div>
        ) : (
          <div className="options-grid">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option, index)}
                disabled={isAnswering || gameEnded || disabledButtons.includes(index)}
                className={getButtonClass(option, index)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="game-controls">
        {!gameEnded && (
          <button
            onClick={useHint}
            disabled={hintsLeft <= 0 || isAnswering || disabledButtons.length >= options.length - 1}
            className="control-button hint-button"
          >
            Hint ({hintsLeft})
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;