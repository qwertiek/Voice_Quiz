function reply(body, response){
    var replyData = {
        type: "raw",
        body: body
    };    
    response.replies = response.replies || [];
    response.replies.push(replyData);
}


function addAction(action, context){
    var command = {
        type: "smart_app_data",
        smart_app_data: action,
        action: action
    };
    for (var index = 0; context.response.replies && index < context.response.replies.length; index ++) {
        if (context.response.replies[index].type === "raw" &&
            context.response.replies[index].body &&
            context.response.replies[index].body.items
        ) {
            context.response.replies[index].body.items.push({command: command});
            return;
        }
    }
    
    return reply({items: [{command: command}]}, context.response);
}


function addSuggestions(suggestions, context) {
    var buttons = [];
    if (!suggestions || !suggestions.length) {
        return;
    }
    
    suggestions.forEach (function(suggest) {
        buttons.push(
            {
                title: suggest,
                actions: [
                    {
                        type: "text",
                        text: suggest,
                        should_send_to_backend: true
                    }
                ],
                action: {
                    text: suggest,
                    type: "text",
                    should_send_to_backend: true
                }
            }
        );
    });
    
    for (var index = 0; context.response.replies && index < context.response.replies.length; index ++) {
        if (context.response.replies[index].type === "raw" &&
            context.response.replies[index].body
        ) {
            context.response.replies[index].body.suggestions = {buttons: buttons};
            return;
        }
    }

    reply({"suggestions": {"buttons": buttons}}, context.response);
}
