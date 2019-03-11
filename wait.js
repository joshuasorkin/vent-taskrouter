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

    randomNaturalNumber(max){
        if(max<1){
            throw "randomNaturalNumber error: max "+max+" is less than 1"; 
        }
        return Math.floor(Math.random()*max)+1;
    }

    randomPhoneme(){
        var randomConsonant=this.randomElement(this.consonant);
        var randomVowel=this.randomElement(this.vowel);
        var output=randomConsonant+randomVowel;
        return output;
    }

    randomWord(maxPhonemeCount){
        var word="";
        var x;
        var phonemeCount=this.randomNaturalNumber(maxPhonemeCount);
        for (x=1;x<=phonemeCount;x++){
            word+=this.randomPhoneme();
        }
        return word;
    }

    randomSentence(maxPhonemeCount,maxWordCount){
        var sentence="";
        var x;
        var wordCount=this.randomNaturalNumber(maxWordCount);
        for (x=1;x<=wordCount;x++){
            sentence+=this.randomWord(maxPhonemeCount)+" ";
        }
        return sentence;
    }

}

module.exports=Wait;