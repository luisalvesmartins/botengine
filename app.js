//#region REQUIRE
var lambotenginecore=require('./lambotenginecore');
const { BotFrameworkAdapter, BotStateSet, ConsoleAdapter, ConversationState, MemoryStorage, UserState } = require('botbuilder');
//const { TableStorage } = require('botbuilder-azure');
const botbuilder_dialogs = require('botbuilder-dialogs');
const restify = require('restify');
const socketio=require('socket.io');
var querystring = require('querystring');
var url = require('url');
var storage = require('azure-storage');
require('dotenv').config();
//#endregion

//#region initializations
var adapter;
var io;
// Create adapter
if (process.env.CONSOLE=='YES')
    adapter = new ConsoleAdapter();
else
    adapter = new BotFrameworkAdapter({ 
        appId: process.env.MICROSOFT_APP_ID, 
        appPassword: process.env.MICROSOFT_APP_PASSWORD
    });

//FILE: const azureStorage = new FileStorage("c:/temp");
//MEMORY: (this is a demo)
const azureStorage = new MemoryStorage();

// Add state middleware
const convoState = new ConversationState(azureStorage);
const userState  = new UserState(azureStorage);
adapter.use(new BotStateSet(convoState, userState));
const dialogs = new botbuilder_dialogs.DialogSet();

//INITIALIZE CONTAINERS
var blobService = storage.createBlobService();
var containerName = process.env.BOTFLOW_CONTAINER;
blobService.createContainerIfNotExists(process.env.BOTFLOW_CONTAINER, function(err, result, response) {
	if (err) {
		console.log("ERROR:Couldn't create container %s", containerName);
		console.error(err);
	}
});
blobService.createContainerIfNotExists(process.env.BOTFLOW_CONTAINER_CONTROL, function(err, result, response) {
	if (err) {
		console.log("ERROR:Couldn't create container %s", containerName);
		console.error(err);
	}
});
//#endregion
   
 
dialogs.add('textPrompt', new botbuilder_dialogs.TextPrompt());

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
    // Create server
    let server = restify.createServer();
    server.listen(process.env.port || process.env.PORT || 3978, function () {
        console.log(`${server.name} listening to ${server.url}`);
	});
	io=socketio.listen(server.server);
	io.sockets.on('connection', function(client){
		client.on("session",function(data){
			console.log("Connected:" + data.session)
			client.join(data.session);
		})
		client.on('disconnect', function(){});
	});
		
	//SITE
	server.get(/\/site\/?.*/, restify.plugins.serveStatic({
		directory: "./public",
		appendRequestPath: false
	}));
	//BOT
    server.post('/api/messages', (req, res) => {
        adapter.processActivity(req, res, async (context) => {
            await main(context);
        })
	});
	//SAVE BOT GRAPHICAL AND .BOT
	//ARGUMENTS: key=bot name, botflow=graphical flow
    server.post('/api/bot', (req, res) => {
		var jsonString = '';

		req.on('data', function (data) {
			jsonString += data;
		});

		req.on('end', function () {
			var p=querystring.parse(jsonString);
			var key=p["key"];
			var botFlow=p["botflow"];

			lambotenginecore.log("SAVE DESIGNER:" + botFlow);
			//WRITE IT IN AZURE STORAGE
			var blobService = storage.createBlobService();
			var containerName = process.env.BOTFLOW_CONTAINER;
			blobService.createBlockBlobFromText(
				containerName,
				key,
				botFlow,
				function(error, result, response){
					if(error){
						lambotenginecore.error("03:Couldn't upload string");
						lambotenginecore.error(error);
					} else {
						lambotenginecore.log('Saved ' + key + ' successfully');
					}
				});
						
			var botObject=JSON.stringify(lambotenginecore.convertDiagramToBot(botFlow));
			lambotenginecore.log("SAVE BOT:" + botObject);

			blobService.createBlockBlobFromText(
				containerName,
				key + ".bot",
				botObject,
				function(error, result, response){
					if(error){
						lambotenginecore.error("04:Couldn't upload string");
						lambotenginecore.error(error);
					} else {
						lambotenginecore.log('Saved ' + key + '.bot successfully');
					}
				});

			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end("OK");
		});
		
	});
	//LOAD BOT (GRAPHICAL PART)
	//ARGUMENTS: KEY=bot name
    server.get('/api/bot', (req, res) => {
		var q=url.parse(req.url,true);
		var key=q.query["key"];

		//WRITE IT IN AZURE STORAGE
		var blobService = storage.createBlobService();
		var containerName = process.env.BOTFLOW_CONTAINER;
		var blobName=key;
		blobService.getBlobToText(
			containerName,
			blobName,
			function(err, blobContent, blob) {
				if (err) {
					console.error("Couldn't download blob %s", blobName);
					console.error(err);
				} else {
					res.writeHead(200, {'Content-Type': 'text/plain'});	
					res.end(blobContent);
				}
			});
    });
    server.get('/api/botcontrol', (req, res) => {
		var jsonString = '';

		var q=url.parse(req.url,true);
		var session=q.query["session"];

		lambotenginecore.log("BOTCONTROL:" + session);
		
		//READ IT FROM AZURE STORAGE
		var blobService = storage.createBlobService();
		var containerName = process.env.BOTFLOW_CONTAINER_CONTROL;
		var blobName=session;
		blobService.getBlobToText(
		containerName,
		blobName,
		function(err, blobContent, blob) {
			if (err) {
				lambotenginecore.error("Couldn't download blob " + blobName);
				lambotenginecore.error(err);
			} else {
				lambotenginecore.log("Sucessfully downloaded blob " + blobName);
				lambotenginecore.log(blobContent);

				res.writeHead(200, {'Content-Type': 'text/plain'});	
				res.end(blobContent);
				return;
			}
		});
	});

	//var savedAddress;
	server.get('/api/playStep', (req, res) => {
		// Lookup previously saved conversation reference
		//const reference = await findReference(req.body.refId);
		var q=url.parse(req.url,true);
		var m=q.query["key"];
		var bot=q.query["bot"];
		var session=q.query["session"];
		var conversationReference=JSON.parse(q.query["cr"]);
		//TODO:receive botName
		
		// Proactively notify the user
		console.log(bot);
		console.log(conversationReference)
		lambotenginecore.ReadBotFromAzure(storage,bot + ".bot",
			function(blobContent) {
				console.log("MYBOT:" + blobContent);
				myBot=JSON.parse(blobContent);
				var botPointer=lambotenginecore.getBotPointerIndexFromKey(myBot,m);

				adapter.continueConversation(conversationReference, async (context) => {
					//SET STATE
					const state = convoState.get(context);
					state.pointer=botPointer;
					state.pointerKey=m;
					var UserActivityResults=state.UserActivityResults;
					const dc = dialogs.createContext(context, state);

					await lambotenginecore.RenderConversationThread(storage, state, m, context, dc, myBot,io);
				});
		});

		res.send(200);

	});
    server.get('/api/getStep', (req, res) => {
		var q=url.parse(req.url,true);
		var convRef=q.query["cr"];

		var savedAddress=JSON.parse(convRef);
		if (savedAddress) {
			adapter.continueConversation(savedAddress, async (context) => {
				const state = convoState.get(context);
				var ob={ session:state.session, botPointer:state.pointerKey, botName:state.botName};
				res.writeHead(200, {'Content-Type': 'text/plain'});	
				res.end(JSON.stringify(ob));
				return;
			});
		}
	});

}
//#endregion

async function main(context){
    const state = convoState.get(context);
    var botPointer = state.pointer === undefined ? state.pointer=-1 : state.pointer;
    var session = state.session === undefined ? state.session=lambotenginecore.guid() : state.session;
    var botName = state.botName === undefined ? state.botName="bot1" : state.botName;
	// var myBot=[{"key":-1,"text":"Some very exciting questions","next":[{"to":-2,"text":""}]},{"key":-5,"text":"Do you prefer Blue or Red?","type":"CHOICE","next":[{"to":-7,"text":"Blue"},{"to":-8,"text":"Red"}]},{"key":-7,"text":"Red is also a nice color","type":"MESSAGE","next":[]},{"key":-8,"text":"Blue is also a nice color","type":"MESSAGE","next":[]},{"key":-2,"text":"What is your name?","type":"INPUT","next":[{"to":-5,"text":""}]}];

	var myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName + ".bot");
	if (botPointer==-1)
	{
		botPointer=lambotenginecore.getBotPointerOfStart(myBot);
		state.pointer=botPointer;
		state.pointerKey=myBot[botPointer].key;
	}

	//savedAddress=TurnContext.getConversationReference(context.activity);
	var savedAddress={
		activityId: context.activity.id,
		user: lambotenginecore.shallowCopy(context.activity.from),
		bot: lambotenginecore.shallowCopy(context.activity.recipient),
		conversation: lambotenginecore.shallowCopy(context.activity.conversation),
		channelId: context.activity.channelId,
		serviceUrl: context.activity.serviceUrl
	};
	//WORKING ON REMOVING THIS FROM AZURE STORAGE AND USING ONLY THE SESSION
	lambotenginecore.WriteBotControl(storage, session,savedAddress);

	if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded[0].name !== 'Bot') {
		 await context.sendActivity(`## Welcome to the Designer Bot!\n\nCurrent bot: ` + botName.replace(".bot","") + "\n\n"  + 
		 	"\n\nPress the Start Sync button and enter the Session GUID\n\n" + session + "\n\n in the prompt.\n\nUse #BOT <name> to change, #DATA to display collected data");
	} else
    if (context.activity.type === 'message') {
		//PROCESS SPECIAL RESPONSE
		if (context.activity.text.toUpperCase().startsWith("#BOT "))
		{
			botName=context.activity.text.substring(5);
			state.botName=botName;
			myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName+".bot");
			botPointer=lambotenginecore.getBotPointerOfStart(myBot);
			state.pointer=botPointer;
			state.pointerKey=myBot[botPointer].key;
			io.in(state.session).emit('loadBot',botName);

			await context.sendActivity("Bot changed to " + botName)

			return;
		}
		if (context.activity.text.toUpperCase().startsWith("#SESSION "))
		{
			session=context.activity.text.substring(9);
			await context.sendActivity("Session changed to " + session)
			return;
		}
		if (context.activity.text.toUpperCase().startsWith("#DATA"))
		{
			await context.sendActivity("Data collected: " + JSON.stringify(state.UserActivityResults));
			return;
		}
		if (context.activity.text.toUpperCase()=="#DEBUG")
		{
			await context.sendActivity("Bot:" + botName + "\n\nSession:" + session + "\n\nData collected: " + JSON.stringify(state.UserActivityResults));
			return;
		}

		await lambotenginecore.PreProcessing(state,myBot,botPointer,context.activity.text,io)


		const dc = dialogs.createContext(context, state);
		if(!context.responded){
			// Continue executing the "current" dialog, if any.
			await dc.continue();
		}
		
		if(!context.responded){
			await lambotenginecore.RenderConversationThread(storage, state, session, context, dc, myBot,io)
		}
		else
		{
			console.log("RESPONDED");
		}
				

    }

}

