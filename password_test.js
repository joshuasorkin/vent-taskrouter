const Password=require('./password');
var password=new Password();

var args=process.argv.slice(2);
var workerSid=args[0];
var password=args[1];
var adminTask=args[2];
password.insertPassword(workerSid,password,adminTask);