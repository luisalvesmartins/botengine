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

		var userActivityResults=await this.state.getUserActivityResults();
      
		if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded[0].id !== 'botid') {
			await context.sendActivity(`## Welcome to the Designer Bot!\n\nCurrent bot: ` + botName.replace(".bot","") + "\n\n"  + 
				"Use #BOT <name> to change, #DATA to display collected data");
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
				await this.state.saveChanges();

				await context.sendActivity("Bot changed to " + botName)

				await context.sendActivity({type:"event",name:"activity_update",value:{key:myBot[botPointer].key,botName:botName}});

				return;
			}
			if (context.activity.text.toUpperCase().startsWith("#DATA"))
			{
				await context.sendActivity("Data collected: " + JSON.stringify(userActivityResults));
				await context.sendActivity({type:"event",name:"data_show",value:userActivityResults});
			
				return;
			}
			if (context.activity.text.toUpperCase()=="#DEBUG")
			{
				await context.sendActivity("Bot:" + botName + "\n\nData collected: " + JSON.stringify(userActivityResults));
				return;
			}

			//ADD LOG 
			var task = {
				PartitionKey: entGen.String(context.activity.channelId),
				RowKey: entGen.String(context.activity.conversation.id+ "|" + context.activity.id),
				text: entGen.String(context.activity.text),
				botPointer: entGen.Int32(botPointer),
				botPointerKey: entGen.Int32(myBot[botPointer].key),
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