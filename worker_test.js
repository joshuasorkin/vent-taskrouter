require('env2')('.env');
const Worker=require('./worker');
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
const client=require('twilio')(accountSid,authToken);


clientWorkspace=client.taskrouter.workspaces(workspaceSid);
var workerObj=new Worker(clientWorkspace);

//workerObj.updateWorkerNameFromSid(null,"helloNewWorker");
async function update(){
    var result;
    clientWorkspace.workers
    .each(worker=>{
        result=await workerObj.updateWorkerAddAttributeArrayValue(worker,"do_not_contact",null);
    })
}

update();

//worker.addAllWorkersToDatabase();
//workerObj.updateWorkerAddAttribute(null,null,null);
