/**
 * MemoryJane v1.0
 * Written by David Williams
 */

var AWS = require("aws-sdk");

var data = (function () {
    /**
     * Get the database object, either from AWS if it is there, or locally if it is not.
     */
    function getDynamoDB () {
        var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

        // If there are no credentials, then assume we are running locally.
        if (dynamodb.config.credentials == null) {
            dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });
            dynamodb.config.update({ accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1" });
            console.log("DATA _getDynamoDB_ USING LOCAL DB");
        }
        return dynamodb;
    }

    /**
     * Get a random incorrect reply from the DB. Call the callback
     * function when the word has been retrieved.
     * The reply is an incomplete sentence. It is assumed that the correct answer will be appended
     * at the end of the reply that is sent back.
     */
    function getRandomIncorrectReply(incorrectReplyCallback) {
        var dynamodb = getDynamoDB();

        // Get the number of incorrect replies by doing a COUNT scan.
        var countParams = {TableName: "MemoryJaneIncorrectReplies", Select: 'COUNT'};
        dynamodb.scan(countParams, function (err, data) {
            if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
            else {
                // Pick a random incorrect reply from the table.
                var number = data.Count;
                var rand = (Math.floor(Math.random() * number)) + 1;
                var getWordParams = {TableName: "MemoryJaneIncorrectReplies", Key: {Index: {"N": rand.toString()}}};

                console.log("Data _describingTable_ itemCount: " + number);

                // Get the random incorrect reply from the table, returns async.
                dynamodb.getItem(getWordParams, function (itemError, itemData) {
                    if (itemError) console.log("Data _gettingWord_  ERROR " + itemError); // an error occurred
                    else {
                        var incorrectReply = itemData.Item.Reply.S;
                        console.log("Data _gettingWord_ " + incorrectReply);

                        incorrectReplyCallback(incorrectReply);
                    }
                });
            }
        });
    }

    /**
     * Get a random correct reply from the DB. Call the callback
     * function when the word has been retrieved.
     * This is a complete sentence, congratulating the user. It is assumed that the answer will not appear
     * in the congratulations.
     */
    function getRandomCorrectReply(correctReplyCallback) {
        var dynamodb = getDynamoDB();

        // Get the number of correct replies by doing a COUNT scan.
        var countParams = {TableName: "MemoryJaneCorrectReplies", Select: 'COUNT'};
        dynamodb.scan(countParams, function (err, data) {
            if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
            else {
                // Pick a random correct reply from the table.
                var number = data.Count;
                var rand = (Math.floor(Math.random() * number)) + 1;
                var getWordParams = {TableName: "MemoryJaneCorrectReplies", Key: {Index: {"N": rand.toString()}}};

                console.log("Data _describingTable_ itemCount: " + number);

                // Get the random correct reply from the table, returns async.
                dynamodb.getItem(getWordParams, function (itemError, itemData) {
                    if (itemError) console.log("Data _gettingCorrectReply_  ERROR " + itemError); // an error occurred
                    else {
                        var correctReply = itemData.Item.Reply.S;
                        console.log("Data _gettingCorrectReply_ " + correctReply);

                        correctReplyCallback(correctReply);
                    }
                });
            }
        });

    }

    /**
     * Get a random prompt from the DB. Call the callback function when it has been retrieved.
     * @param promptTag
     * @param promptCallback
     */
    function getRandomPrompt(promptTag, promptCallback) {
        //Get a new question and answer from the database
        var dynamodb = getDynamoDB();

        // Get the number of questions by doing a COUNT scan.
        var promptParams = {TableName: "MemoryJane" + promptTag + "Prompts", Select: 'COUNT'};
        dynamodb.scan(promptParams, function (err, data) {
            if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
            else {
                // Pick a random prompt from the table.
                var number = data.Count;
                var rand = (Math.floor(Math.random() * number)) + 1;
                var getPromptParams = {
                    TableName: "MemoryJane" + promptTag + "Prompts",
                    Key: {Index: {"N": rand.toString()}}
                };

                console.log("Data _describingTable_ itemCount: " + number);

                // Get the random incorrect reply from the table, returns async.
                dynamodb.getItem(getPromptParams, function (itemError, itemData) {
                    if (itemError) console.log("Data _gettingRandomPrompt_  ERROR " + itemError); // an error occurred
                    else {
                        var prompt = itemData.Item.Prompt.S;
                        promptCallback(prompt);
                    }
                });
            }
        });
    }

    return {
        /**
         * Get a random question from the DB. Call the callback function when it has been retrieved.
         *  @param session
         *  @param callback
         */
        getNewQuestion: function (session, callback) {
            //Get a new question and answer from the database
            var dynamodb = getDynamoDB();

            // Get the number of questions by doing a COUNT scan.
            var countParams = {TableName: "MemoryJaneFlashCards", Select: 'COUNT'};
            dynamodb.scan(countParams, function (err, data) {
                if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
                else {
                    // Pick a random question from the table.
                    var number = data.Count;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    var getQuestionParams = {TableName: "MemoryJaneFlashCards", Key: {Index: {"N": rand.toString()}}};

                    // Get the random incorrect reply from the table, returns async.
                    dynamodb.getItem(getQuestionParams, function (itemError, itemData) {
                        if (itemError) console.log("Data _gettingNewQuestion_  ERROR " + itemError); // an error occurred
                        else {
                            var question = itemData.Item.Question.S;
                            session.attributes.Answer = itemData.Item.Answer.S;

                            //Pull prompt data from the table and use it in the logic
                            if (itemData.Item.Prompt != undefined) {
                               var  promptFromTable = itemData.Item.Prompt.S;
                                getRandomPrompt(promptFromTable, function (prompt) {
                                    var questionWithPrompt = prompt.replace('%1', ' ' + question + ' ');
                                    callback(questionWithPrompt);
                                });
                            }

                            callback(question);
                        }
                    });
                }
            });
        },

        /**
         * Get a random response DB. This includes taking the user's answer and determining if it is correct
         * or incorrect, then giving the proper response. Call the callback function when it has been retrieved.
         * @param session
         * @param userAnswer
         * @param callback
         */
        getResponse: function (session, userAnswer, callback) {
            var correctAnswer = session.attributes.Answer;
            console.log("Data _getResponse correctAnswer: "+correctAnswer+" userAnswer: "+userAnswer);

            //Check if the user gave the correct answer
            if (userAnswer == correctAnswer) {
                //Pull a correct response from the database
                console.log("Data _gettingCorrectResponse: ");
                getRandomCorrectReply(function (correctReply) {
                    callback(correctReply);
                });
            }
            else {
                //Pull an incorrect response from the database
                console.log("Data _gettingIncorrectResponse: ");
                getRandomIncorrectReply(function (incorrectReply) {
                    callback(incorrectReply + correctAnswer);
                });
            }
        },

        /**
         * Put the result of a session into the DB of results, for review and analysis later.
         * @param givenWord
         * @param userWord
         * @param correct
         * @param sessionID
         */
        putResult: function (givenWord, userWord, correct, sessionID) {
            var dynamodb = getDynamoDB();
            var resultParams = { TableName: 'MemoryJaneResults',
                Item: {
                    Timestamp: { "N": Date.now().toString() },
                    WordGiven: { "S": givenWord },
                    UserResponse: { "S": userWord },
                    Correct: { "BOOL": correct },
                    SessionID: { "S": sessionID }
                }
            };

            dynamodb.putItem(resultParams, function(err, data) {
                if (err) console.log(err); // an error occurred
            });
        }
    };
}) ();

module.exports = data;