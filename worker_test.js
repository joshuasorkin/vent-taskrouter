require('env2')('.env');
const Worker=require('./worker');
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const client=require('twilio')(accountSid,authToken);


clientWorkspace=client.taskrouter.workspaces(workspaceSid);
var workerObj=new Worker(clientWorkspace);
var args=process.argv.slice(2);
var workerSid=args[0];

//workerObj.updateWorkerNameFromSid(null,"helloNewWorker");
async function update(workerSid){
    var result;
    var workerEntity=await clientWorkspace.workers('WK425caf724515f59b5620fba1af1e1fd8')
    .fetch();
    workerObj.updateWorkerAddAttributeArrayValue(workerEntity,"do_not_contact",workerSid);
}



//workerObj.createWorker("abcxisiwe","zzyswiew");
update(workerSid);

//worker.addAllWorkersToDatabase();
//workerObj.updateWorkerAddAttribute(null,null,null);
