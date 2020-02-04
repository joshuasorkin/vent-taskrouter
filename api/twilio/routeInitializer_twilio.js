

class RouteInitializer_Twilio{
    constructor(twilio,MessagingResponse,worker,dataValidator,membershipRequester,sms){
        this.twilio=twilio;
        this.MessagingResponse=MessagingResponse;
        this.worker=worker;
        this.dataValidator=dataValidator;
        this.membershipRequester=membershipRequester;
        this.sms=sms;
        require('env2')('.env');
    }

    initialize(app){
        app.post('/sms',this.twilio.webhook(),async function(req,res){
            var body=req.body.Body;
            var parameterObj;
            console.log("/sms: message request body: "+JSON.stringify(req.body));
            console.log("/sms: message SID "+req.body.sid);
            console.log("/sms: message body: "+body);
            //replace multiple spaces with single space
            
            var fromNumber=req.body.From;
            
            var responseValue;
            const response=new this.MessagingResponse();
        
            //todo: the contact_uriExists check should get moved to sms.js,
            //as should the workerEntity retrieval.
            //basically, /sms should just extract the body and fromNumber parameters, then pass
            //them along to sms.processCommand() which will then create the parameterObj internally
            contact_uriExists=await this.worker.contact_uriExists(fromNumber);
            console.log("/sms: contact_uriExists: "+contact_uriExists);
            if (!contact_uriExists){
                var validAuthenticateCode=this.dataValidator.validAuthenticateCode(body);
                if(validAuthenticateCode){
                    var result=await this.membershipRequester.verifyRequest(fromNumber,body);
                    responseValue=result;
                }
                else{
                    responseValue="You are not recognized as an authorized user.  Please register with an administrator and try again.";
                }
            }
            else{
                var workerEntity=await this.worker.getWorkerEntityFromContact_uri(fromNumber);
                parameterObj=this.sms.createParameterObj(body,fromNumber,workerEntity);
                responseValue=await this.sms.processCommand(parameterObj);
            }
            console.log('/sms: response value: '+responseValue);
            response.message(responseValue);
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(response.toString());
        });
    }

}

module.exports=RouteInitializer_Twilio;