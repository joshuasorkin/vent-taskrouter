var fs=require('fs');

class Textsplitter{
    getTextFromFile(filename){
        
        fs.readFile(filename,function(err,buf){
            if(err){
                console.log(err);
            }
            else{
                console.log(buf);
            }
        })
        /*
        fs.readFile(filename)
        .then(buf=>{
            console.log(buf);
            return buf;
        })
        .catch(err=>console.log("getTextFromFile: error: "+err));
        */
    }

}

module.exports=Textsplitter