const Database=require("./database");
require('env2')('.env');


var db=new Database();
worker={
	contact_uri:'+15105753138',
	sid:'3i9un9384r8939'
}
db.createWorker(worker)
.then(result=>console.log(result))
.catch(err=>console.log("error: "+err);

/*
db.getAvailableAgent(process.env.testgoodphonenumber)ge
.then(res=>{
	console.log(res[0].toagentphonenumber);
})
.catch(err=>{
	console.log("error: "+err);
});
*/