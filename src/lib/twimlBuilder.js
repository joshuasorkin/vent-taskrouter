//this class is for building various types of
//frequently used twiml blocks
//the idea is that rather than redirecting to an endpoint that then returns the
//twiml block, instead we just add the twiml block on in whatever endpoint we're already in

require('env2')('.env');
const VoiceResponse=require('twilio').twiml.VoiceResponse;
const twilio=require('twilio');
const UrlSerializer=require('./urlSerializer');
var urlSerializer=new UrlSerializer();

class TwimlBuilder{
    constructor(){
        this.voice=process.env.TWILIO_SAY_VOICE;
        this.language=process.env.TWILIO_SAY_LANGUAGE;
        this.rate=process.env.TWILIO_SAY_PROSODY_RATE;
    }

    //add a say() in the configured voice and language
    say(response,message){
        const sayObj=response.say({
            voice:this.voice
            //language:this.language
        });
        sayObj.ssmlProsody({
            rate:this.rate
        },message);

    }

    sayReading(response,message){
        const sayObj=response.say({
            voice:process.env.TWILIO_SAY_VOICE_READING
            //language:this.language
        });
        sayObj.ssmlProsody({
            rate:this.rate
        },message);

    }

    //add a gather input that gets a number of minutes
    //and passes them to /processGatherConferenceMinutes
    gatherConferenceMinutes(response,minMinutes,maxMinutes,parameters){
        var url=urlSerializer.serialize('processGatherConferenceMinutes',parameters);
        const gather=response.gather({
            input:'dtmf speech',
            timeout:5,
            action:url,
            hints:"1,2,3,4,5,6,7,8,9,10",
            speechTimeout:"auto",
            speechModel:"numbers_and_commands",
            method:'GET'
        });
        this.playChime(gather);
        if (parameters.attempts<2){
            this.say(gather, "Welcome to Vent production. ");
            this.say(gather,"Hello, "+parameters.friendlyName);
        }
        gather.pause({
            length:1
        });
        this.say(gather,'How many minutes would you like?  Say, or enter, '+minMinutes+' to '+maxMinutes+', followed by the pound key.');
        if (parameters.attempts<2){
            parameters.attempts++;
            var redirectUrl=urlSerializer.serialize('gatherConferenceMinutes',parameters);
            response.redirect({
                method:'GET'
            },redirectUrl);
        }
        else{
            this.say(response,"I didn't receive any input.  Good-bye.");
        }
    }

    playChime(response){
        response.play(process.env.CHIME_URL);
    }

}

module.exports=TwimlBuilder;