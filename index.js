/**
 * MemoryJane v1.0
 * Written by David Williams
 */

/**
 * App ID for the skill
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
    console.log("MemoryJane onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MemoryJane.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MemoryJane onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);
    var speechOutput = "Spell memory";
    response.ask(speechOutput);
};

MemoryJane.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MemoryJane onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MemoryJane.prototype.intentHandlers = {
    // One even handler for each letter.
    MemoryJaneAIntent: function (intent, session, response) {
        response.tell("You Said A " + intent.slots.RestOfWord.value);
    },
    MemoryJaneBIntent: function (intent, session, response) {
        response.tell("You Said B. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneCIntent: function (intent, session, response) {
        response.tell("You Said C. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneDIntent: function (intent, session, response) {
        response.tell("You Said D. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneEIntent: function (intent, session, response) {
        response.tell("You Said E. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneFIntent: function (intent, session, response) {
        response.tell("You Said F. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneGIntent: function (intent, session, response) {
        response.tell("You Said G. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneHIntent: function (intent, session, response) {
        response.tell("You Said H. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneIIntent: function (intent, session, response) {
        response.tell("You Said I. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneJIntent: function (intent, session, response) {
        response.tell("You Said J. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneKIntent: function (intent, session, response) {
        response.tell("You Said K. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneLIntent: function (intent, session, response) {
        response.tell("You Said L. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneMIntent: function (intent, session, response) {
        if (intent.slots.RestOfWord.value == "E. M. O. R. Y.") {
            response.tell("Yee-haw! You got it right! You Said M. " + intent.slots.RestOfWord.value);
        } else {
            response.tell("You Said M. " + intent.slots.RestOfWord.value);
        }
    },
    MemoryJaneNIntent: function (intent, session, response) {
        response.tell("You Said N. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneOIntent: function (intent, session, response) {
        response.tell("You Said O. " + intent.slots.RestOfWord.value);
    },
    MemoryJanePIntent: function (intent, session, response) {
        response.tell("You Said P. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneQIntent: function (intent, session, response) {
        response.tell("You Said Q. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneRIntent: function (intent, session, response) {
        response.tell("You Said R. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneSIntent: function (intent, session, response) {
        response.tell("You Said S. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneTIntent: function (intent, session, response) {
        response.tell("You Said T. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneUIntent: function (intent, session, response) {
        response.tell("You Said U. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneVIntent: function (intent, session, response) {
        response.tell("You Said V. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneWIntent: function (intent, session, response) {
        response.tell("You Said W. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneXIntent: function (intent, session, response) {
        response.tell("You Said X. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneYIntent: function (intent, session, response) {
        response.tell("You Said Y. " + intent.slots.RestOfWord.value);
    },
    MemoryJaneZIntent: function (intent, session, response) {
        response.tell("You Said Z. " + intent.slots.RestOfWord.value);
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the MemoryJane skill.
    var memoryJane = new MemoryJane();
    memoryJane.execute(event, context);
};

