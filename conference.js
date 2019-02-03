const UrlSerializer=require('./urlSerializer');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
require('env2')('.env');

class Conference{
	
	constructor(client,workspace){
		this.client=client;
		this.workspace=workspace;
		this.urlSerializer=new UrlSerializer();
	}
	generateConference(parameters,initialSay){
		var response=new VoiceResponse();
		if (initialSay!=null){
			response.say(initialSay);
		}
		const dial=response.dial();
		var conferenceCallbackUrl=this.urlSerializer.serialize('conferenceEvents',parameters,'parameters');
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

	announce(conferenceSid,timeRemaining){
		var parameters={
			timeRemaining:timeRemaining
		}
		var url=this.urlSerializer.serialize('conferenceAnnounceTime',parameters);
		console.log("conference.announce url: "+url);
		this.client.conferences(conferenceSid)
			.update({
				announceUrl:url,
				announceMethod:'GET'
			})
			.then(conference=>console.log(conference.friendlyName));
	}

	endConference(task,conferenceSid){
		console.log("task sid: "+task.sid);
		var announceUrl=process.env.APP_BASE_URL+'/conferenceAnnounceEnd';
		console.log("conference end announceUrl: "+announceUrl);
		this.client.conferences(conferenceSid)
		.update({
			announceUrl:announceUrl,
			announceMethod:'POST'
		})
		.then(conference=>{
			console.log("conference name: "+conference.friendlyName);
			this.client.conferences(conference.sid)
			.update({
				status:'completed'
			});
		})
		.catch(err=>console.log("conference update error: "+err));
	}

	endConferenceTask(conferenceSid,taskSid){
		console.log("conference: running endConference");
		this.workspace.tasks(taskSid)
			.update({
				assignmentStatus:'completed',
				reason:'conference ended'
			})
			.then(task=>{
				endConference(task,conferenceSid);
			})
			.catch(err=>console.log("conference task update error: "+err));
	}


	
}

module.exports=Conference;