function selectOption(option, context) {
    addAction({
        type: assistantContract.actions.selectOption,
        option: option
    }, context);
}

function repeatQuestion(context) {
    addAction({
        type: assistantContract.actions.repeatQuestion
    }, context);
}

function requestCurrentScore(context) {
    addAction({
        type: assistantContract.actions.currentScore
    }, context);
}

function restartGame(context) {
    addAction({
        type: assistantContract.actions.restartGame
    }, context);
}
