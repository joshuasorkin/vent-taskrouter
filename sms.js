require('env2')('.env');

class Sms{


    constructor(worker){
        this.worker=worker;
        this.commandList=this.createCommandList();
    }

    createParameterObj(bodyArray,from){
        var parameterObj={
            bodyArray:bodyArray,
            from:from
        }
        return parameterObj;
    }

    createCommandList(){
        var commandListObj=[];
        addCommand(commandList,"on","Enables the user to receive calls.","on",1,false,this.on);
        addCommand(commandList,"off","Disables the user from receiving calls.","off",1,false,this.off);
        addCommand(commandList,"default","Disables the user from receiving calls.","any unrecognized command",1,false,this.off);
        return commandListObj;
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
        var responseValue;
        console.log("on request made");
        //todo: this try-catch is duplicate of the default,
        //both need to be refactored into single function
        try{
            if(parameterObj.bodyArray.length>1){
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
            console.log(responseValue);
        }
        catch(err){
            console.log("Sms.off() error: "+err);
            responseValue=err;
        }
        return responseValue;
    }

    async add(parameterObj){
        var responseValue;
        if (parameterObj.bodyArray.length!=4){
            responseValue="Incorrect number of parameters for 'add': add [password] [contact_uri] [username]";
        }
        else if (parameterObj.bodyArray[1]==process.env.ADMIN_PASSWORD){
            var contact_uri=bodyArray[2];
            var friendlyName=bodyArray[3];
            var contact_uriExists=await this.worker.contact_uriExists(contact_uri);
            if (contact_uriExists){
                    responseValue="Worker with contact_uri "+contact_uri+" already exists.";
            }
            else{
                responseValue=await this.worker.createWorker(contact_uri,friendlyName);
                //todo: this is a hack until I can figure out what the problem
                //is with the return value from worker.create
                if (responseValue==",1"){
                    var confirmMessageBody="You have been added as a Vent worker, username "+friendlyName+
                                                            ".  If you did not request to be added, please contact the administrator to request removal.";
                    client.messages
                    .create({
                        from:process.env.TWILIO_PHONE_NUMBER,
                        body:confirmMessageBody,
                        to:contact_uri
                    })
                    .then(message=>console.log("Sms.add(): sent message to added worker: "+message.sid))
                    .catch(err=>console.log("Sms.add(): Error sending message to added worker: "+err));

                    responseValue="Worker "+parameterObj.bodyArray[3]+" successfully created.";
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
            if (parameterObj.bodyArray.length!=2){
                responseValue="Incorrect number of parameters for 'changename': changename [new name (no spaces)]";
            }
            else{
                var newFriendlyName=bodyArray[1];
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
            if (parameterObj.bodyArray[1]==process.env.ADMIN_PASSWORD){
                if (bodyArray.length!=4){
                    responseValue="Incorrect number of parameters for 'changenumber': changenumber [password] [old number] [new number]";
                }
                else{
                    var oldNumber=bodyArray[2];
                    var newNumber=bodyArray[3];
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


    async processCommand(commandName,parameterObj){
        var responseValue;
        var command;
        if(commandName in commandList){
            command=this.commandList[commandName];
           
        }
        else{
            command=this.commandList["default"]; 
        }
        responseValue=await command.commandFunction(parameterObj);

        /*
        switch(command){
            case "on":
                responseValue=await this.on(parameterObj);
                break;
            case "off":
                responseValue=await this.off(parameterObj);
                break;
            case "add":
                responseValue=await this.add(parameterObj);
                break;
            case "changename":
                responseValue=await this.changeName(parameterObj);
                break;
            case "changenumber":
                responseValue=await this.changeNumber(parameterObj);
                break;
            default:
                responseValue=await this.off(parameterObj);
        }
        */
        return responseValue;
    }
}

module.exports=Sms;