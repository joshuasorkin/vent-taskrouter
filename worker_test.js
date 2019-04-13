require('env2')('.env');
const Worker=require('./worker');
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const client=require('twilio')(accountSid,authToken);


clientWorkspace=client.taskrouter.workspaces(workspaceSid);
var workerObj=new Worker(clientWorkspace);

//workerObj.updateWorkerNameFromSid(null,"helloNewWorker");
var result=workerObj.updateContact_uri("+15105753138","+15105753139");
console.log("result: "+result);

//worker.addAllWorkersToDatabase();
//workerObj.updateWorkerAddAttribute(null,null,null);
