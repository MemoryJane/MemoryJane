/**
 * MemoryJane v1.0
 * Follows the Module pattern.
 * Written by David Williams
 */

var AWS = require("aws-sdk");

var data = (function () {
    /**
     * Get the database object, either from AWS if it is there, or locally if it is not.
     * This is a private function.
     * @returns {AWS.DynamoDB}
     */
    function getDynamoDB (local) {
        var dynamodb;
        if (false) {
            dynamodb = new AWS.DynamoDB({endpoint: new AWS.Endpoint('http://localhost:8000')});
            dynamodb.config.update({accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1"});
            console.log("Using LOCAL ");
        } else {
            // Otherwise try to connect to the remote DB using the config file.
            //AWS.config.loadFromPath('./config.json');
            dynamodb = new AWS.DynamoDB();
            console.log("Using AWS ");
        }
        return dynamodb;
    }

    /**
     * Get a random item from a table.
     * Assumes there is an "Index" in the table.
     * This is a private function.
     * @param tableName
     * @param randomItemCallback
     */
    function getRandomItemFromTable(tableName, randomItemCallback) {
        var dynamodb = getDynamoDB();

        var tableParams = {TableName: tableName, Select: 'COUNT'};
        dynamodb.scan(tableParams, function (tableReplyErr, tableReplyData) {
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
     * This is a private function.
     * @param session
     * @param incorrectReplyCallback
     */
    function getRandomIncorrectReply(session, incorrectReplyCallback) {
        var dynamodb = getDynamoDB();

        if (session.attributes.incorrectReplies == undefined) {
            var tableParams = {TableName: "MemoryJaneIncorrectReplies"};
            dynamodb.scan(tableParams, function (tableReplyErr, tableReplyData) {
                session.attributes.incorrectReplies = [];
                session.attributes.nextIncorrectReplyIndex = tableReplyData.Count - 1;
                for (i = 0; i < tableReplyData.Count; i++) {
                    session.attributes.incorrectReplies[i] = tableReplyData.Items[i].Reply.S.trim();
                }

                //Randomize the set of incorrect replies
                var incorrectRepliesArr = session.attributes.incorrectReplies;
                randomize(incorrectRepliesArr);
                session.attributes.incorrectReplies = incorrectRepliesArr;

                incorrectReplyCallback(session.attributes.incorrectReplies[session.attributes.nextIncorrectReplyIndex--]);
            });
        } else if (session.attributes.nextIncorrectReplyIndex == 0) {
            //If you have gone through all of the replies, re-randomize them and reset the countdown
            randomize(session.attributes.incorrectReplies.length, session);
            session.attributes.nextIncorrectReplyIndex = session.attributes.incorrectReplies.length - 1;
            incorrectReplyCallback(session.attributes.incorrectReplies[session.attributes.nextIncorrectReplyIndex--]);
        } else {
            //If neither of the above conditions are true, return the next item in the countdown
            incorrectReplyCallback(session.attributes.incorrectReplies[session.attributes.nextIncorrectReplyIndex--]);
        }
    }

    /**
     * Randomize a set of data pulled from the table
     * @param arr
     */
    function randomize(arr) {
        for (v = 0; v < (arr.length / 4); v++) {
            var randomIndex1 = (Math.floor(Math.random() * arr.length));
            var randomIndex2 = (Math.floor(Math.random() * (arr.length - 1)));
            if (randomIndex2 >= randomIndex1) randomIndex2++;
            arr[randomIndex1] = arr.splice(randomIndex2, 1, arr[randomIndex1])[0];
        }
    }

    /**
     * Get a random correct reply from the DB. Call the callback
     * function when the word has been retrieved.
     * This is a complete sentence, congratulating the user. It is assumed that the answer will not appear
     * in the congratulations.
     * This is a private function.
     * @param session
     * @param correctReplyCallback
     */
    function getRandomCorrectReply(session, correctReplyCallback) {
        getRandomItemFromTable("MemoryJaneCorrectReplies", function(correctReplyItem) {
            correctReplyCallback(correctReplyItem.Reply.S);
        });
    }

    /**
     * Get a random prompt from the DB. Call the callback function when it has been retrieved.
     * This is a private function.
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
         * THis is a public function.
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
            if (userAnswer.toLowerCase() == correctAnswer.toLowerCase()) {
                //Pull a correct response from the database
                getRandomCorrectReply(session, function (correctReply) {
                    callback(correctReply);
                });
            }
            else {
                //Pull an incorrect response from the database
                getRandomIncorrectReply(session, function (incorrectReply) {
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
            var rightNow = new Date();
            var dateToday = Number(rightNow.getUTCFullYear())
                +((rightNow.getUTCMonth()+1)*10000)
                +((rightNow.getUTCDate()+1)*1000000);
            var timeNow = Number(rightNow.getUTCMilliseconds())
                +(rightNow.getUTCSeconds()*1000)
                +(rightNow.getUTCMinutes()*100000)
                +(rightNow.getUTCHours()*10000000);

            // HACK: If the correctAnswer is undefined, then we're running locally. Give it an obviously LOCAL value.
            if (correctAnswer == undefined) {
                correctAnswer = "LOCAL_HACK";
            }

            var dynamodb = getDynamoDB();
            var resultParams = { TableName: 'MemoryJaneQueryResults',
                Item: {
                    Date: { "N": dateToday.toString() },
                    Time: { "N": timeNow.toString() },
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