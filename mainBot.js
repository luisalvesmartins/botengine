const lambotenginecore=require('./lambotenginecore');
const storage = require('azure-storage');
const entGen = storage.TableUtilities.entityGenerator;
const { stateObject } = require('./stateObject');

class mainBot {
	constructor(conversationState){
		this.state=new stateObject(conversationState);
        
        //FOR CONVERSATION LOGGING
        this.tableSvc = storage.createTableService();
        this.tableSvc.createTableIfNotExists(process.env.LOGTABLE || 'botlog', function(error, result, response) {
            if (error) {
                console.log("Error creating Table " + process.env.LOGTABLE || 'botlog');
            }  
        });

    }

	async onTurn(context){
		this.state.context=context;
		var botName = await this.state.getBotName();
		if (!botName){
			botName=process.env.BOTNAME || "bot1";
			await this.state.setBotName(botName);
			await this.state.setBotPointer(-1);
			await this.state.setUserActivityResults({});
			await this.state.saveChanges();
		}

		var session = await this.state.getSession();
		var userActivityResults=await this.state.getUserActivityResults();


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
			await context.sendActivity({ type: 'typing' });
			var myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName + ".bot");

			var botPointer= await this.state.getBotPointer();
			if (botPointer==-1){
				botPointer=-1;
				botPointer=lambotenginecore.getBotPointerOfStart(myBot);
				await this.state.setBotPointer(botPointer,myBot[botPointer].key);
			}


			//PROCESS SPECIAL RESPONSE
			if (context.activity.text.toUpperCase().startsWith("#BOT "))
			{
				botName=context.activity.text.substring(5);
                await this.state.setBotName(botName);
				myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName + ".bot");
				botPointer=lambotenginecore.getBotPointerOfStart(myBot);
                await this.state.setBotPointer(botPointer,myBot[botPointer].key);

				await context.sendActivity("Bot changed to " + botName)

				await context.sendActivity({type:"event",name:"activity_update",value:{key:myBot[botPointer].key,botName:botName}});

				return;
			}
			if (context.activity.text.toUpperCase().startsWith("#SESSION "))
			{
				session=context.activity.text.substring(9);
				await this.state.setSession(session);
				await context.sendActivity("Session changed to " + session)
				return;
			}
			if (context.activity.text.toUpperCase().startsWith("#DATA"))
			{
				await context.sendActivity("Data collected: " + JSON.stringify(userActivityResults));
				return;
			}
			if (context.activity.text.toUpperCase()=="#DEBUG")
			{
				await context.sendActivity("Bot:" + botName + "\n\nSession:" + session + "\n\nData collected: " + JSON.stringify(userActivityResults));
				return;
			}

			//ADD LOG 
			var task = {
				PartitionKey: entGen.String(context.activity.channelId),
				RowKey: entGen.String(context.activity.id + "|" + context.activity.conversation.id),
				description: entGen.String(context.activity.text),
				botPointer: entGen.Int32(botPointer),
				botName: entGen.String(botName)
            };
			this.tableSvc.insertEntity(process.env.LOGTABLE || 'botlog',task, function (error, result, response) {
				if(error){
				// Entity inserted
				console.log("No save")
				console.log(task);
				}
			});
            
			await lambotenginecore.PreProcessing(this.state,myBot,botPointer,context.activity.text)

            await lambotenginecore.RenderConversationThread(context, myBot,this.state)

			await this.state.saveChanges();
		}
		else
		if (context.activity.type === 'event') {
			if (context.activity.name=="playFromStep")
			{
				console.log("VALUE")
				console.log(context.activity.value)
				botName=context.activity.value.botName;
				await this.state.setBotName(botName);

				var myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName + ".bot");
				var botPointer=lambotenginecore.getBotPointerIndexFromKey(myBot, context.activity.value.key);

				await this.state.setBotPointer(botPointer,context.activity.value.key);
				await this.state.saveChanges();
				await lambotenginecore.RenderConversationThread(context, myBot, this.state);
			}
		}
	}
}

exports.mainBot=mainBot;