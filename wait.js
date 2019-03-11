//class for providing content while user is on hold

class Wait{
    constructor(){
        this.consonantStr="bcdfghjklmnpqrstvwxz";
        this.vowelStr="aeiouy";
        this.consonant=this.consonantStr.split("");
        this.vowel=this.vowelStr.split("");
    }

    randomElement(arr){
        return arr[Math.floor(Math.random()*arr.length)];
    }

    randomPhoneme(){
        var randomConsonant=this.randomElement(this.consonant);
        var randomVowel=this.randomElement(this.vowel);
        var output=randomConsonant+randomVowel;
        return output;
    }

    randomWord(phonemeCount){
        var word="";
        var x;
        for (x=1;x<=phonemeCount;x++){
            word+=this.randomPhoneme();
        }
        return word;
    }

}

module.exports=Wait;