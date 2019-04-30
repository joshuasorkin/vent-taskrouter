const UrlSerializer=require('./urlSerializer');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const TwimlBuilder=require('./twimlBuilder');
const Database=require('./database');
require('env2')('.env');

class Conference{
	
	constructor(client,workspace){
		this.client=client;
		this.workspace=workspace;
		this.urlSerializer=new UrlSerializer();
		this.twimlBuilder=new TwimlBuilder();
		this.database=new Database();
	}
	generateConference(parameters,initialSay){
		var response=new VoiceResponse();
		if (initialSay!=null){
			this.twimlBuilder.say(response,initialSay);
		}
		const dial=response.dial();

		var conferenceCallbackUrl=this.urlSerializer.serialize('conferenceEvents',parameters);
		//var conferenceCallbackUrl=process.env.APP_BASE_URL+'/conferenceEvents';
		console.log("conferenceGenerator's conferenceCallbackUrl: "+conferenceCallbackUrl);
		dial.conference({
			waitUrl:process.env.WAIT_URL_BUCKET,
			statusCallbackEvent:[
				'start',
				'end',
				'join',
				'leave'
			],
			statusCallback:conferenceCallbackUrl,
			statusCallbackMethod:'GET'
		},parameters.reservationSid);
		return response;	
	}

	getParticipants(conferenceSid){
		return this.client.conferences(conferenceSid)
		.participants;
	}

	announce(conferenceSid,timeRemaining){
		var parameters={
			timeRemaining:timeRemaining
		}
		console.log("announce parameters: "+JSON.stringify(parameters));
		var url=this.urlSerializer.serialize('conferenceAnnounceTime',parameters);
		console.log("conference.announce url: "+url);
		this.client.conferences(conferenceSid)
			.update({
				announceUrl:url,
				announceMethod:'GET'
			})
			.then(conference=>console.log(conference.friendlyName));
	}

	//for setTimedAnnounce and setTimedEndConference,
	//.bind(this) is used because the callback will be run outside the scope of conference
	//class' "this" and need to attach this in-scope value to the callback
	setTimedAnnounce(initialMinutes,minutesToElapse,conferenceSid){
		var minutesRemaining=initialMinutes-minutesToElapse;
		console.log("setTimedAnnounce: minutesRemaining: "+minutesRemaining);
		setTimeout(this.announce.bind(this),minutesToElapse*60000,conferenceSid,minutesRemaining);
	}

	setTimedEndConference(initialMinutes,parameters){
		setTimeout(this.endConferenceAnnounce.bind(this),initialMinutes*60000,parameters,"conferenceAnnounceEnd_timeUp");
	}

	endConferenceTimeUp(conferenceSid){
		
		this.client.conferences(conferenceSid)
		.update({
			status:'completed'
		});
	}

	endConferenceAnnounce(parameters,conferenceEnd_endPoint){
		var announceUrl=this.urlSerializer.serialize(conferenceEnd_endPoint,parameters);
		console.log("conference end announceUrl: "+announceUrl);
		
		this.client.conferences(parameters.conferenceSid)
		.update({
			announceUrl:announceUrl,
			announceMethod:'GET'
		})
		.catch(err=>console.log("endConferenceAnnounce: error updating: "+err));
	}

	async endConference_update(conferenceSid){
		var participants=await this.client.conferences(conferenceSid).participants
								.list();
		var redirectResult=await this.postConferenceRedirectAll(participants);
		console.log("endConference_update: about to update conference to completed");
		this.client.conferences(conferenceSid)
		.update({
			status:'completed'
		})
		.then(conference=>console.log("endConference_update: successfully set conference to completed"))
		.catch(err=>console.log("endConference_update: error: "+err));
	}

	async postConferenceRedirectAll(participants){
		var index;
		for(index=0;index<participants.length;index++){
			var call=await this.postConferenceRedirect(participants[index]);
		}
	}

	async postConferenceRedirect(participant){
		try{
			console.log("endConference_update: participant callSid: "+participant.callSid);
			var call=await this.client.calls(participant.callSid)
			.update({
				method:'POST',
				url:process.env.APP_BASE_URL+'/postConferenceIVR'
			});
			console.log("endConference_update: redirected call with sid "+call.sid);
			return call;
		}
		catch(err){
			console.log("endConference_update: error redirecting call: "+err);
			return null;
		}

	}


	endConferenceTask(taskSid){
		console.log("conference: running endConferenceTask");
		this.workspace.tasks(taskSid)
			.update({
				assignmentStatus:'completed',
				reason:'conference ended'
			})
			.then(task=>{
				//this.endConference(task,conferenceSid,conferenceEnd_endpoint);
				console.log("endConferenceTask: task status "+task.assignmentStatus);
			})
			.catch(err=>console.log("conference task update error: "+err));
	}

	async insertConferenceParticipant(workerSid,callSid,conferenceSid){
		try{
			var result=await database.insertConferenceParticipant(workerSid,callSid,conferenceSid);
			if(result==",1"){
				return null;
			}
			else{
				return result;
			}
		}
		catch(err){
			console.log("insertConferenceParticipant: error: "+err);
			throw(err);
		}
	}


	
}

module.exports=Conference;