const { QnAMaker } = require('botbuilder-ai');

module.exports={

    convertDiagramToBot: function(diagram)
    {
        var goObj=JSON.parse(diagram);
        var botObject=[];
        for(var f=0;f<goObj.nodeDataArray.length;f++)
        {
            var gO=goObj.nodeDataArray[f];
    
            var toLink=[];
            for(var g=0;g<goObj.linkDataArray.length;g++)
            {
                var gL=goObj.linkDataArray[g];
                if (gL.from==gO.key){
                    toLink.push({to:gL.to, text:(gL.text== undefined) ? "" : gL.text});
                }
            }
            botObject.push({ key: gO.key, text: gO.text, type: gO.type, next:toLink, 
                    parVar:gO.parVar, parURL:gO.parURL, parKey:gO.parKey, parTyp:gO.parTyp, parLMI:gO.parLMI,
                    parCon:gO.parCon, parPar:gO.parPar, parCar:gO.parCar, parAPI:gO.parAPI, parAPO:gO.parAPO
                })
        }
        return botObject;
    },
    
    getBotPointerIndexFromKey:function(myBot,key)
    {
        for(var f=0;f<myBot.length;f++)
        {
            if (myBot[f].key.toString()==key)
            {
                return f;
            }
        }			
        return 0;
    },
    
    getNextOptionFromText:function(myBotThread, text)
    {
        for(var g=0;g<myBotThread.next.length;g++){
            if (myBotThread.next[g].text.toUpperCase()==text.toUpperCase()){
                return myBotThread.next[g].to;
            }
        }
        return -1;
    },

    getBotPointerOfStart:function(myBot)
    {
        for(var f=0;f<myBot.length;f++)
        {
            if (myBot[f].type=="START")
            {
                return f;
            }
        }			
        return 0;
    },
    
    getSuggestedActions: function (title,items) {
        const { MessageFactory,ActionTypes } = require('botbuilder');
        var suggestedActions = [];
        for(var f=0;f<items.length;f++)
        {
            suggestedActions.push({
                type: ActionTypes.ImBack,
                title: items[f].text,
                value: items[f].text
            });
        }
        return MessageFactory.suggestedActions(suggestedActions, title);
    },
    
    MoveBotPointer:async function(myBot,botPointer,lastMessage,UserActivityResults,io,state)
    {
        //MOVENEXT
        //IF THIS IS LUIS, need to process it first
        if (myBot[botPointer].type=="IF")
        {
            var ifCond=myBot[botPointer].parCon;
            this.log("IF ORIGINAL:" + ifCond);
            ifCond=this.replaceVars(ifCond,UserActivityResults);
            this.log("IF:" + ifCond);
            const nodeeval=require('node-eval');
            var result=nodeeval(ifCond);
            this.log("RESULT:" + result);
            var op=this.getNextOptionFromText(myBot[botPointer],result.toString());
            botPointer=this.getBotPointerIndexFromKey(myBot,op);
            this.log("new botPointer:" + botPointer)
        }
        else
        if (myBot[botPointer].type=="LUIS")
        {
            var URL=myBot[botPointer].parURL + myBot[botPointer].parKey + "&verbose=false&timezoneOffset=0&q=" + lastMessage;
            //this.log("LUIS:" + URL)
            var request = require('request-promise');
            var body=await request(URL);
            //this.log(body);
            var LUISResult=JSON.parse(body);
            if (LUISResult.topScoringIntent){

            var intent=LUISResult.topScoringIntent.intent;
    
            var parLMI= myBot[botPointer].parLMI;
            this.log("INTENT:" + intent + "LMI:" + parLMI); 
            this.log(JSON.stringify(LUISResult)); //STORE var_entities with LUISResult.entities
            if (myBot[botPointer].parVar)
            {
                UserActivityResults[myBot[botPointer].parVar + ".entities"]=JSON.stringify(LUISResult.entities);
                await state.setUserActivityResults(UserActivityResults);
            }
            if (parLMI)
                if (LUISResult.topScoringIntent.score<Number(parLMI)){
                    var intent="None";
                }
            }
            else
                intent="None";
            var option=this.getNextOptionFromText(myBot[botPointer],intent);
            if (option==-1)
            {
                this.error("01:no possible option, there should be a None intent!");
            }
            else
                botPointer=this.getBotPointerIndexFromKey(myBot,option);
        }
        else
        {
            // NO CONTINUATION
            if (myBot[botPointer].next.length==0)
                botPointer=this.getBotPointerOfStart(myBot);
            else
                //ONLY ONE OPTION, MOVE NEXT, find the item
                if (myBot[botPointer].next.length==1)
                {
                    botPointer=this.getBotPointerIndexFromKey(myBot,myBot[botPointer].next[0].to)
                }
                else
                {
                    this.log("SEVERAL OPTIONS TO CHOOSE:" + lastMessage)
                    var option=this.getNextOptionFromText(myBot[botPointer],lastMessage);
                    if (option==-1)
                    {
                        this.error("02:no possible option!");
                    }
                    else
                        botPointer=this.getBotPointerIndexFromKey(myBot,option);
        
                }
            
        }
        await state.setBotPointer(botPointer,myBot[botPointer].key);
    
        //SEND THE MESSAGE TO THE HTML CLIENT TO UPDATE THE POSITION
        if (io)
            io.in(await state.getSession()).emit('updateDesigner',myBot[botPointer].key);

        return botPointer;
    },
    
    AsyncPromiseReadBotFromAzure:async function(storage,botName){
        this.log("ReadBot:" + botName );
        return JSON.parse(await this.PromiseReadBotFromAzure(storage,botName));
    },
    
    PromiseReadBotFromAzure:function(storage,botName){
        return new Promise((resolve,reject) => {
        this.ReadBotFromAzure(storage,botName,
            function(blobContent) {
                resolve(blobContent);
        });
    });
    },
    
    ReadBotFromAzure:function(AzureStorage, blobName,callback)
    {
        //READ IT FROM AZURE STORAGE
        var blobService = AzureStorage.createBlobService();
        var containerName = process.env.BOTFLOW_CONTAINER;
    
        blobService.getBlobToText(
            containerName,
            blobName,
            function(err, blobContent, blob) {
                if (err) {
                    console.log("07:Couldn't download blob " + blobName);
                    this.error(err);
                    callback("");
                } else {
                    callback(blobContent);
                }
            });
    },
    
    shallowCopy:function(value){
        if (Array.isArray(value)) { return value.slice(0); }
        if (typeof value === 'object') { return {...value}; }
        return value;
    },
   
    log:function(message){
        console.log("  log:" + message);
    },
    error:function(message){
        console.log(" ERROR:" + message);
    },
    
    RenderConversationThread: async function (context, myBot,io ,state)
    {
        var UserActivityResults=await state.getUserActivityResults();
        var botPointer = await state.getBotPointer();
        var currentThread=myBot[botPointer];
        var messageToDisplay=currentThread.text;
        messageToDisplay=this.replaceVars(messageToDisplay,UserActivityResults);
        this.log("THREAD:" + currentThread.type);
        var messageToSpeak=messageToDisplay;
        switch (currentThread.type) {
            case "CHOICE":
                await context.sendActivity(this.getSuggestedActions(messageToDisplay,currentThread.next));
                break;
            case "IF":
                botPointer=await this.MoveBotPointer(myBot,botPointer,context.activity.text,UserActivityResults,io,state);
    
                await this.RenderConversationThread(context, myBot,io,state);
                break;
            case "INPUT":
                await context.sendActivity(messageToDisplay, messageToSpeak, 'expectingInput');
                break;
            case "LUIS":
                await context.sendActivity(messageToDisplay, messageToSpeak, 'expectingInput');
                break;
            case "API":
                var parCleaned=this.replaceVars(currentThread.parPar,UserActivityResults);
                var result="";
                switch (currentThread.parAPO) {
                    case "MessageContent":
                        //DISPLAY THE MESSAGE
                        messageToDisplay=this.executeFunctionByName(currentThread.parAPI,global,parCleaned);
                        await context.sendActivity(messageToDisplay, messageToDisplay, 'expectingInput');
                        break;
                    case "Variable":
                        //STORE IT INTO THE VARS
                        result=this.executeFunctionByName(currentThread.parAPI,global,parCleaned);
                        break;
                    default:
                        //JUST EXECUTE IT
                        this.executeFunctionByName(currentThread.parAPI,global,parCleaned);
                        break;
                }
                botPointer=await this.MoveBotPointer(myBot,botPointer,result,UserActivityResults,io,state);
                break;
            case "MESSAGE":
                await context.sendActivity(messageToDisplay, messageToSpeak, 'expectingInput');
                botPointer=await this.MoveBotPointer(myBot,botPointer,context.activity.text,UserActivityResults,io,state);
        
                await this.RenderConversationThread(context, myBot,io,state);
                break;
            case "QNA":
                const qnaMaker = new QnAMaker(
                    {
                        knowledgeBaseId: currentThread.parPar,
                        endpointKey: currentThread.parKey,
                        host: currentThread.parURL
                    },
                    {
                        answerBeforeNext: true
                    }
                );
                let answered = await qnaMaker.answer(context);
                if (!answered) {
                    if (context.activity.type === 'message' && !context.responded) {
                        await context.sendActivity('No QnA Maker answers were found."');
                    } else if (context.activity.type !== 'message') {
                        await context.sendActivity(`[${context.activity.type} event detected]`);
                    }
                }

                botPointer=await this.MoveBotPointer(myBot,botPointer,context.activity.text,UserActivityResults,io,state);
        
                await this.RenderConversationThread(context, myBot,io,state);
                break;
            case "START":
                await context.sendActivity(messageToDisplay, messageToSpeak, 'expectingInput');
    
                botPointer=await this.MoveBotPointer(myBot,botPointer,context.activity.text,UserActivityResults,io,state);
        
                await this.RenderConversationThread(context, myBot,io,state);
                break;
        
            default:
                await context.sendActivity(messageToDisplay, messageToSpeak, 'expectingInput');
                botPointer=await this.MoveBotPointer(myBot,botPointer,context.activity.text,UserActivityResults,io,state);
                break;
        }
    },

    replaceVars:function(messageToDisplay, UserActivityResults){
        //REPLACE { } VARIABLES WITH USER ENTRIES
        for(var key in UserActivityResults){
            messageToDisplay=messageToDisplay.replace("{" + key + "}",UserActivityResults[key]);
        }
        return messageToDisplay;
    },

    executeFunctionByName:function(functionName, context /*, args */) {
        var args = Array.prototype.slice.call(arguments, 2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        for(var i = 0; i < namespaces.length; i++) {
          context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
      },

    WriteBotControl:function(storage,session, savedAddress){
        var b=JSON.stringify(savedAddress);
        //WRITE IT IN AZURE STORAGE
        var blobService = storage.createBlobService();
        var containerName = process.env.BOTFLOW_CONTAINER_CONTROL;
        try {
            blobService.createBlockBlobFromText(
                containerName,
                session,
                b,
                function(error, result, response){
                    if(error){
                        this.error("06:Couldn't upload string");
                        this.error(error);
                    }
                });
                
        } catch (error) {
            this.error("06.A:Couldn't save WriteBotControl");
        }
    },
    
    PreProcessing:async function(state,myBot,botPointer,messageText,io){
        var userActivityResults=await state.getUserActivityResults();
    
        //STORE THE ACTUAL RESULT IN THE VARIABLE
        if (myBot[botPointer].parVar)
        {
            userActivityResults[myBot[botPointer].parVar]=messageText;
            this.log("Results:" + JSON.stringify(userActivityResults));
            await state.setUserActivityResults(userActivityResults);
        }
    
        //MOVE IT TO THE NEXT
        await this.MoveBotPointer(myBot,botPointer,messageText,userActivityResults,io,state);
    }
    
    };