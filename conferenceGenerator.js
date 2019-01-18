const UrlSerializer=require('./urlSerializer');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
require('env2')('.env');

class ConferenceGenerator{
	
	constructor(){
		this.urlSerializer=new UrlSerializer();
	}
	generateConference(parameters,initialSay){
		var response=new VoiceResponse();
		if (initialSay!=null){
			response.say(initialSay);
		}
		const dial=response.dial();
		conferenceCallbackUrl=this.urlSerializer.serialize('conferenceEvents',parameters,'parameters');
		dial.conference({
			waitUrl:process.env.WAIT_URL,
			statusCallbackEvent:[
				'start',
				'end',
				'join'
			],
			statusCallback:conferenceCallbackUrl
		},parameters.reservationSid);
		return response;	
	}
	
}

module.exports=ConferenceGenerator;