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
        if (true) {
            dynamodb = new AWS.DynamoDB({endpoint: new AWS.Endpoint('http://localhost:8000')});
            dynamodb.config.update({accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1"});
            console.log("Using LOCAL ");
        } else {
            // Otherwise try to connect to the remote DB using the config file.
            dynamodb = new AWS.DynamoDB();
            console.log("Using AWS ");
        }
        return dynamodb;
    }

    /**
     * For small tables, we can cache them in the session and use this to get a random item from that table.
     * @param session
     * @param tableName
     * @param attributeName
     * @param randomTableItemCallback
     */
    function getRandomTableItem(session, tableName, attributeName, randomTableItemCallback) {
        var dynamodb = getDynamoDB();

        // If either the array-of-arrays or the specific array for this table are undefined,
        // then we need to create them.
        if (session.attributes.cachedTableItems == undefined || session.attributes.cachedTableItems[tableName] == undefined) {
            var tableParams = {TableName: tableName, "AttributesToGet": [ attributeName ] };
            var tableItems = [];

            // Get the list of attributes we care about.
            dynamodb.scan(tableParams, function (tableReplyErr, tableReplyData) {
                if (tableReplyErr) {
                    console.log("Data _getRandomTableItem  ERROR "+tableReplyErr);
                } else {
                    // Create the table for the index into the items.
                    if (session.attributes.cachedTableItemsIndexes == undefined) session.attributes.cachedTableItemsIndexes = {};
                    session.attributes.cachedTableItemsIndexes[tableName] = tableReplyData.Count - 1;

                    // Create the table for the items.
                    if (session.attributes.cachedTableItems == undefined) session.attributes.cachedTableItems = {};
                    session.attributes.cachedTableItems[tableName] = [];

                    // Fill the table of items.
                    for (i = 0; i < tableReplyData.Count; i++) {
                        tableItems[i] = tableReplyData.Items[i][attributeName].S.trim();
                        console.log(tableReplyData.Items[i]);
                    }

                    //Randomize the set of incorrect replies
                    randomize(tableItems);
                    session.attributes.cachedTableItems[tableName] = tableItems;

                    var returnValue = session.attributes.cachedTableItems[tableName][session.attributes.cachedTableItemsIndexes[tableName]--];
                    randomTableItemCallback(returnValue);
                }
            });
        } else {
            if (session.attributes.cachedTableItemsIndexes[tableName] == 0) {
                //If you have gone through all of the replies, re-randomize them and reset the countdown
                var tableToRandomize = session.attributes.cachedTableItems[tableName].slice(0);
                randomize(tableToRandomize);
                session.attributes.cachedTableItems[tableName] = tableToRandomize;
                session.attributes.cachedTableItemsIndexes[tableName] = session.attributes.cachedTableItems[tableName].length-1;
            }

            // Get the next item, decrement the index.
            var returnValue = session.attributes.cachedTableItems[tableName][session.attributes.cachedTableItemsIndexes[tableName]--];
            randomTableItemCallback(returnValue);
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
                                var tableName = "MemoryJane"+promptFromTable+"Prompts";
                                getRandomTableItem(session, tableName, "Prompt", function (prompt) {
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
                getRandomTableItem(session, "MemoryJaneCorrectReplies", "Reply", function (correctReply) {
                    callback(correctReply);
                });
            }
            else {
                //Pull an incorrect response from the database
                getRandomTableItem(session, "MemoryJaneIncorrectReplies", "Reply", function (incorrectReply) {
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