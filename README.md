# Голосовой Квиз

SmartApp Canvas-приложение для Салюта/Sber с голосовой викториной на общую эрудицию.

Проект состоит из двух частей:

- `src/` - React Canvas-приложение с UI, игровой логикой и интеграцией через `@salutejs/client`;
- `scenario/` - SmartApp Code сценарий, который распознает голосовые команды, отправляет действия в Canvas и озвучивает события игры.

## Возможности

- стартовый экран с выбором количества вопросов;
- банк из 20 вопросов на русском языке;
- случайная выборка вопросов без повторов;
- ответы голосом и кнопками `1`, `2`, `3`, `4`;
- голосовые команды `повтори вопрос`, `мой счет`, `новая игра`, `сыграть еще`;
- озвучивание приветствия, вопросов, результата ответа, счета и финала;
- подсветка выбранного и правильного ответа;
- финальный экран с результатом и возвратом на стартовый экран.

## Структура

- `src/App.jsx` - интеграция с Assistant Client, управление экранами, voice scheduler.
- `src/pages/StartScreen.jsx` - стартовый экран и выбор количества вопросов.
- `src/pages/GameScreen.jsx` - основной экран квиза.
- `src/components/QuestionCard.jsx` - карточка вопроса и варианты ответа.
- `src/components/ScoreBoard.jsx` - финальный экран.
- `src/game/engine/gameEngine.js` - чистая игровая логика.
- `src/game/voice/` - контракт, очередь, scheduler и тайминги озвучки.
- `src/data/questions.js` - банк вопросов.
- `scenario/` - SmartApp Code сценарий для загрузки в SmartApp Studio.
- `scenario.zip` - архив сценария для загрузки, пересобирается после изменений в `scenario/`.

Подробная архитектура описана в `technical_specification.md`.

## Быстрый старт

Установите зависимости:

```bash
npm install
```

Если есть конфликт peer dependencies:

```bash
npm install --legacy-peer-deps
```

Создайте `.env` на основе `.env.sample` и заполните переменные:

```dotenv
REACT_APP_TOKEN=""
REACT_APP_SMARTAPP="Quiz"
# REACT_APP_VOICE_DEBUG="true"
```

`REACT_APP_TOKEN` нужен для локального запуска через SmartApp Debugger.  
`REACT_APP_SMARTAPP` должен совпадать с именем SmartApp в `scenario/chatbot.yaml`.  
`REACT_APP_VOICE_DEBUG="true"` включает диагностические логи voice scheduler.

Запуск приложения:

```bash
npm start
```

Production-сборка:

```bash
npm run build
```

Тесты React-части:

```bash
npx react-scripts test --watchAll=false --runInBand
```

## SmartApp Code

Для загрузки в SmartApp Studio используйте содержимое папки `scenario/` или архив `scenario.zip`.

После изменения файлов внутри `scenario/` пересоберите архив:

```powershell
$zip='scenario.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path "scenario\*" -DestinationPath $zip -Force
```

Сценарные XML-тесты находятся в `scenario/test/test.xml` и выполняются при деплое SmartApp Code.
