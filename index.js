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

    //Get a random word from the database and prompt the user to spell it
    var word = getWord();
    var speechOutput = "Spell " + word;
    response.ask(speechOutput);
};

MemoryJane.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MemoryJane onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MemoryJane.prototype.intentHandlers = {
    // One event handler for all of the letters.
    MemoryJaneWordIntent: function (intent, session, response) {
        if (intent.slots.RestOfWord.value == "m. e. m. o. r. y.") {
            console.log("Made it into the intent handler, and the word is ... " + intent.slots.RestOfWord.value)
            response.tell("Yee-haw! You got it right! You Said " + intent.slots.RestOfWord.value);
        } else {
            response.tell("You Said " + intent.slots.RestOfWord.value);
        }
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

function getWord () {

    //Determine the number of words in the database
    var AWS = require('aws-sdk');
    AWS.config.update({
        accessKeyId: 'AKIAJNBRN323HMN7SCJA',
        secretAccessKey:  'NrZ31W + aoWWroyoIey / mzO0tabSkROoB / JCkINt9',
        region: 'us - east - 1'});
        var svc = new AWS.DynamoDB();
    svc.client.describeTable({TableName: "MemoryJaneWords"}, function (err, result) {
        if (!err) {
            var itemsInDatabase = result.Table.ItemCount;
            //console.log('result is '+result[ItemCount]);
            //console.log('success');
        }
        else {

            console.log("err is " + err);
        }
    });

    //Declare a random number between 0 and 1-itemsInDatabase
    var rand = Math.floor(Math.random() * itemsInDatabase);

    //Return the word at the index corresponding to the random value
    return dynamodb.getItem({
        TableName: 'MemoryJaneWords',
        Key: {
            Word: {
                S: rand
            }
        }
    });
}


