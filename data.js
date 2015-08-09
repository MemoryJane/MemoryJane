/**
 * MemoryJane v1.0
 * Follows the Module pattern.
 * Written by David Williams
 */

var data = (function () {
    var AWS = require("aws-sdk");
    var dynamodb = getDynamoDB(false);

    /**
     * Get the database object, either from AWS if it is there, or locally if it is not.
     * This is a private function.
     * @returns {AWS.DynamoDB}
     */
    function getDynamoDB (local) {
        var DB;
        if (local) {
            DB = new AWS.DynamoDB({endpoint: new AWS.Endpoint('http://localhost:8000')});
            DB.config.update({accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1"});
        } else {
            // Otherwise try to connect to the remote DB using the config file.
            DB = new AWS.DynamoDB();
        }
        return DB;
    }

    /**
     * For small tables with a single string stored in an attribute, we can cache them in the session and
     * use this to get a random item from that table.
     * @param session
     * @param tableName
     * @param attributeName
     * @param randomTableItemCallback
     */
    function getRandomTableItem(session, tableName, attributeName, randomTableItemCallback) {
        var sessAttr = session.attributes;

        // If either the array-of-arrays or the specific array for this table are undefined,
        // then we need to create them.
        if (!sessAttr.cachedTableItems || !sessAttr.cachedTableItems[tableName]) {
            var tableParams = {TableName: tableName, "AttributesToGet": [ attributeName ] };
            var tableItems = [];

            // Get the list of attributes we care about.
            dynamodb.scan(tableParams, function (tableReplyErr, tableReplyData) {
                if (tableReplyErr) {
                    console.log("Data _getRandomTableItem  ERROR "+tableReplyErr);
                } else {
                    // Create the table for the index into the items.
                    if (!sessAttr.cachedTableItemsIndexes) sessAttr.cachedTableItemsIndexes = {};
                    sessAttr.cachedTableItemsIndexes[tableName] = tableReplyData.Count - 1;

                    // Create the table for the items.
                    if (sessAttr.cachedTableItems == undefined) sessAttr.cachedTableItems = {};
                    sessAttr.cachedTableItems[tableName] = [];

                    // Fill the table of items.
                    for (i = 0; i < tableReplyData.Count; i++) {
                        tableItems[i] = tableReplyData.Items[i][attributeName].S.trim();
                    }

                    //Randomize the set of incorrect replies
                    randomize(tableItems);
                    sessAttr.cachedTableItems[tableName] = tableItems;

                    var returnIndex = sessAttr.cachedTableItemsIndexes[tableName]--;
                    var returnValue = sessAttr.cachedTableItems[tableName][returnIndex];
                    randomTableItemCallback(returnValue);
                }
            });
        } else {
            // If the index is at the end of the list, randomize the list again and reset the counter.
            if (sessAttr.cachedTableItemsIndexes[tableName] < 0) {
                // Copy the array and randomize the copy.
                var tableToRandomize = sessAttr.cachedTableItems[tableName].slice(0);
                randomize(tableToRandomize);

                sessAttr.cachedTableItems[tableName] = tableToRandomize;
                sessAttr.cachedTableItemsIndexes[tableName] = sessAttr.cachedTableItems[tableName].length-1;
            }

            // Get the next item, decrement the index.
            var returnIndex = sessAttr.cachedTableItemsIndexes[tableName]--;
            var returnValue = sessAttr.cachedTableItems[tableName][returnIndex];
            randomTableItemCallback(returnValue);
        }
    }

    /**
     * Recursive function that takes an array of indexes, pulls a set of those indexes at random from the DB table,
     * returning the array of items and the remaining array of indexes.
     * @param indexesArray
     * @param tableName
     * @param indexName
     * @param count
     * @param randomItemArrayCallback
     */
    function getRandomItemArrayFromIndexArray (indexesArray, tableName, indexName, count, randomItemArrayCallback) {
        // Pick a random index from the indexesArray.
        var randomIndexOfIndexes =(Math.floor(Math.random() * indexesArray.length));
        var randomIndex = indexesArray[randomIndexOfIndexes];
        var updatedIndexesArray = indexesArray.slice(0);
        updatedIndexesArray.slice(randomIndexOfIndexes, randomIndexOfIndexes+1);

        var tableParams = { TableName: tableName, Key: { } };
        tableParams.Key[indexName] = { "N": randomIndex };

        dynamodb.getItem(tableParams, function (tableReplyErr, tableReplyData) {
            if (tableReplyErr) {
                console.log("Data _getRandomItemArrayFromIndexArray  ERROR " + tableReplyErr);
            } else {
                var randomItem = [tableReplyData.Item];

                // Keep calling this recursively until the count is 1, which means this is the last one.
                if (count == 1) {
                    randomItemArrayCallback(randomItem, updatedIndexesArray);
                } else {
                    getRandomItemArrayFromIndexArray(updatedIndexesArray, tableName, indexName, count-1, function(returnArray, finalIndexesArray) {
                        // Combine the returnArray with the one randomItem already found.
                        var finalReturnArray = returnArray.concat(randomItem);
                        randomItemArrayCallback(finalReturnArray, finalIndexesArray)
                    });
                }
            }
        });
    }

    /**
     * For large databases of items, we don't want to store all of the items in the session, just a few of them at
     * a time. This caches blocks of those items, maintaining three things in the session: the small array of items,
     * the index to the next item to use, and the array of indexes to refill the small array with when needed.
     * @param session
     * @param tableName
     * @param indexName
     * @param randomTableItemCallback
     */
    function getRandomTableItemInBlocks(session, tableName, indexName, randomTableItemCallback) {
        var sessAttr = session.attributes;
        var blockSize = 15;  // The cache size;

        // If the array-of-arrays or the specific array for this table are undefined,
        // or if the index array has fewer than the blocksize left,
        // then we start from scratch.
        if (!sessAttr.cachedTableItems || !sessAttr.cachedTableItems[tableName] || sessAttr.cachedTableItemsRefillIndexes[tableName].length < blockSize) {
            var tableParams = {TableName: tableName, "AttributesToGet": [indexName]};
            var tableAllIndexes = [];
            var tableItems = [];

            // Get the list of all of the indexes.
            dynamodb.scan(tableParams, function (tableReplyErr, tableReplyData) {
                if (tableReplyErr) {
                    console.log("Data _getRandomTableItemInBlocks  ERROR " + tableReplyErr);
                } else {
                    // Fill the table of all indexes with all of the table indexes.
                    for (i = 0; i < tableReplyData.Count; i++) {
                        tableAllIndexes[i] = tableReplyData.Items[i][indexName].N.trim();
                    }

                    // Get blockSize number of random items and put them in the table of items.
                    getRandomItemArrayFromIndexArray(tableAllIndexes, tableName, indexName, blockSize, function (returnItemArray, returnIndexesArray) {
                        // Create the table of items.
                        if (!sessAttr.cachedTableItems) sessAttr.cachedTableItems = {};
                        sessAttr.cachedTableItems[tableName] = returnItemArray;

                        // Create the table for the cached table's item index, start it at the end of the list.
                        if (!sessAttr.cachedTableItemsIndexes) sessAttr.cachedTableItemsIndexes = {};
                        sessAttr.cachedTableItemsIndexes[tableName] = blockSize - 1;

                        // Save the remaining refill indexes for next time we run out in the cache.
                        if (!sessAttr.cachedTableItemsRefillIndexes) sessAttr.cachedTableItemsRefillIndexes = {};
                        sessAttr.cachedTableItemsRefillIndexes[tableName] = returnIndexesArray;

                        // Return the item at the end of the cache.
                        var returnIndex = sessAttr.cachedTableItemsIndexes[tableName]--;
                        var returnValue = sessAttr.cachedTableItems[tableName][returnIndex];
                        randomTableItemCallback(returnValue);
                    });
                }
            });
        } else if (sessAttr.cachedTableItemsIndexes[tableName] < 0) {
            // If the index is at the end of the cache, then we need to get some fresh items from the table.
            var refillIndexesCopy = sessAttr.cachedTableItemsRefillIndexes[tableName].slice(0);
            getRandomItemArrayFromIndexArray(refillIndexesCopy, tableName, indexName, blockSize, function (returnItemArray, returnIndexesArray) {
                sessAttr.cachedTableItemsRefillIndexes[tableName] = returnIndexesArray;
                sessAttr.cachedTableItems[tableName] = returnItemArray;
                sessAttr.cachedTableItemsIndexes[tableName] = sessAttr.cachedTableItems[tableName].length-1;

                // Now, return the item at the end of the cache.
                var returnIndex = sessAttr.cachedTableItemsIndexes[tableName]--;
                var returnValue = sessAttr.cachedTableItems[tableName][returnIndex];
                randomTableItemCallback(returnValue);
            });
        } else {
            // Nothing to do, just return the item at the end of the cache.
            var returnIndex = sessAttr.cachedTableItemsIndexes[tableName]--;
            var returnValue = sessAttr.cachedTableItems[tableName][returnIndex];
            randomTableItemCallback(returnValue);
        }
    }

    /**
     * Randomize a set of data pulled from the table
     * @param array
     */
    function randomize(array) {
        for (v = 0; v < (array.length / 4); v++) {
            var randomIndex1 = (Math.floor(Math.random() * array.length));
            var randomIndex2 = (Math.floor(Math.random() * (array.length - 1)));
            if (randomIndex2 >= randomIndex1) randomIndex2++;
            array[randomIndex1] = array.splice(randomIndex2, 1, array[randomIndex1])[0];
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
            // Get the number of questions by doing a COUNT scan.
            var newQuestionParams = {TableName: "MemoryJaneFlashCards", Select: 'COUNT'};
            dynamodb.scan(newQuestionParams, function (newQuestionErr, newQuestionData) {
                if (newQuestionErr) {
                    console.log("Data _getNewQuestion  ERROR " + newQuestionErr);
                } else {
                    // Pick a random question from the table.
                    getRandomTableItemInBlocks(session, "MemoryJaneFlashCards", "Index", function(randomQuestionItem) {
                        var question = randomQuestionItem.Question.S;
                        var answer = randomQuestionItem.Answer.S;
                        session.attributes.Answer = answer;

                        // If there is a prompt, add it to the question.
                        if (randomQuestionItem.Prompt) {
                            var promptFromTable = randomQuestionItem.Prompt.S;
                            var tableName = "MemoryJane"+promptFromTable+"Prompts";
                            getRandomTableItem(session, tableName, "Prompt", function (prompt) {
                                var questionWithPrompt = prompt.replace('%1', ' ' + question + ' ');

                                session.attributes.Question = questionWithPrompt;
                                callback(questionWithPrompt);
                            });
                        } else {
                            session.attributes.Question = question;
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
            var userID = session.user.userId;
            var correct = correctAnswer == userAnswer;
            var rightNow = new Date();
            var dateToday = Number(rightNow.getUTCFullYear())
                +((rightNow.getUTCMonth()+1)*10000)
                +((rightNow.getUTCDate()+1)*1000000);
            var timeNow = Number(rightNow.getUTCMilliseconds())
                +(rightNow.getUTCSeconds()*1000)
                +(rightNow.getUTCMinutes()*100000)
                +(rightNow.getUTCHours()*10000000);

            var resultParams = { TableName: 'MemoryJaneQueryResults',
                Item: {
                    Date: { "N": dateToday.toString() },
                    Time: { "N": timeNow.toString() },
                    WordGiven: {"S": correctAnswer},
                    UserResponse: {"S": userAnswer},
                    Correct: { "BOOL": correct },
                    SessionID: {"S": sessionID},
                    UserID: {"S": userID}
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