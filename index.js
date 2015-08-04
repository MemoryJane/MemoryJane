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
    var AWS = require('aws-sdk');
    var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });
    dynamodb.config.update({ accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1" });
    //var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    var describeParams = {
        TableName: "MemoryJaneWords"
    };

    // Describe the table to get the word count, returns async.
    dynamodb.describeTable(describeParams, function (err, data) {
        if (err) console.log("MemoryJane _describingTable_  ERROR " + err); // an error occurred
        else {
            console.log("MemoryJane _describingTable_ " + data);

            // Pick a random word from the table.
            var number = data.Table.ItemCount;
            var rand = (Math.floor(Math.random() * number)) + 1;
            var params = {
                TableName: "MemoryJaneWords",
                Key: {
                    Index: {"N": rand.toString()}
                }
            };

            // Get the random word from the table, returns async.
            dynamodb.getItem(params, function (itemError, itemData) {
                if (itemError) console.log("MemoryJane _gettingWord_  ERROR " + itemError); // an error occurred
                else {
                    var word = itemData.Item.Word.S;
                    console.log("MemoryJane _gettingWord_ " + word);

                    // Add the word to the session, so that we can test the user's response against it.
                    session.attributes.word = word;

                    // Tell Alexa to tell the user to spell the word.
                    var speechOutput = "Spell " + word;
                    response.ask(speechOutput);
                }
            });
        }
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
        console.log("MemoryJane _wordIntent_ sessionWord: " + session.attributes.word + " userSpelling: "
            + intent.slots.RestOfWord.value);

        var userWord = intent.slots.RestOfWord.value.replace(/ /g, "").replace(/\./g,"");
        if (userWord == session.attributes.word) {
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
