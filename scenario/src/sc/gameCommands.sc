theme: /

    state: SelectOption1
        q!: 1
        q!: один
        q!: первый
        q!: вариант 1
        q!: вариант один
        q!: номер 1
        q!: номер один
        q!: первый вариант
        q!: ответ 1
        q!: ответ один
        script:
            selectOption("1", $context);

    state: SelectOption2
        q!: 2
        q!: два
        q!: второй
        q!: вариант 2
        q!: вариант два
        q!: номер 2
        q!: номер два
        q!: второй вариант
        q!: ответ 2
        q!: ответ два
        script:
            selectOption("2", $context);

    state: SelectOption3
        q!: 3
        q!: три
        q!: третий
        q!: вариант 3
        q!: вариант три
        q!: номер 3
        q!: номер три
        q!: третий вариант
        q!: ответ 3
        q!: ответ три
        script:
            selectOption("3", $context);

    state: SelectOption4
        q!: 4
        q!: четыре
        q!: четвертый
        q!: четвёртый
        q!: вариант 4
        q!: вариант четыре
        q!: номер 4
        q!: номер четыре
        q!: четвертый вариант
        q!: четвёртый вариант
        q!: ответ 4
        q!: ответ четыре
        script:
            selectOption("4", $context);

    state: SelectOptionByText
        q!: (выбери|выбираю|ответ|вариант) $AnyText::anyText
        q!: я (выбери|выбираю) $AnyText::anyText
        script:
            var itemId = get_id_by_selected_item(get_request($context));
            if (itemId) {
                selectOption(itemId, $context);
            } else {
                $reactions.answer({"value": voicePhrases.unknownOption});
                addSuggestions(get_voice_commands(get_request($context)), $context);
            }

    state: RepeatQuestion
        q!: повтори вопрос
        script:
            repeatQuestion($context);

    state: CurrentScore
        q!: мой счет
        q!: мой счёт
        script:
            requestCurrentScore($context);

    state: RestartGame
        q!: начать заново
        q!: новая игра
        q!: сыграть еще
        q!: сыграть ещё
        script:
            restartGame($context);
