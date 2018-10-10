const lambotenginecore=require('../lambotenginecore');
const storage = require('azure-storage');
const entGen = storage.TableUtilities.entityGenerator;
const { stateObject } = require('../stateObject');

class botrunner {
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
            console.log("INIT")
			botName=process.env.BOTNAME || "bot1";
			await this.state.setBotName(botName);
			await this.state.setBotPointer(-1);
			await this.state.setUserActivityResults({});
			await this.state.saveChanges();
		}

        var myBot = await lambotenginecore.AsyncPromiseReadBotFromAzure(storage,botName + ".bot");

		var botPointer= await this.state.getBotPointer();
		if (botPointer==-1){
            botPointer=-1;
			botPointer=lambotenginecore.getBotPointerOfStart(myBot);
			await this.state.setBotPointer(botPointer,myBot[botPointer].key);
		}

    
        if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded[0].name !== 'Bot') {
             await context.sendActivity("## Welcome to the Bot!","Welcome to the bot");
             //lambotenginecore.RenderConversationThread(storage, state, session, context, dc, myBot);
        } else
        if (context.activity.type === 'message') {
            console.log(1);
            if (botPointer==-1)
            {
                initPointer=true;
                botPointer=await lambotenginecore.MoveBotPointer(myBot,botPointer,context.activity.text,this.state.getUserActivityResults(),null,state);

            }
            console.log(2);
    
            //PROCESS SPECIAL RESPONSE
            if (context.activity.text.toUpperCase().startsWith("DEBUG"))
            {
                await context.sendActivity("Data collected: " + JSON.stringify(this.state.getUserActivityResults()));
                await context.sendActivity("Data collected: " + botName);
                await context.sendActivity("Data collected: " + botPointer);
                await context.sendActivity("Data collected: " + JSON.stringify(this.state.getBotName()));
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
            console.log(3);

            await lambotenginecore.PreProcessing(this.state,myBot,botPointer,context.activity.text)
            console.log(4);

            //if(initPointer){
                await lambotenginecore.RenderConversationThread(context, myBot,null,this.state)
            //}
            console.log(5);
            
    
        }
        await this.state.saveChanges();
    }
}
exports.botrunner=botrunner;