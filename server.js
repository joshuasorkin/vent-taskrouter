require('env2')('.env');
const http = require('http');
const express = require('express');
const twilio=require('twilio');
const app = express();
const bodyParser = require('body-parser');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const MessagingResponse=require('twilio').twiml.MessagingResponse;
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const workflowSid=process.env.TWILIO_WORKFLOW_SID;
const client=require('twilio')(accountSid,authToken);
//var workspace = require('./lib/workspace')();
const http_port=process.env.HTTP_PORT;
const Taskrouter=require('./taskrouter');
const UrlSerializer=require('./urlSerializer');
var clientWorkspace;
var urlSerializer=new UrlSerializer();

function exitErrorHandler(error) {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
}

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/sms',function(req,res){
	body=req.body.Body;
	var responseBody;
	var activitySid;
	if (body=="on"){
		activitySid=process.env.TWILIO_IDLE_SID;
		responseBody="available";
	}
	else{
		activitySid=process.env.TWILIO_OFFLINE_SID;
		responseBody="not available";
	}
	clientWorkspace.workers
					.each({
						targetWorkersExpression:'contact_uri=="'+req.body.From+"'"
					},worker=>{
						worker.update({
							ActivitySid:activitySid
						})
						.then(worker=>console.log("worker updated to: "+worker.activityName))
					});
	
	const response=new MessagingResponse();
	response.message(responseBody);
	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end(response.toString());
});

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
	response.say('Please wait while I find a receiver.');
	response.play(process.env.WAIT_URL);
	res.send(response.toString());
});


/*
//this endpoint just serves as a redirect, sort of a POST->GET wrapper, because the assignment callback
//doesn't seem to have a way to use GET method, and we need to be able to
//pass the reservationSid to the gather twiml using GET
app.post('/agent_answer',function(req,res){
	console.log("endpoint: agent_answer");
	console.log("res.body: "+JSON.stringify(req.body));
	clientWorkspace.tasks
					.each({
						evaluateTaskAttributes:"worker_call_sid == '"+req.body.CallSid+"'"
					},task=>{
						console.log
					})
					.done();
	const response=new VoiceResponse();
	response.redirect({method:'GET'},'/agent_answer_start?reservationSid='+req.body.ReservationSid);
	res.send(response.toString());
});
*/

app.get('/agent_answer',function(req,res){
	parameters=urlSerializer.deserialize(req,'parameters');
	console.log("endpoint: agent_answer");
	url=urlSerializer.serialize('agent_answer_process',parameters,'parameters');
	redirectUrl=urlSerializer.serialize('agent_answer',parameters,'parameters');
	console.log("url: "+url);
	const response=new VoiceResponse();
	response.say('You have a call from Vent.  Press 1 to accept, or 2 to refuse.');
	const gather=response.gather({
		numDigits:1,
		action:url,
		method:'GET'
	});
	response.redirect({method:'GET'},redirectUrl);
	res.send(response.toString());
});

app.post('/conferenceEvents',function(req,res){
	console.log("conference event: "+req.body.StatusCallbackEvent);
	res.status(200).send();
});


app.get('/agent_answer_process',function(req,res){
	console.log("endpoint: agent_answer_process");
	parameters=urlSerializer.deserialize(req,'parameters');
	redirectUrl=urlSerializer.serialize('agent_answer',parameters,'parameters');
	const response=new VoiceResponse();
	switch(req.query.Digits){
		case '1':
			response.say('Thank you.  Now connecting you to caller.');
			clientWorkspace
				.tasks(parameters.taskSid)
				.reservations(parameters.reservationSid)
				.update({
					instruction:'conference',
					from:process.env.TWILIO_PHONE_NUMBER,
					conferenceStatusCallback:process.env.APP_BASE_URL+'/conferenceEvents',
					conferenceStatusCallbackEvent:[
						'start',
						'end',
						'join',
						'leave',
						'mute',
						'hold'
				]})
				.then((reservation) => {
					console.log(reservation.reservationStatus);
					console.log(reservation.workerName);
				});
			
			/*
			const dial=response.dial();
			const queue=dial.queue({
				reservationSid:parameters.reservationSid
			});
			*/
		case '2':
			response.say('Sorry that you\'re not available.  Goodbye!');
			response.hangup();
		default:
			response.say('I didn\'t understand your response.');
			response.redirect({method:'GET'},redirectUrl);
	}
});


// POST /call/assignment
app.post('/assignment/', function (req, res) {
	console.log("task attributes: "+req.body.TaskAttributes);
	console.log("worker attributes: "+req.body.WorkerAttributes);
	console.log("reservation sid: "+req.body.ReservationSid);
	taskSid=req.body.TaskSid;
	console.log("task sid: "+taskSid);
	reservationSid=req.body.ReservationSid;
	WorkerAttributes=JSON.parse(req.body.WorkerAttributes);
	contact_uri=WorkerAttributes.contact_uri;
	console.log("contact_uri: "+contact_uri);
	parameters={
		taskSid:taskSid,
		reservationSid:reservationSid
	}
	url=urlSerializer.serialize('agent_answer',parameters,'parameters');
	var call=client.calls.create({
		url:url,
		to: contact_uri,
		from: process.env.TWILIO_PHONE_NUMBER,
		method: 'GET'
		
	}).then(x=>console.log("createCallToHost: logging return value of client calls create "+x));
	
	
	res.type('application/json');
    res.status(200).send({ error: "error occurred at assignment endpoint" });
 });

  

app.listen(http_port,()=>{
	console.log(`app listening on port ${http_port}`);
	console.log("Configuring a Twilio's TaskRouter Workspace");
	clientWorkspace=client.taskrouter.workspaces(workspaceSid);
	taskrouter=new Taskrouter(clientWorkspace);
	taskrouter.configureWorkflow()
				.then(workflow=>console.log("returned from configureWorkflow"))
				.done();
	
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