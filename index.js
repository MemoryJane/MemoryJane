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
        question = "Here's your first question: " + question;
        session.attributes.Question = question;
        response.ask(question, question);
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
        console.log("USER ANSWER: " + userAnswer);

        // Add the result to a database of results for later analysis.
        data.putResult(userAnswer, session);

        // Get the next random question from the db. It returns async.
        data.getResponse(session, userAnswer, function (answerResponse) {
            data.getNewQuestion(session, function (question) {
                session.attributes.Question = question;
                response.ask(answerResponse + " . " + question, question);
            });
        });
    },

    // Intent handler for if the user wants to quit.

    MemoryJaneQuitIntent: function (intent, session, response) {
        // TODO Do we want more than one goodbye? Should this end up in the DB like everything else?
        response.tell("Goodbye");
    },

    MemoryJaneHelpIntent: function (intent, session, response) {
        response.ask("You asked for help. Upon starting flashcards, the app will begin giving " +
            "questions for you to answer. Upon answering, flashcards will tell you if you were " +
            "correct or incorrect. If you would like to exit the app, say quit. " +
            "Contact us at info at memory jane dot com, we would love to hear from you. " +
            "You can also check us out on Facebook. New back to your question: " + session.attributes.Question);
    }
};

/**
 * This is what gets called by Lambda with each Alexa interaction.
 * @param event
 * @param context
 */
exports.handler = function (event, context) {
    console.log("MemoryJane _handler creating MemoryJane object");

    // We don't accept any intents with the launch of the app. So, if the user tries to sneak one in, because
    // the MemoryJaneQuestionIntent can accept just about anything, we need to switch that request back
    // to a launch request and ignore the user's intent.
    if (!event.session.attributes && event.request.type != "LaunchRequest") {
        event.request.type = "LaunchRequest";
    }

    // HACK: We store the expected answer for each question in the session, so that when the user comes back
    // we can test to see if they got the question right. But, when we're running locally, the session comes to
    // us blank, so we have to put in a hack to fill the answer with a fake answer.
    if (!event.session.attributes) {
        event.session.attributes = {};
        event.session.attributes.Answer = "LOCAL_HACK_ANSWER";
        event.session.attributes.Question= "LOCAL_HACK_QUESTION";
    }

    // Create an instance of the MemoryJane skill and execute it.
    var memoryJane = new MemoryJane();
    memoryJane.execute(event, context);
    console.log("MemoryJane _handler_ done");
};
