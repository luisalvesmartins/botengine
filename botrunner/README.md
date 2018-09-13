# botrunner

Execution engine for the Botengine project.

This should work with Cortana just by configuring the channel. 

Alexa integration is included.

## Cortana configuration

Follow the Cortana channel configuration on the Azure Portal. More can be checked here: https://docs.microsoft.com/en-us/cortana/skills/get-started

## Alexa integration

Thanks to https://github.com/CatalystCode/alexa-bridge

The endpoint will be http://app.azurewebsites.net/messages

The Interaction Model JSON will be:
~~~~
{
    "interactionModel": {
        "languageModel": {
            "invocationName": "jamie",
            "intents": [
                {
                    "name": "AMAZON.CancelIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.HelpIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.StopIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.NavigateHomeIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.FallbackIntent",
                    "samples": []
                },
                {
                    "name": "GetUserIntent",
                    "slots": [
                        {
                            "name": "phrase",
                            "type": "phrase"
                        }
                    ],
                    "samples": [
                        "{phrase}"
                    ]
                }
            ],
            "types": [
                {
                    "name": "phrase",
                    "values": [
                        {
                            "name": {
                                "value": "GetUserIntent {phrase}"
                            }
                        }
                    ]
                }
            ]
        }
    }
}
~~~~

### APPLICATION SETTINGS

~~~~
AZURE_STORAGE_CONNECTION_STRING=...
BOTFLOW_CONTAINER=botflows
MICROSOFT_APP_ID=...
MICROSOFT_APP_PASSWORD=...
directLineSecret=...
botId=...
leaveSessionOpen=false
useHeroCardAttachmentAsAlexaCard=false
multipleResponsesTimeout=8000
~~~~