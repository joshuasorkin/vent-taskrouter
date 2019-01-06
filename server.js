require('env2')('.env');
const http = require('http');
const express = require('express');
const twilio=require('twilio');
const app = express();
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const workflowSid=process.env.TWILIO_WORKFLOW_SID;
const client=require('twilio')(accountSid,authToken);
const http_port=1337;

app.post('/enqueue_call',function(req,res){
	const response=new VoiceResponse();
	const enqueue=response.enqueue({
		workflowSid:workflow_sid,
		waitUrl:process.env.WAIT_URL
	});
	res.send(response.toString());
});

app.listen(http_port,()=>
	console.log(`app listening on port ${http_port}`)
);