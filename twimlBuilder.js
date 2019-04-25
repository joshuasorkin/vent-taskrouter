//this class is for building various types of
//frequently used twiml blocks
//the idea is that rather than redirecting to an endpoint that then returns the
//twiml block, instead we just add the twiml block on in whatever endpoint we're already in

require('env2')('.env');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const twilio=require('twilio');

class TwimlBuilder{
    constructor(){
        this.voice=process.env.TWILIO_SAY_VOICE;
        this.language=process.env.TWILIO_SAY_LANGUAGE;
    }

    //add a say() in the configured voice and language
    say(response,message){
        response.say({
            voice:this.voice,
            language:this.language
        },message);

    }

    //add a gather input that gets a number of minutes
    //and passes them to /processGatherConferenceMinutes
    gatherConferenceMinutes(response,minMinutes,maxMinutes){
        const gather=response.gather({
            input:'dtmf',
            timeout:5,
            action:'/processGatherConferenceMinutes'
        });
        this.say(gather,'How many minutes of conversation would you like?  Enter '+minMinutes+' to '+maxMinutes+', followed by the pound key.');
        this.say(response,"I didn't receive any input.  Good-bye.");
    }

}

module.exports=TwimlBuilder;