//#region REQUIRE
const { BotFrameworkAdapter, ConsoleAdapter, ConversationState, MemoryStorage } = require('botbuilder');
const restify = require('restify');
const alexa= require('./alexaBridge/alexaBridge.js')
const { botrunner } = require('./botrunner');
require('dotenv').config();
//#endregion

//#region initializations
alexa.start();
var adapter;
// Create adapter
if (process.env.CONSOLE=='YES')
    adapter = new ConsoleAdapter();
else{
    adapter = new BotFrameworkAdapter({ 
        appId: process.env.MICROSOFT_APP_ID, 
        appPassword: process.env.MICROSOFT_APP_PASSWORD
    });

	// Catch-all for any unhandled errors in your bot.
	adapter.onTurnError = async (context, error) => {
		// This check writes out errors to console log .vs. app insights.
		console.error(`\n [onTurnError]: ${ error }`);
		// Send a message to the user
		context.sendActivity(`Oops. Something went wrong!`);
		// Clear out state
		await convoState.clear(context);
		// Save state changes.
		await convoState.saveChanges(context);
	};		
}

//MEMORY: (this is a demo)
const azureStorage = new MemoryStorage();

// Add state middleware
let convoState;
convoState= new ConversationState(azureStorage);


//#region Start Console or Server
if (process.env.CONSOLE=='YES')
{
    adapter.listen(async (context) => {
		console.log("CONSOLE");
        main(context);
    });
}
else
{
	const bot = new botrunner(convoState);
    // Create server
    let server = restify.createServer();
    server.listen(process.env.port || process.env.PORT || 3978, function () {
        console.log(`${server.name} listening to ${server.url}`);
	});
	//ALEXABRIDGE
	server.use(restify.plugins.bodyParser());
	server.post('/messages', (req, res, err) => alexa.says(req, res, err));
	//BOT
    server.post('/api/messages', (req, res) => {
        adapter.processActivity(req, res, async (context) => {
            await bot.onTurn(context);
        })
	});
}
//#endregion


global.howmany = function howmany (params) {
	console.log("howmany was called with " + params);
	return "Don't know yet how to call the main system to answer How many...";
  }

global.howmanywere = function howmany (params) {
	console.log("howmanywere was called with " + params);
	return "Don't know how to call How many were...";
  }
