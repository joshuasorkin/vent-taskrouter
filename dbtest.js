const Database=require("./database");
require('env2')('.env');


var db=new Database();
/*
worker={
	contact_uri:'+15105753138',
	sid:'3i9un9384r8939'
}
db.getWorkerSid(worker.contact_uri)
.then(result=>console.log(result));
*/

//db.updateWorkerContact_uri("+15105753139","+15105753138")

db.updateNotificationToSent("WK425caf724515f59b5620fba1af1e1fd8")
.then(result=>{
	console.log("dbtest: "+result);
	db.updateNotificationToSent("abcxy")
	.then(result=>{
		console.log("dbtest: "+result);
	})
});

/*
db.createAvailableNotificationRequest("WK425caf724515f59b5620fba1af1e1fd8")
.then(result=>{
	if (result==null){
		console.log("successfully created request");
	}
	else{
		console.log("problem creating request: "+result);
	}
	console.log(result);
	console.log("moving on to next worker...");
	db.createAvailableNotificationRequest("WK007e94671dc41a73ee8955aacf6ec743");
});
*/

/*
db.getAvailableAgent(process.env.testgoodphonenumber)ge
.then(res=>{
	console.log(res[0].toagentphonenumber);
})
.catch(err=>{
	console.log("error: "+err);
});
*/