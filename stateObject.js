class stateObject{
	constructor(conversationState){
		this.conversationState=conversationState;
		this.botPointer=conversationState.createProperty("botpointer");
		this.session=conversationState.createProperty("session");
		this.botName=conversationState.createProperty("botName");
        this.botPointerKey=conversationState.createProperty("botpointerkey");
		this.userActivityResults=conversationState.createProperty("useractivityresults");
        this.context=null;
	}
    async setBotPointer(botPointer,botPointerKey)    
    {
        await this.botPointer.set(this.context,botPointer);
		await this.botPointerKey.set(this.context,botPointerKey);
    }
    async getBotPointer()
    {
        return await this.botPointer.get(this.context);
	}
	async getBotPointerKey()
    {
        return await this.botPointerKey.get(this.context);
    }
    async setUserActivityResults(userActivityResults)
    {
        await this.userActivityResults.set(this.context,userActivityResults);
    }
    async getUserActivityResults()
    {
		var userActivityResults=await this.userActivityResults.get(this.context);
        if (!userActivityResults){
            userActivityResults={};
            await this.setUserActivityResults(userActivityResults);
        }
        return userActivityResults;
    }
    async getSession()
    {
        var session=await this.session.get(this.context);
		if (!session){
			session=this.guid();
            await this.setSession(session);
        }
        return session;
    }
    async setSession(session)
    {
        await this.session.set(this.context,session);
    }
    async getBotName()
    {
        return await this.botName.get(this.context);
	}
    async setBotName(botName)
    {
        await this.botName.set(this.context,botName);
    }

    async saveChanges(){
        await this.conversationState.saveChanges(this.context);
    }
    guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }

}
exports.stateObject=stateObject;