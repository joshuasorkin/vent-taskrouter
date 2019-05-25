require('env2')('.env');
const path = require('path');
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
const Wait=require('./wait');
const ObjectUpdater=require('./objectUpdater');
const Textsplitter=require('./textsplitter');
const AvailableNotifier=require('./availableNotifier');
const Sms=require('./sms');
var availableNotifier=new AvailableNotifier();
var textsplitter=new Textsplitter();
var clientWorkspace;
var urlSerializer=new UrlSerializer();
var conference;
var worker;
var sms;
var taskrouter=null;
var twimlBuilder=new TwimlBuilder();
var router=express.Router();
var wait=new Wait();
var minMinutes=1;
var maxMinutes=10;
var objectUpdater=new ObjectUpdater();
app.use('/other_route',require('./other_route').router);


function exitErrorHandler(error) {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
}


app.use(bodyParser.urlencoded({ extended: false }));

app.get('/admin',function(req,res){
	res.sendFile(path.join(__dirname+'/admin.html'));
});


app.post('/sms',async function(req,res){
	var body=req.body.Body;
	console.log("/sms: message SID "+req.body.sid);
	console.log(body);
	//replace multiple spaces with single space
	
	fromNumber=req.body.From;
	
	var responseValue;
	const response=new MessagingResponse();

	//todo: the contact_uriExists check should get moved to sms.js,
	//as should the workerEntity retrieval.
	//basically, /sms should just extract the body and fromNumber parameters, then pass
	//them along to sms.processCommand() which will then create the parameterObj internally
	contact_uriExists=await worker.contact_uriExists(fromNumber);
	console.log("/sms: contact_uriExists: "+contact_uriExists);
	if (!contact_uriExists){
		responseValue="You are not recognized as an authorized user.  Please register with an administrator and try again.";
	}
	else{
		var workerEntity=await worker.getWorkerEntityFromContact_uri(fromNumber);
		var parameterObj=sms.createParameterObj(body,fromNumber,workerEntity);
		responseValue=await sms.processCommand(parameterObj);
	}
	console.log('/sms: response value: '+responseValue);
	response.message(responseValue);
	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end(response.toString());
});


app.get('/conferenceAnnounceEnd_participantLeave',function(req,res){
	var parameters=urlSerializer.deserialize(req);
	url=urlSerializer.serialize('endConference_update',parameters);
	const response=new VoiceResponse();
	console.log("/conferenceAnnounceEnd_participantLeave: running conferenceAnnounceEnd");
	twimlBuilder.say(response,'Your conversation partner has exited.  Thanks for participating.  I\'ll end the conference now.');
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
	console.log("/conferenceAnnounceEnd_timeUp: running conferenceAnnounceEnd");
	twimlBuilder.say(response,'Time\'s up.  Thanks for participating.  I\'ll end the conference now.');
	response.redirect({
		method:'GET'
	},url);
	res.send(response.toString());
});


app.get('/postConferenceIVR',function(req,res){
	var parameters=urlSerializer.deserialize(req);
	const response=new VoiceResponse();

	var url=urlSerializer.serialize('process_postConferenceIVR',parameters);
	const gather=response.gather({
		input:'dtmf',
		timeout:3,
		action:url,
		method:'GET'
  });
	twimlBuilder.say(gather,"Would you like to be connected to this person on future calls?  Press 1 for yes, 2 for no, followed by pound.");
	res.send(response.toString());
});

app.get('/process_postConferenceIVR',async function(req,res){
	var parameters=urlSerializer.deserialize(req);
	const digits=req.query.Digits;
	const response=new VoiceResponse();
	switch(digits){
		case '1':
			twimlBuilder.say(response,"I'm glad you enjoyed your conversation.  Good-bye.");
			response.hangup;
			break;
		case '2':
			twimlBuilder.say(response,"I'm sorry you didn't enjoy your conversation.  I'll make sure "+
																	"you're not connected to them on any future calls.  Good-bye.");
			response.hangup();
			worker.addBothToDoNotContact(parameters.workerSid,parameters.otherParticipantWorkerSid);
			break;
		default:
			var url=urlSerializer.serialize('postConferenceIVR',parameters);
			response.redirect({method:'GET'},url);
	}
	
	res.send(response.toString());
});




app.get('/endConference_update',function(req,res){
	console.log("/endConference_update: reached this endpoint");
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

app.get('/processGatherConferenceMinutes',async function(req,res){
	console.log("/processGatherConferenceMinutes: req.body: "+JSON.stringify(req.body));
	const digits=req.query.Digits;
	const response=new VoiceResponse();
	var parameters=urlSerializer.deserialize(req);
	var digitsInt;
	var valid=true;
	if (digits.includes("*")){
		valid=false;
	}
	else{
		digitsInt=parseInt(digits);
		if (isNaN(digitsInt)){
			valid=false;
		}
		else if((digitsInt<minMinutes)||(digitsInt>maxMinutes)){
			valid=false;
		}
		else{
			valid=true;
		}
	}
	if (!valid){
		twimlBuilder.say(response,"Not a valid number of minutes.");
		twimlBuilder.gatherConferenceMinutes(response,minMinutes,maxMinutes,parameters);
	}
	else{
		do_not_contact=parameters.do_not_contact;
		const taskJSON={
			minutes:digitsInt,
			do_not_contact:do_not_contact
		}
		//twimlBuilder.say(response,'Thank you.  Please enjoy randomly selected text while you wait.');
		twimlBuilder.say(response,"Thank you.");
		//response.play(process.env.CHIME_URL);
		response.enqueue({
			workflowSid:workflowSid,
			callerWorkerSid:parameters.workerSid,
			waitUrl:'/randomSoundLoop'
		})
		.task({},JSON.stringify(taskJSON));
	}
	res.send(response.toString());
});

app.post('/redirectToWait',function(req,res){
	response=new VoiceResponse();
	//response.play(process.env.CHIME_URL);
	twimlBuilder.say(response,"Now calling a potential receiver.  Please continue to wait.");
	//response.play(process.env.CHIME_URL);
	response.redirect('/randomSoundLoop');
	res.send(response.toString());
});

app.post('/voice',async function(req,res){
	const fromNumber=req.body.From;
	const response=new VoiceResponse();
	const callSid=req.body.CallSid;
	console.log("/voice: callSid: "+callSid);
	contact_uriExists=await worker.contact_uriExists(fromNumber);
	if(contact_uriExists){
		workerEntity=await worker.updateWorkerActivity(fromNumber,process.env.TWILIO_BUSY_SID,false);
		console.log("/voice: worker's sid is "+workerEntity.sid);
		workerSid=workerEntity.sid;
		var result=await worker.insertCallSidWorkerSid(callSid,workerSid);
		if (result!=null){
			console.log("/voice: insertCallSidWorkerSid failed: "+result);
		}
		attributes=JSON.parse(workerEntity.attributes);
		do_not_contact=attributes.do_not_contact;
		parameters={
			do_not_contact:do_not_contact,
			workerSid:workerSid
		}
		twimlBuilder.gatherConferenceMinutes(response,minMinutes,maxMinutes,parameters);
	}
	else{
		twimlBuilder.say(response,"You are not recognized as an authorized user.  Good-bye.");
		response.hangup();
	}
	//twimlBuilder.say(response,"This is an alpha test version.  By proceeding, you acknowledge that you "
	//													+"have reviewed reliability and security limitations.");
	
	res.send(response.toString());
});


app.post('/randomSoundLoop',function(req,res){
	const response=new VoiceResponse();
	response.play(process.env.WAIT_URL);
	response.redirect('/randomSoundLoop');
	res.send(response.toString());
});

app.post('/randomWordLoop',function(req,res){
	const response=new VoiceResponse();
	var word=textsplitter.randomSentenceFromFiletextArray();
	twimlBuilder.sayReading(response,word);
	response.redirect('/randomWordLoop');
	res.send(response.toString());
})

//etag control per https://stackoverflow.com/a/48404148/619177
app.set('etag', 'strong');

app.get('/waitSound',function(req,res){
	res.append('Last-Modified', (new Date(lastModifiedStringDate)).toUTCString());
})

app.post('/wait',function(req,res){
	const response=new VoiceResponse();
	response.redirect('/randomSoundLoop');
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
	//var rejectResult=await taskrouter.rejectReservation(parameters.workerSid,parameters.reservationSid);
	//var updateResult=worker.updateWorkerFromSid(parameters.workerSid,process.env.TWILIO_OFFLINE_SID);
	console.log("/agent_answer_hangup: now updating worker to offline, should automatically reject pending reservation");
	var updateResult=worker.updateWorkerActivityFromSid(parameters.workerSid,process.env.TWILIO_OFFLINE_SID,true);

	/*
	clientWorkspace
							.workers(parameters.workerSid)
							.reservations(parameters.reservationSid)
							.update({
								reservationStatus:'rejected'
							})
							.then(reservation=>{
								console.log("reservation status: "+reservation.reservationStatus);
								console.log("worker name: "+reservation.workerName);
								
							})
							.catch(err=>console.log("/agent_answer_hangup: error rejecting reservation: "+err));
	*/

	
	

	res.send(response.toString());
});

//this endpoint to be reached if agent answers outbound call initiated by /assignment
app.get('/agent_answer',async function(req,res){
	parameters=urlSerializer.deserialize(req);
	const minutes=parameters.minutes;
	console.log("endpoint: agent_answer");
	url=urlSerializer.serialize('agent_answer_process',parameters);
	redirectUrl=urlSerializer.serialize('agent_answer_hangup',parameters);
	console.log("/agent_answer url: "+url);
	console.log("/agent_answer redirectUrl: "+redirectUrl)
	const response=new VoiceResponse();
	//check if inbound caller has hung up in the meantime by checking if task is canceled
	taskIsCanceled=await taskrouter.taskIsCanceled(parameters.taskSid);
	console.log("agent_answer: taskIsCanceled = "+taskIsCanceled);
	//disconnect if caller disconnected.  no need to cancel reservation
	//as is done at agent_answer_hangup because this is already handled by taskrouter
	//in response to inbound caller's hangup
	if (taskIsCanceled){
		twimlBuilder.say(response,"The caller disconnected already.  I'm sorry for the interruption.  Good-bye.");
		response.hangup();
	}
	else{
		const gather=response.gather({
			numDigits:1,
			action:url,
			method:'GET',
			timeout:5
		});
		twimlBuilder.say(gather,'Hello! Would you like a Vent call for '+minutes+'minutes?  Press 1 to accept, or 2 to refuse.');
		response.redirect({method:'GET'},redirectUrl);
	}
	res.send(response.toString());
});

app.post('/incomingCallEvents',function(req,res){
	event=req.body.StatusCallbackEvent;
	console.log("/incomingCallEvents:");
	console.log(JSON.stringify(req.body));
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
			initialMinutes=parameters.minutes;
			conference.announce(conferenceSid,initialMinutes);
			conference.setTimedAnnounce(initialMinutes,initialMinutes/2,conferenceSid);
			conference.setTimedEndConference(initialMinutes,parameters);
			if (initialMinutes>3){
				conference.setTimedAnnounce(initialMinutes,initialMinutes-1,conferenceSid);
			}
			break;
		case "participant-join":
			//todo:add participant's callSid and workerSid to conference_participant
			var callSid=req.query.CallSid;
			console.log("/conferenceEvents: callSid: "+callSid);
			var workerSid=await worker.getWorkerSidFromCallSid(callSid);
			console.log("/conferenceEvents: workerSid: "+workerSid);
			var insertResult=await conference.insertConferenceParticipant(workerSid,callSid,conferenceSid);
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
	console.log("/updateCallToConference: about to generate conference transfer twiml");
	var response=conference.generateConference(parameters,null);
	console.log("/updateCallToConference: conference transfer twiml: "+response.toString());
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
			response=conference.generateConference(parameters,'Thank you.  You will now be connected to the caller.');
			
			console.log("worker accepted call");
			//put caller into conference
			client.calls(parameters.callSid)
					.update({
						url:conferenceUpdateUrl,
						method:'GET'
					})
					.then(call=>{
						console.log("/agent_answer_process: inbound call has been updated to conference, now updating reservation to 'accepted'");
						clientWorkspace
							.tasks(parameters.taskSid)
							.reservations(parameters.reservationSid)
							.update({
								reservationStatus:'accepted'
							})
							.then(reservation=>{
								console.log("/agent_answer_process: reservation updated to 'accepted'");
								console.log("reservation status: "+reservation.reservationStatus);
								console.log("worker name: "+reservation.workerName);
								workerEntity=worker.updateWorkerActivityFromSid(parameters.workerSid,process.env.TWILIO_BUSY_SID,false);
							})
							.catch(err=>console.log("/agent_answer_process: error updating reservation to 'accepted': "+err));
					})
					.catch(err=>console.log("/agent_answer_process: error updating inbound call to conference: "+err));
			break;
		case '2':
			twimlBuilder.say(response,'Thanks for letting me know that you\'re not available.  Goodbye!');
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
								var updateResult=worker.updateWorkerActivityFromSid(parameters.workerSid,process.env.TWILIO_OFFLINE_SID,true);
							});
			break;
		default:
			twimlBuilder.say(response,'I\'m sorry, I didn\'t understand your response.');
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
	fromNumber=TaskAttributes.from;
	callerWorkerSid=TaskAttributes.callerWorkerSid;
	minutes=TaskAttributes.minutes;
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
		taskQueueSid:taskQueueSid,
		minutes:minutes,
		fromNumber:fromNumber,
		callerWorkerSid:callerWorkerSid
	}
	url=urlSerializer.serialize('agent_answer',parameters);	

	switch(taskQueueSid){
		case process.env.TWILIO_TASKQUEUE_SID:
			var call;
			try{
				console.log("/assignment: now redirecting caller with wait notification");
				var notifyCaller=client.calls(parameters.callSid).update({
					method:'POST',
					url:process.env.APP_BASE_URL+'/redirectToWait'
				})
				.then(call=>{
					console.log("/assignment: call redirected: call.sid "+call.sid);
				})
				.catch(err=>{
					console.log("/assignment: call redirect error: "+err);
				});

				var call=await client.calls.create({
					url:url,
					to: contact_uri,
					from: process.env.TWILIO_PHONE_NUMBER,
					method: 'GET'
				});
				console.log("/assignment: logging return value of client calls create, 'to' value "+call.to);
				var outboundCallSid=call.sid;
				var result=await worker.insertCallSidWorkerSid(outboundCallSid,workerSid);
				if (result!=null){
					console.log("/voice: insertCallSidWorkerSid failed: "+result);
				}
			}
			catch(err){
				console.log(err);
				throw(err);
			}
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
	console.log("/endCall_automatic: now hanging up");
	var response=new VoiceResponse();
	response.hangup();
	res.send(response.toString());
});

//this is the URL reached when there are no valid live agents remaining to accept the call,
//and the task falls through to the automatic queue
app.get('/automatic',async function(req,res){
	parameters=urlSerializer.deserialize(req);
	var response=new VoiceResponse();
	var url=urlSerializer.serialize('endCall_automatic',parameters);
	twimlBuilder.say(response,"We're sorry, no one is available to take your call.  I will notify you by text message when a receiver becomes available.  Good-bye.");
	response.hangup();
	//response.play(process.env.CHIME_URL);
	//response.redirect('/randomSoundLoop')
	workerSid=await worker.getWorkerSid(parameters.fromNumber);
	console.log("/automatic: workerSid: "+workerSid);
	console.log("/automatic: now creating available notification request");
	availableNotifier.create(workerSid);
	//response.hangup();
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

app.get('/processAutomatic',function(req,res){

});

app.post('/workspaceEvent',async function(req,res){
	eventType=req.body.EventType;
	eventDescription=req.body.EventDescription;
	eventDate=req.body.EventDate;
	resourceType=req.body.ResourceType;
	resourceSid=req.body.ResourceSid;
	console.log("Event Details:\n"+eventType+"\n"+eventDescription+"\n"+eventDate+"\n"+resourceType+"\n"+resourceSid);
	var workerSid;
	switch (eventType){
		case "reservation.rejected":
			console.log("/workspaceEvent: reservation rejected, worker will be set offline");
			//console.log(JSON.stringify(req.body));
			workerSid=req.body.WorkerSid;
			console.log("/workspaceEvent: workerSid "+workerSid+" now being set to offline");
			var updateResult=await worker.updateWorkerActivityFromSid(workerSid,process.env.TWILIO_OFFLINE_SID,true);
			break;
		case "worker.activity.update":
			if (eventDescription.includes("updated to Idle Activity")){
				workerSid=resourceSid;
				availableNotifier.iterateSend(workerSid);
			}
			break;
	}

	/*
	if(taskrouter!=null){
		try{
			taskrouter.logEvent(reqBody);
		}
		catch(err){
			console.log("/workspaceEvent: Event logging error: "+err);
		}
	}
	else{
		console.log("/workspaceEvent: taskrouter is null, no event logged");
	}
	*/

	res.type('application/json');
	res.status(204).send({error:'error occurred in processing workspace event callback'});
});

app.listen(http_port,async ()=>{
	console.log(`app listening on port ${http_port}`);
	console.log("Configuring incoming call urls...");
	baseUrl=process.env.APP_BASE_URL;
	incoming_phone_number=await client.incomingPhoneNumbers(process.env.TWILIO_PHONE_NUMBER_SID)
															.update({
																smsUrl:baseUrl+"/sms",
																voiceUrl:baseUrl+"/voice",
																statusCallback:baseUrl+"/incomingCallEvents"
															});
	console.log(incoming_phone_number.friendlyName);
		
	console.log("Configuring workspace...");
	clientWorkspace=client.taskrouter.workspaces(workspaceSid);
	worker=new Worker(clientWorkspace);
	sms=new Sms(worker);
	taskrouter=new Taskrouter(clientWorkspace);
	conference=new Conference(client,clientWorkspace);
	taskrouter.configureWorkspace();
	workflow=await taskrouter.configureWorkflow();
	console.log("returned from configureWorkflow");
	textsplitter.splitTextFromFile("critiqueofpurereason.txt");	
});

