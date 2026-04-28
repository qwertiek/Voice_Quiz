theme: /

    state: GameStarted
        event!: game_started
        script:
            var eventData = get_event_data($context);
            log('voice_event game_started turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.eventFallback});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);

    state: QuestionPrompt
        event!: question_prompt
        script:
            var eventData = get_event_data($context);
            log('voice_event question_prompt turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' questionIndex=' + eventData.questionIndex + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.eventFallback});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);

    state: AnswerResult
        event!: answer_result
        script:
            var eventData = get_event_data($context);
            log('voice_event answer_result turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' questionIndex=' + eventData.questionIndex + ' status=' + eventData.status + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.eventFallback});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);

    state: ScoreReport
        event!: score_report
        script:
            var eventData = get_event_data($context);
            log('voice_event score_report turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.eventFallback});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);

    state: ResultPrompt
        event!: result_prompt
        script:
            var eventData = get_event_data($context);
            log('voice_event result_prompt turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.resultPrompt});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);

    state: InvalidAction
        event!: invalid_action
        script:
            var eventData = get_event_data($context);
            log('voice_event invalid_action turn=' + eventData.voiceTurnId + ' phase=' + eventData.phase + ' reason=' + eventData.reason + ' phrase=' + eventData.phrase);
            $reactions.answer({"value": eventData.phrase || voicePhrases.eventFallback});
            addSuggestions(eventData.suggestions || get_voice_commands(get_request($context)), $context);
