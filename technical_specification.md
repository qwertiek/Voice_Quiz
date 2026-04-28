# Техническая спецификация: «Голосовой Квиз»

## 1. Назначение

«Голосовой Квиз» - SmartApp Canvas-приложение для Салюта/Sber. Пользователь проходит викторину на общую эрудицию, отвечая голосом или кнопками на экране.

Проект разделен на две части:

- React Canvas-приложение в `src/`;
- SmartApp Code сценарий в `scenario/`.

Canvas отвечает за состояние игры, UI, правила, очередь voice events и отправку событий в SmartApp Code. SmartApp Code отвечает за распознавание пользовательских фраз, преобразование их в actions для Canvas и озвучивание событий через `$reactions.answer`.

## 2. Пользовательский сценарий

1. При открытии приложения пользователь видит стартовый экран.
2. На стартовом экране есть:
   - название приложения;
   - приветственная фраза;
   - поле ввода количества вопросов;
   - кнопка `Старт`;
   - визуальный акцент `public/quiz-accent.svg`.
3. По умолчанию количество вопросов равно `10`.
4. Пользователь может ввести натуральное число от `1` до размера банка вопросов.
5. Если число больше банка или не является натуральным, показывается предупреждение, игра не стартует.
6. После нажатия `Старт` создается новая игровая сессия, стартовый экран скрывается, появляется экран вопроса.
7. После завершения игры показывается финальный экран.
8. Кнопка `Сыграть еще` или голосовые команды новой игры возвращают пользователя на стартовый экран, где можно заново выбрать количество вопросов.

## 3. Игровая логика

### 3.1. Вопросы

Банк вопросов находится в `src/data/questions.js`.

Каждый вопрос содержит:

- `id`;
- `question`;
- `options` с ключами `1`, `2`, `3`, `4`;
- `correctOption`.

### 3.2. Сессия

Сессия создается функцией `createInitialGameState(questions, options)` из `src/game/engine/gameEngine.js`.

Параметр `options.questionCount` задает число вопросов в партии. Вопросы перемешиваются и выбираются без повторов. Если запрошенное количество больше размера банка, движок выбирает максимум доступных вопросов, но UI заранее валидирует ввод и не допускает такое значение.

### 3.3. Фазы игры

Фазы описаны в `src/game/states.js`:

- `intro` - игра еще не стартовала, показывается стартовый экран;
- `question` - текущий вопрос активен, можно отвечать;
- `feedback` - ответ принят, показывается подсветка результата, затем выполняется переход к следующему вопросу;
- `result` - игра завершена.

В состоянии игры хранятся:

- `gameSessionId`;
- `questions`;
- `currentQuestionIndex`;
- `score`;
- `selectedOption`;
- `revealedCorrectOption`;
- `phase`.

До старта игры `App` хранит `game: null`. Для SmartApp state это преобразуется в `phase: "intro"` через `toAssistantState(null)`.

В фазе `intro` SmartApp native suggestions не показываются. Старт выполняется только Canvas-кнопкой `Старт`, потому что перед запуском пользователь может выбрать количество вопросов на стартовом экране.

### 3.4. Обработка ответа

Функция `applyAnswer(game, option)`:

- проверяет вариант;
- увеличивает счет при правильном ответе;
- сохраняет выбранный и правильный вариант;
- переводит игру в `feedback` или `result`;
- формирует event `answer_result`.

Для не финального ответа `answer_result` включает и вердикт, и текст следующего вопроса в одной TTS-реплике. Это сделано намеренно: платформа ненадежно озвучивала второй `sendData` сразу после реплики результата. UI при этом остается в фазе `feedback` на короткую паузу, затем Canvas вызывает `advanceToNextQuestion(game)` без отправки отдельного `question_prompt`.

Для повторения вопроса и для стартового вопроса отдельный `question_prompt` по-прежнему используется.

## 4. React Canvas

Ключевые файлы:

- `src/App.jsx` - главный контейнер, Assistant Client, start/reset flow, voice scheduler.
- `src/pages/StartScreen.jsx` - стартовый экран.
- `src/pages/GameScreen.jsx` - экран активной игры.
- `src/components/QuestionCard.jsx` - вопрос и кнопки ответов.
- `src/components/ScoreBoard.jsx` - финальный экран.
- `src/game/engine/gameEngine.js` - чистые функции игрового движка.
- `src/game/voice/contract.js` - типы action/event и валидация.
- `src/game/voice/queue.js` - политика очереди voice events.
- `src/game/voice/scheduler.js` - отправка voice events, retry, interrupt, stale callback protection.
- `src/game/voice/timing.js` - единый расчет длительности voice-событий для UI и scheduler.
- `src/game/config.js` - числовые параметры таймингов и лимитов.

## 5. SmartApp Code

Ключевые файлы:

- `scenario/chatbot.yaml` - имя `Quiz`, язык `ru`, entry point и XML-тесты.
- `scenario/src/entryPoint.sc` - запуск, fallback, подключение JS и сценариев.
- `scenario/src/sc/gameCommands.sc` - распознавание голосовых команд пользователя.
- `scenario/src/sc/gameEvents.sc` - озвучивание событий, отправленных Canvas.
- `scenario/src/js/actions.js` - helpers для отправки actions в Canvas.
- `scenario/src/js/contract.js` - id actions/events.
- `scenario/src/js/getters.js` - чтение raw request, app state и event payload.
- `scenario/src/js/reply.js` - raw replies, `smart_app_data`, suggestions.
- `scenario/src/js/voicePhrases.js` - fallback-фразы сценария.
- `scenario/test/test.xml` - сценарные XML-тесты.

SmartApp Code использует:

- глобальные `q!` для команд;
- `event!` для событий Canvas;
- `$reactions.answer({"value": phrase})` для озвучки;
- raw reply с `type: "smart_app_data"` для отправки actions в Canvas.

## 6. Голосовые команды

### 6.1. Ответы

Поддерживаются команды выбора:

- `1`, `один`, `первый`, `номер 1`, `номер один`, `вариант 1`, `вариант один`, `первый вариант`, `ответ 1`, `ответ один`;
- `2`, `два`, `второй`, `номер 2`, `номер два`, `вариант 2`, `вариант два`, `второй вариант`, `ответ 2`, `ответ два`;
- `3`, `три`, `третий`, `номер 3`, `номер три`, `вариант 3`, `вариант три`, `третий вариант`, `ответ 3`, `ответ три`;
- `4`, `четыре`, `четвертый`, `четвёртый`, `номер 4`, `номер четыре`, `вариант 4`, `вариант четыре`, `четвертый вариант`, `четвёртый вариант`, `ответ 4`, `ответ четыре`.

Также есть текстовый выбор через selected item:

- `выбери ...`;
- `выбираю ...`;
- `ответ ...`;
- `вариант ...`;
- `я выбери ...`;
- `я выбираю ...`.

Этот путь зависит от `selected_item`, который передает платформа. Основным надежным способом считаются числовые команды.

### 6.2. Служебные команды

- `повтори вопрос` - повторить текущий вопрос или финальный результат;
- `мой счет` / `мой счёт` - озвучить текущий счет;
- `начать заново`;
- `новая игра`;
- `сыграть еще` / `сыграть ещё`.

Команды новой игры возвращают на стартовый экран. Новая сессия создается только после нажатия кнопки `Старт`.

Native suggestions SmartApp Code используют `action.type = "text"`, поэтому нажатия на подсказки `1`, `2`, `3`, `4`, `Повтори вопрос`, `Мой счёт`, `Новая игра`, `Сыграть ещё` должны проходить тот же путь, что и голосовая команда: текст попадает в `q!`, сценарий отправляет action в Canvas, Canvas формирует voice event и запускает озвучку.

## 7. Контракт Canvas и SmartApp Code

### 7.1. Actions из SmartApp Code в Canvas

Поддерживаются action:

- `select_option`;
- `repeat_question`;
- `current_score`;
- `restart_game`.

`select_option`:

```json
{
  "type": "select_option",
  "option": "1"
}
```

SmartApp Code отправляет action в raw reply:

```json
{
  "type": "smart_app_data",
  "smart_app_data": { "type": "select_option", "option": "1" },
  "action": { "type": "select_option", "option": "1" }
}
```

Canvas принимает оба формата: `event.smart_app_data` и legacy `event.action`.

### 7.2. Events из Canvas в SmartApp Code

Поддерживаются event:

- `game_started`;
- `question_prompt`;
- `answer_result`;
- `score_report`;
- `result_prompt`;
- `invalid_action`.

Каждый event содержит `payload.phrase`.

Дополнительные поля:

- `suggestions`;
- `phase`;
- `gameSessionId`;
- `questionIndex`;
- `score`;
- `selectedOption`;
- `correctOption`;
- `status`;
- `reason`;
- `voiceTurnId`.

Canvas отправляет событие через:

```js
assistant.sendData({
  action: {
    action_id: event.eventType,
    parameters: payload
  },
  name: "SERVER_ACTION",
  mode: "foreground"
})
```

`name: "SERVER_ACTION"` и `mode: "foreground"` важны для Canvas-кнопок: ответ backend должен восприниматься как foreground server-action, чтобы платформа запускала не только отображение текста, но и озвучку.

`scenario/src/js/getters.js` поддерживает получение payload из `data.parameters`, `data.action.parameters`, `data.event.payload` и совместимых форматов.

## 8. Voice Scheduler и тайминги

### 8.1. Очередь

Типы событий очереди:

- `blocking` - `game_started`, `answer_result`;
- `replaceable` - `question_prompt`, `score_report`, `result_prompt`;
- `transient` - остальные, включая `invalid_action`.

Политики отправки:

- `ENQUEUE` - поставить событие в очередь;
- `REPLACE` - заменить pending-очередь;
- `INTERRUPT` - прервать текущую отправку, очистить pending-очередь и отправить новое событие.

Критические пользовательские действия используют `INTERRUPT`: ответ, повтор, счет, новая игра.

### 8.2. Защита от гонок

Scheduler присваивает каждому событию `voiceTurnId`. Если callback от старого события приходит после interrupt, он игнорируется.

Scheduler также отбрасывает stale events:

- событие из другой `gameSessionId`;
- `question_prompt` не для текущего вопроса;
- `result_prompt` вне фазы `result`;
- `invalid_action` не для текущей фазы.

### 8.3. Единая модель длительности

Расчет длительности вынесен в `src/game/voice/timing.js`.

UI и scheduler используют один источник:

- блокировка кнопок во время чтения вопроса;
- задержка перехода после `answer_result`;
- удержание blocking-событий в scheduler.

Текущие параметры в `src/game/config.js`:

- `VOICE_ACK_TIMEOUT_MS = 5000`;
- `VOICE_RETRY_DELAY_MS = 800`;
- `VOICE_BLOCKING_MIN_SETTLE_MS = 700`;
- `ANSWER_FEEDBACK_DELAY_MIN_MS = 1400`;
- `ANSWER_FEEDBACK_DELAY_MAX_MS = 3600`;
- `ANSWER_FEEDBACK_DELAY_BASE_MS = 350`;
- `ANSWER_FEEDBACK_DELAY_PER_CHAR_MS = 45`;
- `VOICE_PROMPT_LOCK_MIN_MS = 4500`;
- `VOICE_PROMPT_LOCK_MAX_MS = 30000`;
- `VOICE_PROMPT_LOCK_BASE_MS = 1200`;
- `VOICE_PROMPT_LOCK_PER_CHAR_MS = 85`.

Важно: `assistant.sendData` callback не гарантирует физический конец TTS. Тайминги остаются практической моделью, которую нужно проверять на устройстве.

## 9. Тестирование

React/unit-тесты:

- `src/game/engine/gameEngine.test.js`;
- `src/game/voice/contract.test.js`;
- `src/game/voice/queue.test.js`;
- `src/game/voice/scheduler.test.js`;
- `src/game/voice/timing.test.js`.

Запуск:

```bash
npx react-scripts test --watchAll=false --runInBand
```

Сборка:

```bash
npm run build
```

SmartApp Code XML-тесты находятся в:

```text
scenario/test/test.xml
```

Они покрывают:

- `/start`;
- fallback без state;
- fallback в фазах `intro`, `question`, `feedback`, `result`;
- основные голосовые команды;
- события `question_prompt`, `answer_result`, `score_report`, `result_prompt`;
- формат `requestData.action.parameters`.

Эти тесты выполняются при деплое SmartApp Code в Studio.

## 10. Сборка SmartApp Code

Исходник сценария:

```text
scenario/
```

Архив для загрузки:

```text
scenario.zip
```

После любых изменений в `scenario/` архив нужно пересобрать:

```powershell
$zip='scenario.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path "scenario\*" -DestinationPath $zip -Force
```

## 11. Известные риски

### 11.1. TTS и `sendData`

Callback `assistant.sendData` подтверждает обработку события, но не гарантирует окончание речи. Поэтому синхронизация голоса и UI использует расчетные тайминги.

### 11.2. Реальное устройство может отличаться от Debugger

Скорость TTS, поведение interrupt и очередь реплик могут отличаться между SmartApp Debugger и устройствами.

### 11.3. Глобальные `q!`

Команды выбора ответа глобальные. Это позволяет голосом прерывать вопрос, но повышает риск ложного срабатывания ASR на коротких командах вроде `один`.

### 11.4. Выбор по тексту варианта

`SelectOptionByText` зависит от `selected_item`. Если платформа не передает selected item, пользователь получит fallback `Назовите один из вариантов: 1, 2, 3 или 4.`

### 11.5. Нет серверной валидации

Вся логика находится на клиенте. Для MVP это допустимо, но состояние можно изменить вручную в браузере.

### 11.6. Нет персистентности

Прогресс не сохраняется. Перезагрузка страницы возвращает приложение на стартовый экран.

### 11.7. `scenario.zip` может устареть

Если изменить `scenario/`, но не пересобрать архив, в Studio может попасть старая версия.

### 11.8. End-to-end тесты ручные

Полная цепочка пока проверяется вручную:

```text
голос -> SmartApp Code -> Canvas action -> game state -> sendData -> SmartApp Code event -> TTS
```

Рекомендуется регулярно проверять ее в SmartApp Debugger и на целевом устройстве.
