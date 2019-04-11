var fs=require('fs');

class Textsplitter{
    getTextFromFile(filename){
        
        fs.readFile(filename,"utf-8",function(err,buf){
            if(err){
                return null;
            }
            else{
                return buf;
            }
        });
    }

    async splitTextFromFile(filename){
        var filetext=await this.getTextFromFile(filename);
        console.log(filetext);
        if (filetext==null){
            return null;
        }
        else{
            var filetextArray=filetext.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            return filetextArray;
        }
    }

}

module.exports=Textsplitter