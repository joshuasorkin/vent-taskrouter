const DataValidator=require('./dataValidator');
require('env2')('.env');

class MembershipRequester{

    constructor(client,worker,sms){
        this.dataValidator=new DataValidator();
        this.worker=worker;
        this.client=client;
        this.sms=sms;
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
        console.log("requestNewWorker: validating phone number...");
        if (this.dataValidator.validPhoneNumber(contact_uri)){
            console.log("requestNewWorker: getting worker by contact_uri...");
            try{
                workerEntity=await this.worker.getWorkerEntityFromContact_uri(contact_uri);
                console.log("requestNewWorker: finished getWorkerEntityFromContact_uri");
                //todo: delete below line, replace with above line when finished testing
                workerEntity=null;

                if(workerEntity!=null){
                    notFound=false;
                    output="A worker with this phone number already exists.";
                    console.log("requestNewWorker: "+output);
                    return output;
                }
                else{
                    notFound=true;
                }
            }
            catch(err){
                output=err;
                console.log("requestNewWorker: "+output);
                return output;
            }
            if (notFound){
                try{
                    console.log("requestNewWorker: getting worker by friendlyname...");
                    workerEntity=this.worker.getWorkerEntityFromFriendlyName(friendlyName);
                    //notFound=(workerEntity==null);
                    //todo: delete below line, replace with above line when finished testing
                    notFound=true;
                    if(notFound){
                        var authenticateCode=this.getRndInteger(process.env.AUTHENTICATECODE_MIN,process.env.AUTHENTICATECODE_MAX);
                        console.log("requestNewWorker: authenticate code is "+authenticateCode);
                        console.log("requestNewWorker: running worker.createWorkerApply...");
                        var workerApply=await this.worker.createWorkerApply(contact_uri,friendlyName,authenticateCode);
                        var messageText="A request has been made to add you as a Vent user with the name "+friendlyName+"."+
                                        "  To confirm your identity, please respond to this text with the number "+authenticateCode+".";
                        console.log("requestNewWorker: sending message to contact_uri...");
                        this.sendMessageToContact_uri(contact_uri,messageText);
                        output="Authentication message sent to "+contact_uri+".";
                        console.log("requestNewWorker: "+output);
                    }
                    else{
                        output="A worker with this name already exists.";
                        console.log("requestNewWorker: "+output);
                    }
                }
                catch(err){
                    notFound=false;
                    output=err;
                    console.log("requestNewWorker: "+output);
                }
            }

                
        }
        else{
            output="Invalid phone number.";
            console.log("requestNewWorker: "+output);
        }
        return output;
    }

    getRndInteger(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        var rndInteger=Math.floor(Math.random() * (max - min + 1) ) + min;
        console.log("getRndInteger: "+rndInteger);
        return rndInteger;
    }

    async verifyRequest(contact_uri,authenticateCode){
        var membershipRequest=await this.worker.getMembershipRequest(contact_uri,authenticateCode);
        if(membershipRequest==null){
            return "No membership request found for this phone number and authentication code."
        }
        else{
            console.log("verifyRequest: membershipRequest: "+JSON.stringify(membershipRequest));
            console.log("verifyRequest: friendlyName for this request is: "+membershipRequest.friendlyname);
            var workerEntity=await this.worker.getWorkerEntityFromFriendlyName(membershipRequest.friendlyname);
            if (workerEntity==null){
                var updateResult=await this.worker.updateMembershipRequestToComplete(fromNumber);
                var addResult=await this.sms.addWithoutParameterObj(contact_uri,membershipRequest.friendlyName);
                return addResult;
            }
            else{
                return "A worker already exists with the name corresponding to this authentication code, "+
                        "please use another code or generate a new membership request."
            }
        }
    }
}

module.exports=MembershipRequester;