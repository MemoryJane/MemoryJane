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
        if (!dynamodb.credentials) {
            dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });
            dynamodb.config.update({ accessKeyId: "myKeyId", secretAccessKey: "secretKey", region: "us-east-1" });
        }
        return dynamodb;
    }

    return {
        /*
            Get a random word from the DB. Set it as an attribute in the session. Call the callback
            function when the word has been retrieved.
         */
        getRandomWord: function (callback) {
            var dynamodb = getDynamoDB();


            // Describe the table to get the word count, returns async.
            var describeParams = { TableName: "MemoryJaneWords" };
            dynamodb.describeTable(describeParams, function (err, data) {
                if (err) console.log("Data _describingTable_  ERROR " + err); // an error occurred
                else {
                    // Pick a random word from the table.
                    var number = data.Table.ItemCount;
                    var rand = (Math.floor(Math.random() * number)) + 1;
                    var getWordParams = { TableName: "MemoryJaneWords", Key: { Index: {"N": rand.toString()} } };

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

        }
    };
}) ();

module.exports = data;