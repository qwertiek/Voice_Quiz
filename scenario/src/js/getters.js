function get_request(context) {
    if (context && context.request) {
        return context.request.rawRequest;
    }
    return {};
}

function get_game_state(request) {
    if (
        request &&
        request.payload &&
        request.payload.meta &&
        request.payload.meta.current_app &&
        request.payload.meta.current_app.state &&
        request.payload.meta.current_app.state.game
    ) {
        return request.payload.meta.current_app.state.game;
    }

    return {};
}

function get_selected_item(request) {
    if (
        request &&
        request.payload &&
        request.payload.meta &&
        request.payload.meta.current_app &&
        request.payload.meta.current_app.state
    ) {
        return request.payload.selected_item;
    }
    return null;
}

function get_items(request) {
    var game = get_game_state(request);
    if (game && game.item_selector) {
        return game.item_selector.items;
    }
    return null;
}

function get_id_by_selected_item(request) {
    var items = get_items(request);
    var selected_item = get_selected_item(request);
    if (selected_item && items && items[selected_item.index]) {
        return items[selected_item.index].id;
    }
    return null;
}

function get_event_data(context) {
    if (!context || !context.request || !context.request.data) {
        return {};
    }

    var data = context.request.data;

    if (data.eventData) {
        return data.eventData;
    }

    if (data.event && data.event.payload) {
        return data.event.payload;
    }

    if (data.event && data.event.eventData) {
        return data.event.eventData;
    }

    if (data.parameters) {
        return data.parameters;
    }

    if (data.action && data.action.parameters) {
        return data.action.parameters;
    }

    return {};
}

function get_voice_commands(request) {
    var game = get_game_state(request);
    var phase = game && (game.phase || game.screen || (game.quiz && game.quiz.phase));
    if (!game || !phase || phase === 'intro') {
        return [];
    }

    if (game && game.voice && game.voice.commands && game.voice.commands.length) {
        return game.voice.commands;
    }

    return ['1', '2', '3', '4', 'Повтори вопрос', 'Мой счёт'];
}
