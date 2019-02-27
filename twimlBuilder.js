//this class is for building various types of
//frequently used twiml blocks

require('env2')('.env');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const twilio=require('twilio');

class TwimlBuilder{
    constructor(){
        this.voice=process.env.TWILIO_SAY_VOICE;
        this.language=process.env.TWILIO_SAY_LANGUAGE;
    }

    say(response,message){
        response.say({
            voice:this.voice,
            language:this.language
        },message);

    }

}

module.exports=TwimlBuilder;