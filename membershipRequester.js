const DataValidator=require('./dataValidator');
require('env2')('.env');

class MembershipRequester{

    constructor(worker){
        this.dataValidator=new DataValidator();
        this.worker=worker;
    }

    sendMessageToContact_uri(contact_uri,messageBody){
        client.messages
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
        if (this.dataValidator.validPhoneNumber(contact_uri)){
            try{
                workerEntity=this.worker.getWorkerEntityFromContact_uri(contact_uri);
                notFound=false;
                throw("A worker with this phone number already exists.");
            }
            catch(err){
                notFound=true;
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
                    }
                    else{
                        throw("A worker with this name already exists.");
                    }
                }
                catch(err){
                    notFound=false;
                }
            }

                
        }
        else{
            throw("Invalid phone number.");
        }
    }

    getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1) ) + min;
    }
}

module.exports=MembershipRequester;