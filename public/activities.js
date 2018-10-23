//#region SYNC AND PLAY THE STEP THAT IS SELECTED
var lastSel=0;
var autoRefresh=false;
var conversationReference=undefined;
function onLoadBotEvent(data){
  document.all("txtBotName").value=data;
  load();
}

function onDrawingEvent(data){
  myDiagram.select(myDiagram.findPartForKey(Number(data)));
}


function PlayStep(){
  if (myDiagram.selection.count>0){
    //SAVE THE DIAGRAM
    save(false);

    botConnection
    .postActivity({
      from: { id: 'me' },
      name: 'playFromStep',
      type: 'event',
      value: {botName: document.all("txtBotName").value, key:myDiagram.selection.first().key}
    })
    .subscribe(function (id) {
      console.log('"playFromStep" sent');
    });
  }
}
//#endregion

//#region SAVE & LOAD
  // Show the diagram's model in JSON format that the user may edit
  function save(showConfirmation) {
    removeDataNodes();
    saveDiagramProperties();  // do this first, before writing to JSON
    document.getElementById("mySavedModel").value = myDiagram.model.toJson();
    myDiagram.isModified = false;
    $.post("/api/bot", { key: document.all("txtBotName").value, botflow: document.getElementById("mySavedModel").value } )
    .done(alert("SAVED"))
    .fail(function(error) {
      console.log(error)
      alert( "error doing the sync" );
    });

  }
  function newBot() {
    myDiagram.model=go.Model.fromJson("{}")
  }
  function load() {
    $.get( "/api/bot?key=" + document.all("txtBotName").value, function( data ) {
      document.getElementById("mySavedModel").value=data;

      myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
      loadDiagramProperties();  // do this after the Model.modelData has been brought into memory
    })
    .fail(function(error) {
      console.log(error)
      alert( "error loading data" );
    });
  }
  function saveDiagramProperties() {
    myDiagram.model.modelData.position = go.Point.stringify(myDiagram.position);
  }
  function loadDiagramProperties(e) {
    // set Diagram.initialPosition, not Diagram.position, to handle initialization side-effects
    var pos = myDiagram.model.modelData.position;
    if (pos) myDiagram.initialPosition = go.Point.parse(pos);
  }
//#endregion


//#region SHOW DATA
function showDataNodes(data){
  removeDataNodes();
  myDiagram.startTransaction("make new node");
  var total=myDiagram.model.nodeDataArray.length;
  for (let index = 0; index < total; index++) {
    const element = myDiagram.model.nodeDataArray[index];
    if (element.parVar!="")
    {
      var text=data[element.parVar];
      if (text!="" && text){
        var b=go.Point.parse(element.loc).offset(20,20);
        if ("#MESSAGE#START#".indexOf("#" + element.type + "#")<0)
          myDiagram.model.addNodeData(    
            {"text":text, 
            "fill":"#FFFFE0", "loc":go.Point.stringify(b), "angle":0, "size":"100 50", 
            "opacity":0.7,
            "type":"DATASHOW"}
          );
      }

    }
  }
  myDiagram.commitTransaction("make new node");
}
function removeDataNodes(){
  //REMOVE DATA NODES
  var total=myDiagram.model.nodeDataArray.length;
  for (let index = myDiagram.model.nodeDataArray.length-1; index >=0 ; index--) {
    const element = myDiagram.model.nodeDataArray[index];
    if (element.type=="DATASHOW")
      myDiagram.model.removeNodeData(myDiagram.model.nodeDataArray[index]);
  }
}
//endregion

//#region PARAMETERS
  function parSave(){
    var node = myDiagram.selection.first();
    if (node){
      var data = node.data;
      for(var f=0;f<ParameterList.length;f++){
        var name=ParameterList[f].name;
        if (document.all(name))
        {
            console.log(name + "->" + document.all(name).type)
            data[name]=document.all(name).value;
        }
          
      }
    }
  }
  function parLoad(data){
    for(var f=0;f<ParameterList.length;f++){
        var name=ParameterList[f].name;
        if (data[name]){
          if (document.all(name))
            document.all(name).value=data[name];
        }
      }
  }

var ParameterList=[
    {name:"parVar", default:""},
    {name:"parURL", default:"https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/"},
    {name:"parKey", default:"guid?subscription-key=code"},
    {name:"parTyp", default:""},
    {name:"parLMI", default:"0.5"},
    {name:"parPar", default:""},
    {name:"parCon", default:""},
    {name:"parCar", default:""},
    {name:"parAPI", default:""},
    {name:"parAPO", default:""}
  ];

  function GetFieldList(dataType){
    var Fields=[];
    switch (dataType) {
      case "API":
        Fields=[{name:"parVar"},{name:"parAPI"},{name:"parPar"},{name:"parAPO"}]
        break;
      case "CARD":
        Fields=[{name:"parVar"},{name:"parCar"}]
        break;
      case "CHOICE":
        Fields=[{name:"parVar"}]
        break;
      case "IF":
        Fields=[{name:"parCon"}]
        break;
      case "INPUT":
        Fields=[{name:"parVar"},{name:"parTyp"}]
        break;
      case "LUIS":
        Fields=[{name:"parVar"},
          {name:"parURL", default:"https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/"},
          {name:"parKey",default:"guid?subscription-key=code"},
          {name:"parLMI", default:"0.5"}]
        break;
      case "MESSAGE":
        break;
      case "QNA":
        Fields=[{name:"parVar"},
          {name:"parURL", default:"https://yourdeployment.azurewebsites.net/qnamaker"},
          {name:"parKey", title:"EndpointKey",default:"guid"},
          {name:"parPar", title:"Knowledgebase",default:"guid"},
        ]
        break;
      case "START":
        break;
    default:
      break;
    }
    return Fields;
  }
  function DisplayProperties(data){
      //BUILD FIELDS ACCORDING TO TYPE
      var Fields=GetFieldList(data.type);
      var sHTML="<div>KEY</div>" + data.key + "<div>TEXT</div>" + data.text + "<div>TYPE</div>" + data.type;
      for(var f=0;f<Fields.length;f++){
        var field=Fields[f];
        sHTML+="<div id=t_" + field.name + ">";
        switch (field.name) {
          case "parVar":
            sHTML+="VARIABLE</div><INPUT type=text id=parVar onkeyup='parSave()' style='width:180px'>"
            break;
          case "parTyp":
            sHTML+="TYPE OF INPUT</div><INPUT type=text id=parTyp onkeyup='parSave()' style='width:180px'>"
            break;
          case "parURL":
            sHTML+="URL</div><TEXTAREA id=parURL onkeyup='parSave()' rows=6 cols=21 style='width:180px'></TEXTAREA>"
            break;
          case "parKey":
            sHTML+="Key</div><INPUT type=text id=parKey onkeyup='parSave()' style='width:180px'>"
            break;
          case "parLMI":
            sHTML+="Minimum Score</div><INPUT type=text id=parLMI onkeyup='parSave()' style='width:90px'>"
            break;
          case "parPar":
            sHTML+="Parameters</div><TEXTAREA id=parPar onkeyup='parSave()' rows=6 cols=21 style='width:180px'></TEXTAREA>"
            break;
          case "parCon":
            sHTML+="Condition</div><TEXTAREA id=parCon onkeyup='parSave()' rows=6 cols=21 style='width:180px'></TEXTAREA>"
            break;
          case "parCar":
            sHTML+="Card</div><SELECT id=parCar onkeyup='parSave()' onchange='parSave()'>" +
            "<option>adaptiveCard</option>" + 
            "<option>animationCard</option>" + 
            "<option>audioCard</option>" + 
            "<option>heroCard</option>" + 
            "<option>receiptCard</option>" + 
            "<option>oauthCard</option>" + 
            "<option>signinCard</option>" + 
            "<option>thumbnailCard</option>" + 
            "<option>videoCard</option>" + 
            "</select>";
            break;
          case "parAPI":
            sHTML+="API or URL</div><INPUT type=text id=parAPI onkeyup='parSave()' style='width:180px'>"
            break;
          case "parAPO":
            sHTML+="API Output</div><SELECT id=parAPO onkeyup='parSave()' onchange='parSave()'>" +
            "<option>None</option>" + 
            "<option>Variable</option>" + 
            "<option>MessageContent</option>" + 
            "</select>";
            break;
          default:
            break;
        }
      }
      document.all("propList").innerHTML=sHTML;
      for(var f=0;f<Fields.length;f++){
        var field=Fields[f];
        if (field.default)
        {
          document.all(field.name).value=field.default;
        }
        if (field.title)
        {
          document.all("t_" + field.name).innerHTML=field.title;
        }
      }
      
      parLoad(data);
  }
//#endregion