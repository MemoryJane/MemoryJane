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
    function getRandomIncorrectReply() {
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

                        return incorrectReply;
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
    function getRandomCorrectReply() {
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

                        return correctReply;
                    }
                });
            }
        });

    }

    /**
     * Get a random prompt from the DB. Call the callback function when it has been retrieved.
     * @param database
     * @param callback
     */
    function getPrompt(database, callback) {
        //Get a new question and answer from the database
        var dynamodb = getDynamoDB();

        // Get the number of questions by doing a COUNT scan.
        var promptParams = {TableName: "MemoryJane" + database + "Prompts", Select: 'COUNT'};
        dynamodb.scan(promptParams, function (err, data) {
            if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
            else {
                // Pick a random prompt from the table.
                var number = data.Count;
                var rand = (Math.floor(Math.random() * number)) + 1;
                var getPromptParams = {
                    TableName: "MemoryJane" + database + "Prompts",
                    Key: {Index: {"N": rand.toString()}}
                };

                console.log("Data _describingTable_ itemCount: " + number);

                // Get the random incorrect reply from the table, returns async.
                dynamodb.getItem(getPromptParams, function (itemError, itemData) {
                    if (itemError) console.log("Data _gettingNewQuestion_  ERROR " + itemError); // an error occurred
                    else {
                        var prompt = itemData.Item.Prompt.S;
                        callback(prompt);
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
                    // Pick a random incorrect reply from the table.
                    var number = data.Count;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    console.log("Table index picked: " + rand);
                    var getQuestionParams = {TableName: "MemoryJaneFlashCards", Key: {Index: {"N": rand.toString()}}};

                    console.log("Data _describingTable_ itemCount: " + number);

                    // Get the random incorrect reply from the table, returns async.
                    dynamodb.getItem(getQuestionParams, function (itemError, itemData) {
                        if (itemError) console.log("Data _gettingNewQuestion_  ERROR " + itemError); // an error occurred
                        else {
                            //Pull prompt data from the table and use it in the logic
                            var promptFromTable;
                            if (itemData.Item.Prompt != undefined) {
                                promptFromTable = itemData.Item.Prompt.S;
                            }
                            var question = itemData.Item.Question.S;
                            console.log("Data _gettingQuestion_ : " + question);
                            console.log("Data _gettingCategory_ : " + promptFromTable);

                            // If Prompt is not defined, or empty, then the Question contains the entire question
                            if (promptFromTable == undefined || promptFromTable == null) {
                                //do nothing
                            }
                            //Otherwise insert the question into the prompt at the point it says "%1"
                            else {
                                //Pull from the prompt database and combine the two
                                getPrompt(function (promptFromTable, prompt) {
                                    {
                                        question = prompt.replace('%1', ' ' + itemData.Item.Question.S + ' ');
                                    }
                                });
                            }

                            //Pulls answer data from the table and stores it in the session attributes
                            session.attributes.Answer = itemData.Item.Answer.S;
                            console.log("Data _gettingNewQuestion_ : " + question + " Answer: " + session.attributes.Answer);

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
            console.log("Data _gettingAnswer: ");
            var correctAnswer = session.attributes.Answer;

            //Check if the user gave the correct answer
            if (userAnswer == correctAnswer) {
                //Pull a correct response from the database
                console.log("Data _gettingCorrectResponse: ");
                data.getRandomCorrectReply(function (correctReply) {
                    callback(correctReply);
                });
            }
            else {
                //Pull an incorrect response from the database
                console.log("Data _gettingIncorrectResponse: ");
                data.getRandomIncorrectReply(function (incorrectReply) {
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