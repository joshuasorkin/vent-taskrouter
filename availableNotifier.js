const Database=require('./database');
const client=require('twilio')(accountSid,authToken);


//todo: shouldn't have separate connection to database in different objects, instead
//should pass in the same instance of Database to constructors for e.g. AvailableNotifier and Worker
//maybe same for Twilio client?
var database=new Database();

class AvailableNotifier{

    create(workerSid){
        var result=await database.createAvailableNotificationRequest(workerSid);
        return result;
    }

    

}