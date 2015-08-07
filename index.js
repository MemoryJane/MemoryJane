/**
 * MemoryJane v1.0
 * Written by David Williams
 */

/**
 * App ID for this skill - used in the AlexaSkill code to ensure all calls are from our app.
 */
var APP_ID = undefined; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * MemoryJane is a child of AlexaSkill.
 */
var MemoryJane = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MemoryJane.prototype = Object.create(AlexaSkill.prototype);
MemoryJane.prototype.constructor = MemoryJane;

MemoryJane.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MemoryJane _onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MemoryJane.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MemoryJane _onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);

    // Use the data object to get a random question and ask the user to answer it.
    var data = require("./data.js");
    data.getNewQuestion(session, function (question) {
        //Tell Alexa to ask the user the question
        response.ask(question);
    });
};

MemoryJane.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MemoryJane _onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MemoryJane.prototype.intentHandlers = {

    MemoryJaneQuestionIntent: function (intent, session, response) {
        var data = require("./data.js");
        var userAnswer = intent.slots.Answer.value;

        // Add the result to a database of results for later analysis.
        data.putResult(userAnswer, session);

        // Get the next random question from the db. It returns async.
        data.getResponse(session, userAnswer, function (answerResponse) {
            data.getNewQuestion(session, function (question) {
                response.ask(answerResponse + " . " + question);
            });
        });
    },

    // Intent handler for if the user wants to quit.
    MemoryJaneQuitIntent: function (intent, session, response) {
        // TODO Do we want more than one goodbye? Should this end up in the DB like everything else?
        response.tell("Goodbye");
    }
};

/**
 * This is what gets called by Lambda with each Alexa interaction.
 *
 * @param event
 * @param context
 */
exports.handler = function (event, context) {
    // Create an instance of the MemoryJane skill and execute it.
    console.log("MemoryJane _handler creating MemoryJane object");
    var memoryJane = new MemoryJane();
    memoryJane.execute(event, context);
    console.log("MemoryJane _handler_ done");
};
