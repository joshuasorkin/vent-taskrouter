require('env2')('.env');
const http = require('http');
const express = require('express');
const twilio=require('twilio');
const app = express();
const bodyParser = require('body-parser');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const workflowSid=process.env.TWILIO_WORKFLOW_SID;
const client=require('twilio')(accountSid,authToken);
//var workspace = require('./lib/workspace')();
const http_port=process.env.HTTP_PORT;
const Taskrouter=require('./taskrouter');
var clientWorkspace;


function exitErrorHandler(error) {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
}

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/enqueue_call',function(req,res){
	const response=new VoiceResponse();
	const enqueue=response.enqueue({
		//workflowSid:app.get('workspaceInfo').workflowSid,
		workflowSid:workflowSid,
		waitUrl:'/wait'
	});
	res.send(response.toString());
});

app.post('/wait',function(req,res){
	const response=new VoiceResponse();
	response.say('Please wait while I find someone to give you attention.');
	response.play(process.env.WAIT_URL);
	res.send(response.toString());
});

// POST /call/assignment
app.post('/assignment/', function (req, res) {
	console.log("task attributes: "+req.body.TaskAttributes);
	console.log("reservation sid: "+req.body.ReservationSid);
	res.type('application/json');
    res.send({
      instruction: "dequeue"
      //post_work_activity_sid: app.get('workspaceInfo').activities.idle
    });
  });

app.listen(http_port,()=>{
	console.log(`app listening on port ${http_port}`);
	console.log("Configuring a Twilio's TaskRouter Workspace");
	clientWorkspace=client.taskrouter.workspaces(workspaceSid);
	taskrouter=new Taskrouter(clientWorkspace);
	taskrouter.configureWorkflow().done();
	
	/*
	clientWorkspace.workflows(workflowSid)
					.update({
						assignmentCallbackUrl:process.env.APP_BASE_URL+'/assignment',
						
					})
                 .then(workflow => console.log(workflow.configuration))
                 .done();
	*/

	
	/*
	workspace.setup().then(function (data) {
		app.set('workerInfo', data[0]);
		app.set('workspaceInfo', data[1]);
		//workflowSid=app.get('workspaceInfo').workflowSid;
		console.log(data)
		console.log('Application configured!');
		console.log('Call your Twilio number at: ' + process.env.TWILIO_PHONE_NUMBER);
		console.log('main workflow sid: '+app.get('workspaceInfo').workflowSid);
	})
	.catch(err=>{console.log("error occurred: "+err)});
	*/
});