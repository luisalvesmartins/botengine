# botengine

Design and debug visually your bot conversations. Using Azure, Node, Bot Framework v4 (GA), GoJS and SocketIO to keep the designer in sync with the backend.

The conversation is synchronized with the visual designer.
When a bot is loaded in the conversation, it is loaded in the designer. 
When the activity changes in the bot, it reflects in the designer.

You can jump to any activity and play the conversation from there.

----

## FEATURES

One image and one video are worth a million bytes:
![Features](/features.png "Features")

![Features](/featuresdemo.gif "Features Video")

### USE LUIS, QNAMAKER, APICALL OR YOUR OWN ACTIVITY BLOCKS

Extensible, you can add visuals and properties for each

### STORE CONVERSATIONS RESULTS IN STATE
Each activity result can be stored in a variable and used later with the syntax {varname}. 

Example:

>Text activity: "What's your name?" (stored in var NAME)
>
>Text activity: "Hi {NAME}, welcome to the bot"

----
## RUN IN YOUR MACHINE

Configuration: 

### APPLICATION SETTINGS

~~~~
CONSOLE=NO|YES - for development
AZURE_STORAGE_CONNECTION_STRING=...
BOTFLOW_CONTAINER=<name>
BOTFLOW_CONTAINER_CONTROL=<name>
MICROSOFT_APP_ID=<GUID>
MICROSOFT_APP_PASSWORD=<PASS>

Bot.html should have the directline key changed.
~~~~

### SAMPLE INIT FILES

In the folder SampleBot you'll find two files: bot1 and bot1.bot

This two files should be uploaded to the Azure Storage BOTFLOW_CONTAINER defined above.

### SITE

The site will be available on http://localhost:port/site/bot.html

### RUNTIME

The code necessary to run a bot without the designer is in the botrunner folder. It includes an Alexa interface.

## IN DEVELOPMENT

- More rich activities like external REST call activity

- Complex Cards (adaptive,etc)

Please send me your requests...