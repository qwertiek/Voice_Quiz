import React from 'react';

export const ScoreBoard = ({ score, total, onRestart }) => {
  return (
    <section className="score-board" aria-live="polite">
      <h2 className="score-title">Игра завершена</h2>
      <p className="score-value">Вы ответили правильно на {score} из {total} вопросов.</p>
      <p className="score-caption">
        Скажите «Сыграть ещё» или нажмите кнопку, чтобы начать новую партию.
      </p>
      <button className="primary-button" type="button" onClick={onRestart}>
        Сыграть ещё
      </button>
    </section>
  );
};
