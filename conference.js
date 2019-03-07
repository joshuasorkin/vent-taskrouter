const UrlSerializer=require('./urlSerializer');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const TwimlBuilder=require('./twimlBuilder');
require('env2')('.env');

class Conference{
	
	constructor(client,workspace){
		this.client=client;
		this.workspace=workspace;
		this.urlSerializer=new UrlSerializer();
		this.twimlBuilder=new TwimlBuilder();
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

	setTimedEndConference(initialMinutes,conferenceSid){
		setTimeout(this.endConferenceTimeUp.bind(this),initialMinutes*60000,conferenceSid);
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

	endConference_update(conferenceSid){
		this.client.conferences(conferenceSid)
		.update({
			status:'completed'
		});
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


	
}

module.exports=Conference;