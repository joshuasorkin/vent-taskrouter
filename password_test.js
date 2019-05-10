const Password=require('./password');
var passwordObj=new Password();

var args=process.argv.slice(2);
var workerSid=args[0];
var adminTask=args[1];
var password1=args[2];
var password2=args[3];


async function test(workerSid,password1,password2,adminTask){
    
    var insertResult=await passwordObj.insertPassword(workerSid,password1,adminTask);
    var updateResult=await passwordObj.updatePassword(workerSid,password2,adminTask);
    var matchResult=await passwordObj.verifyPassword(workerSid,password2,adminTask);
    console.log("matchResult: "+matchResult);
    matchResult=await passwordObj.verifyPassword(workerSid,password1,adminTask);
    console.log("matchResult (bogus): "+matchResult);
}
matchResult=test(workerSid,password1,password2,adminTask);
