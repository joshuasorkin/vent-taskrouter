const Password=require('./password');
var passwordObj=new Password();

var args=process.argv.slice(2);
var workerSid=args[0];
var password=args[1];
var adminTask=args[2];

async function test(workerSid,password,adminTask){
    
    var insertResult=await passwordObj.insertPassword(workerSid,password,adminTask);
    var matchResult=await passwordObj.verifyPassword(workerSid,password,adminTask);
    console.log("matchResult: "+matchResult);
    matchResult=await passwordObj.verifyPassword(workerSid,"bogus",adminTask);
    console.log("matchResult (bogus): "+matchResult);
}
matchResult=test(workerSid,password,adminTask);
