/**
 * MemoryJane v1.0
 * Written by David Williams
 * Based on samples from Amazon's Alexa Skills Kit:
 * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/using-the-alexa-skills-kit-samples-java
 */
 
/**
 * Initialize AlexaSkill with an appId. This will be checked later to confirm that our app is doing the calling.
 *
 * @param appId
 * @constructor
 */
function AlexaSkill(appId) {
    // appId is private, no reason for anyone else to use it.
    this._appId = appId;
}

/**
 * Define the request handlers - there are only three possibilities.
 * This is done on the prototype and should not need to be overridden.
 */
AlexaSkill.prototype.requestHandlers = {
    LaunchRequest: function (event, context, response) {
        this.eventHandlers.onLaunch.call(this, event.request, event.session, response);
    },

    IntentRequest: function (event, context, response) {
        this.eventHandlers.onIntent.call(this, event.request, event.session, response);
    },

    SessionEndedRequest: function (event, context) {
        this.eventHandlers.onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * These are the prototype event handlers. They should be overridden by the specific skill.
 */
AlexaSkill.prototype.eventHandlers = {
    /**
     * Called when the session starts.
     * Subclasses could have overriden this function to open any necessary resources.
     */
    onSessionStarted: function (sessionStartedRequest, session) {
    },

    /**
     * Called when the user launches the skill without specifying what they want.
     * The subclass must override this function and provide feedback to the user.
     */
    onLaunch: function (launchRequest, session, response) {
        throw "onLaunch should be overriden by subclass";
    },

    /**
     * Called when the user specifies an intent.
     */
    onIntent: function (intentRequest, session, response) {
        var intent = intentRequest.intent,
            intentName = intentRequest.intent.name,
            intentHandler = this.intentHandlers[intentName];
        if (intentHandler) {
            console.log('AlexaSkill dispatch intent = ' + intentName);
            intentHandler.call(this, intent, session, response);
        } else {
            throw 'AlexaSkill Unsupported intent = ' + intentName;
        }
    },

    /**
     * Called when the user ends the session.
     * Subclasses could have overriden this function to close any open resources.
     */
    onSessionEnded: function (sessionEndedRequest, session) {
    }
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

/**
 * Execute is the first function called.
 *
 * @param event
 * @param context
 */
AlexaSkill.prototype.execute = function (event, context) {
    try {
        console.log("AlexaSkill _execute_ session applicationId: " + event.session.application.applicationId);

        // Validate that this request originated from authorized source.
        if (this._appId && event.session.application.applicationId !== this._appId) {
            console.log("AlexaSkill _error_ the applicationIds don't match : "
                + event.session.application.applicationId + " and "
                + this._appId);
            context.fail();
        }

        // Not sure what having undefined sessions attributes does ..
        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        // If the session is new, initialize it.
        if (event.session.new) {
            this.eventHandlers.onSessionStarted(event.request, event.session);
        }

        // Route the request to the proper handler.
        var requestHandler = this.requestHandlers[event.request.type];
        requestHandler.call(this, event, context, new Response(context, event.session));
    } catch (e) {
        console.log("AlexaSkill _execute_ unexpected exception " + e);
    }
};

/**
 * Response is the structure for how Alexa responds to the intent.
 *
 * @param context
 * @param session
 * @constructor
 */
var Response = function (context, session) {
    this._context = context;
    this._session = session;
};

/**
 * Four helper functions to make it easy to construct a response for Alexa.
 *
 * @type {{tell, tellWithCard, ask, askWithCard}}
 */
Response.prototype = (function () {
    var buildSpeechletResponse = function (options) {
        var alexaResponse = {
            outputSpeech: {
                type: 'PlainText',
                text: options.output
            },
            shouldEndSession: options.shouldEndSession
        };
        if (options.reprompt) {
            alexaResponse.reprompt = {
                outputSpeech: {
                    type: 'PlainText',
                    text: options.reprompt
                }
            };
        }
        if (options.cardTitle && options.cardContent) {
            alexaResponse.card = {
                type: "Simple",
                title: options.cardTitle,
                content: options.cardContent
            };
        }
        var returnResult = {
            version: '1.0',
            response: alexaResponse
        };
        if (options.session && options.session.attributes) {
            returnResult.sessionAttributes = options.session.attributes;
        }
        return returnResult;
    };

    return {
        tell: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: true
            }));
        },
        tellWithCard: function (speechOutput, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: true
            }));
        },
        ask: function (speechOutput, repromptSpeech) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                shouldEndSession: false
            }));
        },
        askWithCard: function (speechOutput, repromptSpeech, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: false
            }));
        }
    };
})();

// Export AlexaSkill so that it can be used when this src is required.
// Use: var AlexaSkill = require('./AlexaSkill');
module.exports = AlexaSkill;