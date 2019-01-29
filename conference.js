const UrlSerializer=require('./urlSerializer');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
require('env2')('.env');

class ConferenceGenerator{
	
	constructor(client){
		this.client=client;
		this.urlSerializer=new UrlSerializer();
	}
	generateConference(parameters,initialSay){
		var response=new VoiceResponse();
		if (initialSay!=null){
			response.say(initialSay);
		}
		const dial=response.dial();
		//var conferenceCallbackUrl=this.urlSerializer.serialize('conferenceEvents',parameters,'parameters');
		var conferenceCallbackUrl=process.env.APP_BASE_URL+'/conferenceEvents';
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
			statusCallbackMethod:'POST'
		},parameters.reservationSid);
		return response;	
	}

	announce(conferenceSid,timeRemaining){
		var parameters={
			timeRemaining:timeRemaining
		}
		var url=this.urlSerializer.serialize('conferenceAnnounce',parameters);
		console.log("conference.announce url: "+url);
		this.client.conferences(conferenceSid)
			.update({
				announceUrl:url
			})
			.then(conference=>console.log(conference.friendlyName));
	}


	
}

module.exports=ConferenceGenerator;