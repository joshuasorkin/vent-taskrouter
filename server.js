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
const http_port=process.env.HTTP_PORT||process.env.PORT;
const Taskrouter=require('./taskrouter');
const UrlSerializer=require('./urlSerializer');
const Conference=require('./conference');
const Worker=require('./worker');
const TwimlBuilder=require('./twimlBuilder');
var clientWorkspace;
var urlSerializer=new UrlSerializer();
var conference;
var worker;
var twimlBuilder=new TwimlBuilder();
var router=express.Router();
app.use('/other_route',require('./other_route').router);


function exitErrorHandler(error) {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
}


app.use(bodyParser.urlencoded({ extended: false }));

app.get('/testHeroku',function(req,res){
	var response=new VoiceResponse();
	twimlBuilder.say(response,"Heroku");
	res.send(response.toString());
});

app.post('/sms',async function(req,res){
	var body=req.body.Body;
	console.log(body);
	bodyArray=body.split(" ");
	var responseBody;
	var activitySid=process.env.TWILIO_OFFLINE_SID;
	const response=new MessagingResponse();
	var promise;
	switch (bodyArray[0].toLowerCase()){
		case "on":
			console.log("on request made");
			//todo: this try-catch is duplicate of the default,
			//both need to be refactored into single function
			try{
				worker=await worker.updateWorker(req.body.From,process.env.TWILIO_IDLE_SID);
				responseValue=worker.friendlyName+" is active, receiving calls.";
				console.log(responseValue);
			}
			catch(err){;
				console.log("/sms error: "+err);
			}
			break;
		case "add":
			if (bodyArray[1]==process.env.ADMIN_PASSWORD){
				contact_uri=bodyArray[2];
				friendlyName=bodyArray[3];
				contact_uriExists=await worker.contact_uriExists(contact_uri);
				if (contact_uriExists){
						responseValue="worker with contact_uri "+contact_uri+" already exists";
				}
				else{

					responseValue=await worker.createWorker(contact_uri,friendlyName);
					//todo: this is a hack until I can figure out what the problem
					//is with the return value from worker.create
					if (responseValue==",1"){
						responseValue="Worker "+bodyArray[3]+" successfully created";
					}
				}
			}
			else{
				responseValue="incorrect admin password";
			}
			
			break;
		default:
			console.log("/sms: default, setting worker to offline");
			//should refactor this to its own function, as it's good to do that with
			//a try-catch block
			try{
				worker=await worker.updateWorker(req.body.From,process.env.TWILIO_OFFLINE_SID);
				responseValue=worker.friendlyName+" is inactive, not receiving calls";
				console.log(responseValue);
			}
			catch(err){;
				console.log("/sms error: "+err);
			}
	}
	console.log('response value: '+responseValue);
	response.message(responseValue);
	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end(response.toString());
});


app.get('/conferenceAnnounceEnd_participantLeave',function(req,res){
	var parameters=urlSerializer.deserialize(req);
	url=urlSerializer.serialize('endConference_update',parameters);
	const response=new VoiceResponse();
	console.log("/conferenceAnnounceEnd_participantLeave: running conferenceAnnounceEnd");
	twimlBuilder.say(response,'The other participant has left the conference.  Thank you for participating.  Now ending conference.');
	response.redirect({
		method:'GET'
	},url);
	res.send(response.toString());
});

//todo: refactor this, both of the conferenceAnnounceEnd should be the same function
//with different say() text passed in
app.get('/conferenceAnnounceEnd_timeUp',function(req,res){
	var parameters=urlSerializer.deserialize(req);
	url=urlSerializer.serialize('endConference_update',parameters);
	const response=new VoiceResponse();
	console.log("/conferenceAnnounceEnd_participantLeave: running conferenceAnnounceEnd");
	twimlBuilder.say(response,'Time\'s up.  Thank you for participating.  Now ending conference.');
	response.redirect({
		method:'GET'
	},url);
	res.send(response.toString());
});




app.get('/endConference_update',function(req,res){
	var parameters=urlSerializer.deserialize(req);
	var conferenceSid=parameters.conferenceSid;
	conference.endConference_update(conferenceSid);
	const response=new VoiceResponse();
	res.send(response.toString());
});

app.get('/conferenceAnnounceTime',function(req,res){
	const response=new VoiceResponse();
	parameters=urlSerializer.deserialize(req);
	timeRemaining=parameters.timeRemaining;
	var unit;
	if (timeRemaining==1){
		unit="minute";
	}
	else{
		unit="minutes";
	}
	twimlBuilder.say(response,'You have '+timeRemaining+' '+unit+' remaining.');
	res.send(response.toString());
});

app.post('/conferenceEnd_timesUp',function(req,res){
	const response=new VoiceResponse();
	twimlBuilder.say(response,"Time's up!  Thank you for participating.  Good-bye!");
	response.hangup();

	clientWorkspace
	.tasks(parameters.taskSid)
	.update({
		assignmentStatus:'completed'
	})
	.then(task=>{
		console.log("task status: "+task.assignmentStatus);
	})
	.catch(err=>console.log("/conferenceEnd_timesUp: update task to completed: error: "+err));

	res.send(response.toString());
});

app.post('/enqueue_call',function(req,res){
	const fromNumber=req.body.From;
	contact_uriExists=worker.contact_uriExists(fromNumber);
	const response=new VoiceResponse();
	twimlBuilder.say(response,"This is an alpha test version.  By proceeding, you acknowledge that you "
														+"have reviewed reliability and security limitations.");
	if(contact_uriExists){
		const enqueue=response.enqueue({
			//workflowSid:app.get('workspaceInfo').workflowSid,
			workflowSid:workflowSid,
			waitUrl:'/wait'
		});
	}
	else{
		twimlBuilder.say(response,"You are not recognized as an authorized user.  Good-bye.");
		response.hangup();
	}
	res.send(response.toString());
});

app.post('/wait',function(req,res){
	const response=new VoiceResponse();
	twimlBuilder.say(response,'Please wait while I find a receiver.');
	response.play(process.env.WAIT_URL);
	res.send(response.toString());
});


//this endpoint to be reached if the agent does not provide IVR response
//to the options presented by /agent_answer
//either because they hung up or waited too long
app.get('/agent_answer_hangup',function(req,res){
	parameters=urlSerializer.deserialize(req);
	const response=new VoiceResponse();
	twimlBuilder.say(response,'I didn\'t get any input from you.  Goodbye!');
	response.hangup();
	taskrouter.rejectReservation(parameters.workerSid,parameters.reservationSid);
	var updateResult=worker.updateWorkerFromSid(parameters.workerSid,process.env.TWILIO_OFFLINE_SID);
	res.send(response.toString());
});

//this endpoint to be reached if agent answers outbound call initiated by /assignment
app.get('/agent_answer',async function(req,res){
	parameters=urlSerializer.deserialize(req);
	console.log("endpoint: agent_answer");
	url=urlSerializer.serialize('agent_answer_process',parameters);
	redirectUrl=urlSerializer.serialize('agent_answer_hangup',parameters);
	console.log("agent_answer url: "+url);
	const response=new VoiceResponse();
	//check if inbound caller has hung up in the meantime by checking if task is canceled
	taskIsCanceled=await taskrouter.taskIsCanceled(parameters.taskSid);
	console.log("agent_answer: taskIsCanceled = "+taskIsCanceled);
	//disconnect if caller disconnected.  no need to cancel reservation
	//as is done at agent_answer_hangup because this is already handled by taskrouter
	//in response to inbound caller's hangup
	if (taskIsCanceled){
		twimlBuilder.say(response,"The caller disconnected already.  Sorry to bother you.  Good-bye.");
		response.hangup();
	}
	else{
		twimlBuilder.say(response,'You have a call from Vent.  Press 1 to accept, or 2 to refuse.');
		const gather=response.gather({
			numDigits:1,
			action:url,
			method:'GET'
		});
		response.redirect({method:'GET'},redirectUrl);
	}
	res.send(response.toString());
});

app.get('/conferenceEvents',async function(req,res){
	parameters=urlSerializer.deserialize(req);
	event=req.query.StatusCallbackEvent;
	conferenceSid=req.query.ConferenceSid;
	console.log("/conferenceEvents: conference event: "+event);
	console.log("/conferenceEvents: now listing conference participants' callSids:");
	var participants=await conference.getParticipants(conferenceSid);
	console.log("/conferenceEvents: participants: "+participants);
	parameters.conferenceSid=conferenceSid;
	var responseValue="";
	switch(event){
		case "conference-start":
			initialMinutes=0.5;
			conference.announce(conferenceSid,initialMinutes);
			conference.setTimedAnnounce(initialMinutes,initialMinutes/2,conferenceSid);
			conference.setTimedEndConference(initialMinutes,parameters);
			if (initialMinutes>3){
				conference.setTimedAnnounce(initialMinutes,initialMinutes-1,conferenceSid);
			}
			break;
		case "participant-leave":
			console.log("/conferenceEvents: now ending conference, starting with endConferenceAnnounce...");
			
			conference.endConferenceAnnounce(parameters,'conferenceAnnounceEnd_participantLeave');
			//conference.endConferenceTask(req.query.ConferenceSid,parameters.taskSid,'conferenceAnnounceEnd_participantLeave');
			break;
		case "conference-end":
			conference.endConferenceTask(parameters.taskSid);
			responseValue="";
		default:
			responseValue="";

	}

	res.type('application/json');
	if (responseValue==""){
		res.status(200).send();
	}
	else{
		console.log("conferenceEvents: sending responseValue");
		res.send(responseValue);
	}
});

app.get('/updateCallToConference',function(req,res){
	parameters=urlSerializer.deserialize(req);
	var response=conference.generateConference(parameters,null);
	res.send(response.toString());
});

app.get('/agent_answer_process',function(req,res){
	console.log("endpoint: agent_answer_process");
	parameters=urlSerializer.deserialize(req);
	redirectUrl=urlSerializer.serialize('agent_answer',parameters);
	conferenceUpdateUrl=urlSerializer.serialize('updateCallToConference',parameters);
	var response=new VoiceResponse();
	switch(req.query.Digits){
		case '1':
			//prepare twiml to put agent into conference
			response=conference.generateConference(parameters,'Thank you.  Now connecting you to caller.');
			
			console.log("worker accepted call");
			//put caller into conference
			client.calls(parameters.callSid)
					.update({
						url:conferenceUpdateUrl,
						method:'GET'
					})
					.then(call=>{
						clientWorkspace
							.tasks(parameters.taskSid)
							.reservations(parameters.reservationSid)
							.update({
								reservationStatus:'accepted'
							})
							.then(reservation=>{
								console.log("reservation status: "+reservation.reservationStatus);
								console.log("worker name: "+reservation.workerName);
							})
					});
			break;
		case '2':
			twimlBuilder.say(response,'Sorry that you\'re not available.  Goodbye!');
			response.hangup();
			console.log("worker rejected call");
			clientWorkspace
							//.tasks(parameters.taskSid)
							.workers(parameters.workerSid)
							.reservations(parameters.reservationSid)
							.update({
								reservationStatus:'rejected'
							})
							.then(reservation=>{
								console.log("reservation status: "+reservation.reservationStatus);
								console.log("worker name: "+reservation.workerName);
								var updateResult=worker.updateWorkerFromSid(parameters.workerSid,process.env.TWILIO_OFFLINE_SID);
							});
			break;
		default:
			twimlBuilder.say(response,'I didn\'t understand your response.');
			response.redirect({method:'GET'},redirectUrl);
	}
	res.send(response.toString());
});


// POST /call/assignment
app.post('/assignment', async function (req, res) {
	console.log("task attributes: "+req.body.TaskAttributes);
	console.log("worker attributes: "+req.body.WorkerAttributes);
	console.log("reservation sid: "+req.body.ReservationSid);
	taskSid=req.body.TaskSid;
	console.log("task sid: "+taskSid);
	TaskAttributes=JSON.parse(req.body.TaskAttributes);
	callSid=TaskAttributes.call_sid;
	console.log("call sid: "+callSid);
	reservationSid=req.body.ReservationSid;
	WorkerAttributes=JSON.parse(req.body.WorkerAttributes);
	contact_uri=WorkerAttributes.contact_uri;
	workerSid=req.body.WorkerSid;
	taskQueueSid=req.body.TaskQueueSid;
	console.log("contact_uri: "+contact_uri);
	parameters={
		taskSid:taskSid,
		reservationSid:reservationSid,
		callSid:callSid,
		workerSid:workerSid,
		taskQueueSid:taskQueueSid
	}
	url=urlSerializer.serialize('agent_answer',parameters);	
	
	switch(taskQueueSid){
		case process.env.TWILIO_TASKQUEUE_SID:
			var call=client.calls.create({
				url:url,
				to: contact_uri,
				from: process.env.TWILIO_PHONE_NUMBER,
				method: 'GET'
				
			}).then(call=>console.log("createCallToHost: logging return value of client calls create, 'to' value "+call.to));
			break;
		case process.env.TWILIO_TASKQUEUE_AUTOMATIC_SID:
			clientWorkspace
			.tasks(parameters.taskSid)
			.reservations(parameters.reservationSid)
			.update({
				reservationStatus:'accepted'
			})
			.then(reservation=>{
				console.log("reservation status: "+reservation.reservationStatus);
				console.log("worker name: "+reservation.workerName);
				automaticUrl=urlSerializer.serialize('automatic',parameters);
				client.calls(callSid)
				.update({method: 'GET', url: automaticUrl})
				.then(call => console.log("/assignment: updating call to automatic response: "+call.from))
				.catch(err=>console.log("/assignment: error updating call to automatic response: "+err));
			})
			.catch(err=>console.log("/assignment: error accepting reservation: "+err));
			break;
	}
	
	res.type('application/json');
    res.status(200).send({error:'an error occurred in sending response to assignment callback'});
});

app.get('/endCall_automatic',function(req,res){
	var response=new VoiceResponse();
	response.hangup();
	res.send(response.toString());
});

app.get('/automatic',function(req,res){
	parameters=urlSerializer.deserialize(req);
	var response=new VoiceResponse();
	var url=urlSerializer.serialize('endCall_automatic',parameters);
	twimlBuilder.say(response,"We're sorry, there is no one available to take your call.  Good-bye!");
	response.hangup();
	//response.redirect({method:'GET'},url);

	

	//consider task completed once automatic response finishes
	clientWorkspace
							.tasks(parameters.taskSid)
							.update({
								assignmentStatus:'completed'
							})
							.then(task=>{
								console.log("task status: "+task.assignmentStatus);
							})
							.catch(err=>console.log("/automatic: update task to completed: error: "+err));

	
	res.send(response.toString());
});

app.post('/workspaceEvent',function(req,res){
	eventType=req.body.EventType;
	eventDescription=req.body.EventDescription;
	eventDate=req.body.EventDate;
	resourceType=req.body.ResourceType;
	resourceSid=req.body.ResourceSid;
	console.log("Event Details:\n"+eventType+"\n"+eventDescription+"\n"+eventDate+"\n"+resourceType+"\n"+resourceSid);

	res.type('application/json');
	res.status(204).send({error:'error occurred in processing workspace event callback'});
});

app.listen(http_port,()=>{
	console.log(`app listening on port ${http_port}`);
	console.log("Configuring incoming call urls...");
	
	baseUrl=process.env.APP_BASE_URL;
	client.incomingPhoneNumbers(process.env.TWILIO_PHONE_NUMBER_SID)
		.update({
			smsUrl:baseUrl+"/sms",
			voiceUrl:baseUrl+"/enqueue_call"
		})
		.then(incoming_phone_number=>console.log(incoming_phone_number.friendlyName))
		.done();
		
	console.log("Configuring workspace...");
	clientWorkspace=client.taskrouter.workspaces(workspaceSid);
	worker=new Worker(clientWorkspace);
	taskrouter=new Taskrouter(clientWorkspace);
	conference=new Conference(client,clientWorkspace);
	taskrouter.configureWorkspace();
	taskrouter.configureWorkflow()
				.then(workflow=>console.log("returned from configureWorkflow"))
				.done();
	
});

