const DataValidator=require('./dataValidator');
require('env2')('.env');

class MembershipRequester{

    constructor(client,worker){
        this.dataValidator=new DataValidator();
        this.worker=worker;
        this.client=client;
    }

    sendMessageToContact_uri(contact_uri,messageBody){
        if(contact_uri.charAt(0)!='+'){
            contact_uri='+'+contact_uri;
        }
        this.client.messages
        .create({
            from:process.env.TWILIO_PHONE_NUMBER,
            body:messageBody,
            to:contact_uri
        })
        .then(message=>console.log("MembershipRequester.sendMessageToWorkerEntity(): sent message to contact_uri "+contact_uri+": "+message.sid))
        .catch(err=>console.log("MembershipRequester.sendMessageToWorkerEntity(): Error sending message to contact_uri "+contact_uri+": "+err));
    }

    async requestNewWorker(contact_uri,friendlyName){
        var workerEntity;
        var notFound;
        var output;
        if (this.dataValidator.validPhoneNumber(contact_uri)){
            try{
                workerEntity=await this.worker.getWorkerEntityFromContact_uri(contact_uri);
                //todo: delete below line, replace with above line when finished testing
                workerEntity=null;
                if(workerEntity!=null){
                    notFound=false;
                    output="A worker with this phone number already exists.";
                    return output;
                }
            }
            catch(err){
                notFound=true;
                output=err;
                return output;
            }
            if (notFound){
                try{
                    workerEntity=this.worker.getWorkerEntityFromFriendlyName(friendlyName);
                    //notFound=(workerEntity==null);
                    //todo: delete below line, replace with above line when finished testing
                    notFound=true;
                    if(notFound){
                        var authenticateCode=getRndInteger(process.env.AUTHENTICATECODE_MIN,process.env.AUTHENTICATECODE_MAX);
                        var workerApply=await this.worker.createWorkerApply(contact_uri,friendlyName,authenticateCode);
                        var messageText="A request has been made to add you as a Vent user with the name "+friendlyName+"."+
                                        "  To confirm your identity, please respond to this text with the number "+authenticateCode+".";
                        this.sendMessageToContact_uri(contact_uri,messageText);
                        output="Authentication message sent to "+contact_uri+".";
                    }
                    else{
                        output="A worker with this name already exists.";
                    }
                }
                catch(err){
                    notFound=false;
                    output=err;
                }
            }

                
        }
        else{
            output="Invalid phone number.";
        }
        return output;
    }

    getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1) ) + min;
    }
}

module.exports=MembershipRequester;