var tone=require('tonegenerator');
var wav=require('wav');

class SoundGenerator{
    soundFile(){
        var writer=new wav.Writer();
        var noteCount=getRandomInt(1,10);
        var index;
        var noteLength;
        var noteFrequency;
        for(index=0;index<noteCount;index++){
            noteLength=this.getRandomInt(1,3);
            noteFrequency=this.getRandomInt(20,20000);
            writer.write(new Buffer(tone(noteFrequency,noteLength)));
        }

    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

}

module.exports=SoundGenerator;