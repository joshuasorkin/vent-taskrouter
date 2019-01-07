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
var workspace = require('./lib/workspace')();

function exitErrorHandler(error) {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
}

app.post('/enqueue_call',function(req,res){
	const response=new VoiceResponse();
	const enqueue=response.enqueue({
		workflowSid:workspace.workflowSid,
		waitUrl:process.env.WAIT_URL
	});
	res.send(response.toString());
});

app.listen(http_port,()=>{
	console.log(`app listening on port ${http_port}`);
	console.log("Configuring a Twilio's TaskRouter Workspace");
  workspace.setup().then(function (data) {
    app.set('workerInfo', data[0]);
    app.set('workspaceInfo', data[1]);
    console.log(data)
    console.log('Application configured!');
    console.log('Call your Twilio number at: ' + process.env.TWILIO_NUMBER);
  })
  .catch(err=>{console.log(err)});
});

var envVariables = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER', 'MISSED_CALLS_EMAIL_ADDRESS', 'HOST', 'ALICE_NUMBER',
  'BOB_NUMBER'];
envVariables.forEach(function (variableName) {
  if (!process.env[variableName]) {
    exitErrorHandler(variableName + ' variable is not set on your environment. Please check your environment variables or your .env file from .env.example');
  }
});