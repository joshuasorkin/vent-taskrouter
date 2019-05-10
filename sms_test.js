const Sms=require('./sms');

var args=process.argv.slice(2);
var friendlyName=args[0];
var contact_uri=args[1];
var sms=new Sms();
sms.sendAddNotification(friendlyName,contact_uri);

