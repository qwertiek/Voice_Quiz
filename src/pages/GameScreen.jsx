import React from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { ScoreBoard } from '../components/ScoreBoard';
import { GAME_PHASES } from '../game/states';

export const GameScreen = ({
  gameState,
  celebrationType,
  celebrationNonce,
  isVoicePromptLocked,
  onAnswer,
  onNewGame,
}) => {
  const {
    questions,
    currentQuestionIndex,
    score,
    selectedOption,
    revealedCorrectOption,
    phase,
  } = gameState;

  const isFinished = phase === GAME_PHASES.RESULT;
  const isWaitingForAnswer = phase === GAME_PHASES.QUESTION && !isVoicePromptLocked;
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <main className="quiz-layout">
      {celebrationNonce > 0 && (
        <div
          key={`${celebrationType}-${celebrationNonce}`}
          className={`celebration-overlay ${celebrationType}`}
          aria-hidden="true"
        >
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className="celebration-particle" />
          ))}
        </div>
      )}

      <header className="quiz-header">
        <h1 className="quiz-title">Голосовой Квиз</h1>
        <p className="quiz-subtitle">Отвечайте голосом или нажатием на кнопку</p>
        <div className="quiz-stats">
          <span>Счёт: {score}</span>
          <button className="primary-button" type="button" onClick={onNewGame}>
            Новая игра
          </button>
        </div>
      </header>

      {!isFinished && currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          currentIndex={currentQuestionIndex}
          total={questions.length}
          disabled={!isWaitingForAnswer}
          selectedOption={selectedOption}
          revealedCorrectOption={revealedCorrectOption}
          onAnswer={onAnswer}
        />
      )}

      {isFinished && (
        <ScoreBoard score={score} total={questions.length} onRestart={onNewGame} />
      )}
    </main>
  );
};
