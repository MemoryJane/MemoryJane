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
        }
        return dynamodb;
    }

    return {
        /**
         * Get a random prompt from the DB. Call the callback function when it has been retrieved.
         * NOTE: the prompt will have a trailing space, and it will assume the word to spell goes at the
         * end of the prompt.
         * @param callback
         */
        getRandomSpellPrompt: function (callback) {
            var dynamodb = getDynamoDB();
            console.log("Start get random spelling prompt");

            // Get the number of prompts by doing a COUNT scan.
            var countParams = {TableName: "MemoryJaneWordPrompts", Select: 'COUNT'};
            dynamodb.scan(countParams, function (err, data) {
                if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
                else {
                    // Pick a random word from the table.
                    var number = data.Count;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    var getWordParams = {TableName: "MemoryJaneWordPrompts", Key: {Index: {"N": rand.toString()}}};

                    console.log("Data _describingTable_ itemCount: " + number);

                    // Get the random word from the table, returns async.
                    dynamodb.getItem(getWordParams, function (itemError, itemData) {
                        if (itemError) console.log("Data _gettingWordPrompt_  ERROR " + itemError); // an error occurred
                        else {
                            var prompt = itemData.Item.Prompt.S;
                            console.log("Data _gettingWordPrompt_ " + prompt);

                            callback(prompt);
                        }
                    });
                }
            });
        },

        /**
         * Get a random word from the DB. Call the callback
         * function when the word has been retrieved.
         * @param callback
         */
        getRandomWord: function (callback) {
            var dynamodb = getDynamoDB();
            console.log("Start get random word");

            // Get the number of prompts by doing a COUNT scan.
            var countParams = {TableName: "MemoryJaneWords", Select: 'COUNT'};
            dynamodb.scan(countParams, function (err, data) {
                if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
                else {
                    // Pick a random word from the table.
                    var number = data.Count;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    var getWordParams = {TableName: "MemoryJaneWords", Key: {Index: {"N": rand.toString()}}};

                    console.log("Data _describingTable_ itemCount: " + number);

                    // Get the random word from the table, returns async.
                    dynamodb.getItem(getWordParams, function (itemError, itemData) {
                        if (itemError) console.log("Data _gettingWord_  ERROR " + itemError); // an error occurred
                        else {
                            var word = itemData.Item.Word.S;
                            console.log("Data _gettingWord_ " + word);

                            callback(word);
                        }
                    });
                }
            });

        },

        /**
         * Get a random correct reply from the DB. Call the callback function when it has been retrieved.
         * @param callback
         */
        getRandomCorrectReply: function (callback) {
            var dynamodb = getDynamoDB();
            console.log("Start get random correct reply");

            // Get the number of prompts by doing a COUNT scan.
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

                            callback(correctReply);
                        }
                    });
                }
            });
        },

        /**
         * Get a random incorrect reply from the DB. Call the callback function when it has been retrieved.
         * @param callback
         */
        getRandomIncorrectReply: function (callback) {
            var dynamodb = getDynamoDB();
            console.log("Start get random incorrect reply");

            // Get the number of incorrect replies by doing a COUNT scan.
            var countParams = {TableName: "MemoryJaneIncorrectReplies", Select: 'COUNT'};
            dynamodb.scan(countParams, function (err, data) {
                if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
                else {
                    // Pick a random word from the table.
                    var number = data.Count;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    var getWordParams = {TableName: "MemoryJaneIncorrectReplies", Key: {Index: {"N": rand.toString()}}};

                    console.log("Data _describingTable_ itemCount: " + number);

                    // Get the random incorrect reply from the table, returns async.
                    dynamodb.getItem(getWordParams, function (itemError, itemData) {
                        if (itemError) console.log("Data _gettingIncorrectReply_  ERROR " + itemError); // an error occurred
                        else {
                            var incorrectReply = itemData.Item.Reply.S;
                            console.log("Data _gettingIncorrectReply_ " + incorrectReply);

                            callback(incorrectReply);
                        }
                    });
                }
            });
        }
    }
}) ();

module.exports = data;