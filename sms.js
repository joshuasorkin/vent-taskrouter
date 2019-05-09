require('env2')('.env');

class Sms{


    constructor(worker){
        this.worker=worker;
        this.commandList=this.createCommandList();
        var commandListKeys=Object.keys(this.commandList);
        this.commandListKeysString=commandListKeys.join(" ");
    }

    createParameterObj(body,from,workerEntity){
        var parameterObj={
            body:body,
            from:from,
            workerEntity:workerEntity
        }
        return parameterObj;
    }

    createCommandList(){
        var commandList=[];
        this.addCommand(commandList,"on","Enables the user to receive calls.","on",1,false,this.on.bind(this));
        this.addCommand(commandList,"off","Disables the user from receiving calls.","off",1,false,this.off.bind(this));
        this.addCommand(commandList,"default","Disables the user from receiving calls.","any unrecognized command",1,false,this.off.bind(this));
        this.addCommand(commandList,"add","Adds a new user.","add [password] [contact_uri] [username]",4,true,this.add.bind(this));
        this.addCommand(commandList,"changename","Changes a user's name.","changename [new name (no spaces)]",2,false,this.changeName.bind(this));
        this.addCommand(commandList,"changenumber","Changes a user's phone number.","changenumber [password] [old number] [new number]",4,true,this.changeNumber.bind(this));
        this.addCommand(commandList,"manual","Gets help manual for a command, or lists all commands if used by itself.","manual [command name]",2,false,this.manual.bind(this));
        this.addCommand(commandList,"status","Gets status for user and system.","status",1,false,this.status.bind(this));
        return commandList;
    }

    addCommand(commandList,commandName,helpMessage,parameterUsage,parameterCount,isAdmin,commandFunction){
        var command={
            commandName:commandName,
            helpMessage:helpMessage,
            parameterUsage:parameterUsage,
            parameterCount:parameterCount,
            isAdmin:isAdmin,
            commandFunction:commandFunction
        }
        commandList[commandName]=command;
    }

    async on(parameterObj){
        console.log("on: parameterObj.from: "+parameterObj.from);
        var responseValue;
        console.log("on request made");
        //todo: this try-catch is duplicate of the default,
        //both need to be refactored into single function
        try{
            if(parameterObj.commandArray.length>1){
                responseValue="Too many parameters for 'on'";
            }
            else{
                var workerEntity=await this.worker.updateWorkerActivity(parameterObj.from,process.env.TWILIO_IDLE_SID,false);
                responseValue=workerEntity.friendlyName+", you are now active, receiving calls.";
            }
            console.log("SMS.on(): responseValue: "+responseValue);
        }
        catch(err){
            console.log("SMS.on() error: "+err);
            responseValue=err;
        }
        return responseValue;
    }

    async off(parameterObj){
        var responseValue;
        try{
            var workerEntity=await this.worker.updateWorkerActivity(parameterObj.from,process.env.TWILIO_OFFLINE_SID,false);
            responseValue=workerEntity.friendlyName+", you are inactive, not receiving calls.";
            console.log("SMS.off(): responseValue: "+responseValue);
        }
        catch(err){
            console.log("Sms.off() error: "+err);
            responseValue=err;
        }
        return responseValue;
    }

    async add(parameterObj){


        var responseValue;
        if (parameterObj.commandArray.length!=4){
            responseValue="Incorrect number of parameters for 'add': add [password] [contact_uri] [username]";
        }
        else if (parameterObj.commandArray[1]==process.env.ADMIN_PASSWORD){
            var contact_uri=commandArray[2];
            var friendlyName=commandArray[3];
            var contact_uriExists=await this.worker.contact_uriExists(contact_uri);
            if (contact_uriExists){
                    responseValue="Worker with contact_uri "+contact_uri+" already exists.";
            }
            else{
                responseValue=await this.worker.createWorker(contact_uri,friendlyName);
                //todo: this is a hack until I can figure out what the problem
                //is with the return value from worker.create
                if (responseValue==",1"){
                    //todo: need to allow user to remove themselves by texting "remove"
                    var confirmMessageBody="You have been added as a Vent user, username "+friendlyName+
                                                            ".  If you did not request to be added, please contact the administrator to request removal.";
                    client.messages
                    .create({
                        from:process.env.TWILIO_PHONE_NUMBER,
                        body:confirmMessageBody,
                        to:contact_uri
                    })
                    .then(message=>console.log("Sms.add(): sent message to added worker: "+message.sid))
                    .catch(err=>console.log("Sms.add(): Error sending message to added worker: "+err));

                    responseValue="Worker "+parameterObj.commandArray[3]+" successfully created.";
                }
            }
        }
        else{
            responseValue="You entered an incorrect admin password.";
        }
        return responseValue;
    }

    async changeName(parameterObj){
        var responseValue;
        try{
            if (parameterObj.commandArray.length!=2){
                responseValue="Incorrect number of parameters for 'changename': changename [new name (no spaces)]";
            }
            else{
                var newFriendlyName=commandArray[1];
                var workerEntity=await worker.updateWorkerName(parameterObj.from,newFriendlyName);
                responseValue="Your new name is "+workerEntity.friendlyName+".";
            }
        }
        catch(err){
            responseValue=err;
        }
        return responseValue;
    }

    async changeNumber(parameterObj){
        var responseValue;
        try{
            if (parameterObj.commandArray[1]==process.env.ADMIN_PASSWORD){
                if (commandArray.length!=4){
                    responseValue="Incorrect number of parameters for 'changenumber': changenumber [password] [old number] [new number]";
                }
                else{
                    var oldNumber=commandArray[2];
                    var newNumber=commandArray[3];
                    var workerEntity=await this.worker.updateContact_uri(oldNumber,newNumber);
                    if (workerEntity==null){
                        responseValue="Error updating number.";
                    }
                    else{
                        responseValue="Number updated."
                    }
                }
            }
            else{
                responseValue="You entered an incorrect admin password.";
            }
        }
        catch(err){
            responseValue=err;
        }
        return responseValue;
    }

    async status(parameterObj){
        var attributes=JSON.parse(parameterObj.workerEntity.attributes);
        var do_not_contact=attributes.do_not_contact;
        var workerSid=parameterObj.workerEntity.sid;
        var workerSidArray=[workerSid];
        var sids_to_exclude=do_not_contact.concat(workerSidArray);
        //var do_not_contact_toString=this.formatDoNotContact(do_not_contact);
        var workerCount=await this.worker.getCountOfIdleWorkers(sids_to_exclude);
        var activity;
        switch(parameterObj.workerEntity.activitySid){
            case process.env.TWILIO_IDLE_SID:
                activity="You are available to receive calls.";
                break;
            default:
                activity="You are not available to receive calls.";
        }
        var responseValue=workerCount+" "+(workerCount==1 ? "listener is" : "listeners are")+" waiting for your call.\n"+activity;
        return responseValue;
    }

    formatDoNotContact(do_not_contact){
        var index;
        var output=do_not_contact;
        for(index=0;index<output.length;index++){
            output[index]="'"+output[index]+"'";
        }
        return "["+output.toString()+"]";
    }

    manualResponse(command){
        return command.helpMessage+" Usage: "+command.parameterUsage;
    }

    //todo: add STOP reserved commands to manual()
    manual(parameterObj){
        var responseValue;
        var commandName=parameterObj.commandArray[1];
        if(parameterObj.commandArray.length==1){
            responseValue="Command list: "+this.commandListKeysString;
        }
        else if(commandName in this.commandList){
            var command=this.commandList[commandName];
            responseValue=this.manualResponse(command);
        }
        else{
            var defaultCommand=this.commandList["default"];
            responseValue="Command '"+commandName+"' not recognized. "+this.helpResponse(defaultCommand);
        }
        return responseValue;
    }

    parameterCountMatch(command,parameterObj){
        if ((parameterObj.commandArray.length==1)&&(command.commandName=="helpme")){
            return true;
        }
        else{
            return (parameterObj.commandArray.length==command.parameterCount);
        }
    }
    async processCommand(parameterObj){
        var responseValue;
        var commandArray=this.bodyToCommandArray(parameterObj.body);
        const commandName=commandArray[0].toLowerCase();
        parameterObj.commandArray=commandArray;
        var command;
        if(commandName in this.commandList){
            command=this.commandList[commandName];
            if(command.isAdmin){
                if (parameterObj.commandArray[1]!=process.env.ADMIN_PASSWORD){
                    responseValue="You entered an incorrect admin password."
                    return responseValue;
                }
            }
            if (!this.parameterCountMatch(command,parameterObj)){
                responseValue="Incorrect syntax for '"+command.commandName+"': "+command.parameterUsage;
                return responseValue;
            }

        }
        else{
            command=this.commandList["default"]; 
        }
        responseValue=await command.commandFunction(parameterObj);

        return responseValue;
    }

    bodyToCommandArray(body){
        body = body.replace(/\s\s+/g, ' ');
        if (body==" "){
            body="";
        }
        body=body.trim();
        var commandArray=body.split(" ");
        return commandArray;
    }
}

module.exports=Sms;