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

	endConference(conferenceSid,taskSid){
		this.workspace.tasks(parameters.taskSid)
			.update({
				assignmentStatus:'complete',
				reason:'conference ended'
			})
			.then(task=>{
				console.log("task sid: "+task.sid);
				this.client.conferences(conferenceSid)
				.update({
					announceUrl:process.env.APP_BASE_URL+'/conferenceAnnounceEnd',
					announceMethod:'POST'
				})
				.then(conference=>{
					console.log("conference name: "+conference.friendlyName);
					this.client.conferences(conference.sid)
					.update({
						status:'completed'
					});

				})

			})
	}


	
}

module.exports=Conference;