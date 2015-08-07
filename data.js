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
            console.log("Data _getDynamoDB using LOCAL db");
        }
        return dynamodb;
    }

    /**
     * Get a random item from a table.
     * Assumes there is an "Index" in the table.
     */
    function getRandomItemFromTable(tableName, randomItemCallback) {
        var dynamodb = getDynamoDB();

        var incorrectReplyParams = {TableName: tableName, Select: 'COUNT'};
        dynamodb.scan(incorrectReplyParams, function (tableReplyErr, tableReplyData) {
            if (tableReplyErr) {
                console.log("Data _getRandomItemFromTable  ERROR " + tableReplyErr);
            } else {
                var tableLength = tableReplyData.Count;
                var randomIndex = (Math.floor(Math.random() * tableLength)) + 1;
                var tableItemParams = {
                    TableName: tableName,
                    Key: {Index: {"N": randomIndex.toString()}}
                };

                // Get the random incorrect reply from the table, returns async.
                dynamodb.getItem(tableItemParams, function (getTableItemError, getTableItemData) {
                    if (getTableItemError) {
                        console.log("Data _getRandomItemFromTable  ERROR " + getTableItemError);
                    } else {
                        randomItemCallback(getTableItemData.Item);
                    }
                });
            }
        });
    }

    /**
     * Get a random incorrect reply from the DB. Call the callback
     * function when the word has been retrieved.
     * The reply is an incomplete sentence. It is assumed that the correct answer will be appended
     * at the end of the reply that is sent back.
     */
    function getRandomIncorrectReply(incorrectReplyCallback) {
        getRandomItemFromTable("MemoryJaneIncorrectReplies", function(incorrectReplyItem) {
            incorrectReplyCallback(incorrectReplyItem.Reply.S);
        });
    }

    /**
     * Get a random correct reply from the DB. Call the callback
     * function when the word has been retrieved.
     * This is a complete sentence, congratulating the user. It is assumed that the answer will not appear
     * in the congratulations.
     */
    function getRandomCorrectReply(correctReplyCallback) {
        getRandomItemFromTable("MemoryJaneCorrectReplies", function(correctReplyItem) {
            correctReplyCallback(correctReplyItem.Reply.S);
        });
    }

    /**
     * Get a random prompt from the DB. Call the callback function when it has been retrieved.
     * @param promptTag
     * @param promptCallback
     */
    function getRandomPrompt(promptTag, promptCallback) {
        var tableName = "MemoryJane" + promptTag + "Prompts";
        getRandomItemFromTable(tableName, function(promptItem) {
            promptCallback(promptItem.Prompt.S);
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
            var newQuestionParams = {TableName: "MemoryJaneFlashCards", Select: 'COUNT'};
            dynamodb.scan(newQuestionParams, function (newQuestionErr, newQuestionData) {
                if (newQuestionErr) {
                    console.log("Data _getNewQuestion  ERROR " + newQuestionErr);
                } else {
                    // Pick a random question from the table.
                    var tableLength = newQuestionData.Count;
                    var randomIndex = (Math.floor(Math.random() * tableLength)) + 1;
                    var getQuestionParams = {
                        TableName: "MemoryJaneFlashCards",
                        Key: {Index: {"N": randomIndex.toString()}}
                    };

                    // Get the random incorrect reply from the table, returns async.
                    dynamodb.getItem(getQuestionParams, function (getQuestionItemError, getQuestionItemData) {
                        if (getQuestionItemError) {
                            console.log("Data _getNewQuestion ERROR " + getQuestionItemError);
                        } else {
                            var question = getQuestionItemData.Item.Question.S;
                            session.attributes.Answer = getQuestionItemData.Item.Answer.S;

                            //Pull prompt data from the table and use it in the logic
                            if (getQuestionItemData.Item.Prompt != undefined) {
                                var promptFromTable = getQuestionItemData.Item.Prompt.S;
                                getRandomPrompt(promptFromTable, function (prompt) {
                                    var questionWithPrompt = prompt.replace('%1', ' ' + question + ' ');
                                    callback(questionWithPrompt);
                                });
                            } else {
                                callback(question);
                            }
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

            // HACK: If the correctAnswer is undefined, then we're running locally. Give it an obviously LOCAL value.
            if (correctAnswer == undefined) {
                correctAnswer = "LOCAL_HACK";
            }

            //Check if the user gave the correct answer
            if (userAnswer == correctAnswer) {
                //Pull a correct response from the database
                getRandomCorrectReply(function (correctReply) {
                    callback(correctReply);
                });
            }
            else {
                //Pull an incorrect response from the database
                getRandomIncorrectReply(function (incorrectReply) {
                    callback(incorrectReply.replace('%1', ' ' + correctAnswer + ' '));
                });
            }
        },

        /**
         * Put the result of a session into the DB of results, for review and analysis later.
         * @param userAnswer
         * @param session
         */
        putResult: function (userAnswer, session) {
            var correctAnswer = session.attributes.Answer;
            var sessionID = session.sessionId;
            var correct = correctAnswer == userAnswer;

            // HACK: If the correctAnswer is undefined, then we're running locally. Give it an obviously LOCAL value.
            if (correctAnswer == undefined) {
                correctAnswer = "LOCAL_HACK";
            }

            var dynamodb = getDynamoDB();
            var resultParams = { TableName: 'MemoryJaneResults',
                Item: {
                    Timestamp: { "N": Date.now().toString() },
                    WordGiven: {"S": correctAnswer},
                    UserResponse: {"S": userAnswer},
                    Correct: { "BOOL": correct },
                    SessionID: { "S": sessionID }
                }
            };

            console.log("Date _putResult correctAnswer: "+correctAnswer+" userAnswer: "+userAnswer);
            dynamodb.putItem(resultParams, function (resultErr, data) {
                if (resultErr) console.log(resultErr); // an error occurred
            });
        }
    };
}) ();

module.exports = data;