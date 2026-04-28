import React from 'react';

export const StartScreen = ({
  questionCount,
  maxQuestionCount,
  warning,
  onQuestionCountChange,
  onStart,
}) => {
  const inputHint = `От 1 до ${maxQuestionCount} вопросов`;

  return (
    <main className="quiz-layout start-layout">
      <section className="start-panel" aria-labelledby="start-title">
        <div className="start-content">
          <div>
            <p className="start-kicker">Голосовая викторина</p>
            <h1 id="start-title" className="quiz-title">
              Голосовой Квиз
            </h1>
            <p className="quiz-subtitle">
              Проверьте эрудицию: отвечайте голосом или выбирайте варианты на экране.
            </p>
          </div>

          <form className="start-form" onSubmit={onStart}>
            <label className="question-count-field" htmlFor="question-count">
              <span>Количество вопросов</span>
              <input
                id="question-count"
                className="question-count-input"
                type="number"
                min="1"
                max={maxQuestionCount}
                step="1"
                inputMode="numeric"
                placeholder={inputHint}
                value={questionCount}
                onChange={(event) => onQuestionCountChange(event.target.value)}
                aria-describedby={warning ? 'question-count-warning' : undefined}
              />
            </label>

            {warning && (
              <p id="question-count-warning" className="start-warning" role="alert">
                {warning}
              </p>
            )}

            <button className="primary-button start-button" type="submit">
              Старт
            </button>
          </form>
        </div>

        <div className="start-visual" aria-hidden="true">
          <img src="/quiz-accent.svg" alt="" />
        </div>
      </section>
    </main>
  );
};
