require: slotfilling/slotFilling.sc
  module = sys.zb-common

require: js/getters.js
require: js/reply.js
require: js/contract.js
require: js/actions.js
require: js/voicePhrases.js

require: sc/gameCommands.sc
require: sc/gameEvents.sc

patterns:
    $AnyText = $nonEmptyGarbage

theme: /
    state: Start
        q!: $regex</start>
        q!: quiz
        q!: куиз
        q!: квиз
        q!: голосовой квиз
        q!: (запусти | открой | включи) quiz
        q!: (запусти | открой | включи) куиз
        q!: (запусти | открой | включи) квиз
        q!: (запусти | открой | включи) голосовой квиз
        a: Открываю Голосовой Квиз.

    state: Fallback
        event!: noMatch
        script:
            var request = get_request($context);
            var game = get_game_state(request);
            var phase = game && (game.phase || game.screen || (game.quiz && game.quiz.phase));
            var commands = get_voice_commands(request);
            if (!game || !phase || phase === 'intro') {
                $reactions.answer({"value": voicePhrases.startPrompt});
                addSuggestions(commands, $context);
            } else if (phase === 'result') {
                $reactions.answer({"value": voicePhrases.resultPrompt});
                addSuggestions(commands, $context);
            } else if (phase === 'feedback') {
                $reactions.answer({"value": voicePhrases.feedbackPending});
                addSuggestions(commands, $context);
            } else {
                $reactions.answer({"value": voicePhrases.questionPrompt});
                addSuggestions(commands, $context);
            }
