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
    console.log("MemoryJane onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MemoryJane.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MemoryJane onLaunch requestId: " + launchRequest.requestId
        + ", sessionId: " + session.sessionId);

    // Use the data object to get a random word and ask the user to spell it.
    var data = require("./data.js");
    data.getRandomWord(function(word) {
        // Add the word to the session, so that we can test the user's response against it.
        session.attributes.word = word;

        // Get the prompt to use when asking the user to spell the word.
        data.getRandomSpellPrompt(function(prompt) {
            // Tell Alexa to tell the user to spell the word.
            console.log("MemoryJane _readyToPrompt [" + prompt + word + "]")
            response.ask(prompt + word);
        });

    });
};

MemoryJane.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MemoryJane onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MemoryJane.prototype.intentHandlers = {
    // One event handler for all of the letters.
    MemoryJaneWordIntent: function (intent, session, response) {
        var data = require("./data.js");
        var userWord = intent.slots.RestOfWord.value.replace(/ /g, "").replace(/\./g,"");
        var sessionWord = session.attributes.word;

        // HACK: if running locally, there won't be a sessionWord, so hack one in.
        if (sessionWord == undefined) { sessionWord = "banana" }

        // Add the try to the database of results for later analysis.
        data.putResult(sessionWord, userWord, sessionWord == userWord, session.sessionId);

        console.log("MemoryJane _wordIntent_ sessionWord: " + sessionWord+ " userSpelling: " + userWord);

        if (userWord == sessionWord) {
            data.getRandomWord(function (word) {
                // Add the word to the session.
                session.attributes.word = word;
                newWord = word;
                data.getRandomSpellPrompt(function (prompt) {
                    // Get the correct reply.
                    data.getRandomCorrectReply(function (correctReply) {
                        // Tell Alexa to give the correct reply to the user.
                        console.log("MemoryJane _readyToCorrectReply [" + correctReply + "]")
                        response.ask(correctReply + " " + prompt + " " + newWord);
                    });
                });
            });
        } else {
            data.getRandomWord(function (word) {
                // Add the word to the session.
                session.attributes.word = word;
                newWord = word;
                data.getRandomSpellPrompt(function (prompt) {
                    // Get the incorrect reply.
                    data.getRandomIncorrectReply(function (incorrectReply) {
                        // Tell Alexa to give the incorrect reply to the user.
                        var spelledOutWord = sessionWord.split('').join(". ").concat(".");
                        console.log("MemoryJane _readyToIncorrectReply [" + incorrectReply + spelledOutWord + "]")
                        response.ask(incorrectReply + spelledOutWord + " " + prompt + " " + newWord);
                    });
                });
            });
        }
    },

    // Intent handler for if the user wants to quit.
    MemoryJaneQuitIntent: function (intent, session, response) {
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
    console.log("MemoryJane _handler_ creating MemoryJane object");
    var memoryJane = new MemoryJane();
    memoryJane.execute(event, context);
    console.log("MemoryJane _handler_ done");
};
