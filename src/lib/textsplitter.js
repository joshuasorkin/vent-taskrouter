const fs=require('fs');
const util=require('util');

class Textsplitter{

    constructor(){
        this.filetextArray=null;
    }

    async getTextFromFile(filename){
        fs.readFileAsync=util.promisify(fs.readFile);
        var buf=await fs.readFileAsync(filename,"utf-8")
        return buf;


        /*
        fs.readFile(filename,"utf-8",function(err,buf){
            if(err){
                return null;
            }
            else{
                console.log(buf);
                return buf;
            }
        });
        */
    }

    async splitTextFromFile(filename){
        var filetext=await this.getTextFromFile(filename);
        if (filetext==null){
            return null;
        }
        else{
            var rawText=filetext;
            rawText = rawText.replace(/\r\n/g, "\n");
            rawText = rawText.replace(/\n\r/g, "\n");
            rawText = rawText.replace(/\r/g, "\n");

            this.filetextArray=rawText.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            return this.filetextArray;
        }
    }

    randomSentenceFromFiletextArray(){
        var sentenceList=this.filetextArray;
        var randomIndex=Math.floor(Math.random()*this.filetextArray.length);
        var sentence = sentenceList[randomIndex];
        return sentence;
    }

}

module.exports=Textsplitter