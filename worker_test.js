
require('env2')('.env');

console.log("requiring Worker...");
const Worker=require('./worker');
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
console.log("requiring Twilio client...");
const client=require('twilio')(accountSid,authToken);

console.log("obtaining workspace...");
clientWorkspace=client.taskrouter.workspaces(workspaceSid);


async function getWorkerList(){
    var index;
    console.log("getting worker list...");

    var pushResult=await clientWorkspace.workers
			.each(worker=>{
				workerList.push(worker);
			});
	return workerList;

    /*
    var workerList=await clientWorkspace.workers.list();
    var workerObj;
    for(index=0;index<workerList.length;index++){
        workerObj=workerList[index];
        console.log(workerObj.friendlyName+" "+workerObj.sid);
    }
    */
}


getWorkerList();




/*
var workerObj=new Worker(clientWorkspace);
var args=process.argv.slice(2);
var workerSid=args[0];

async function getCount(){
    var result=await workerObj.getCountOfIdleWorkers();
    console.log("count of idle workers: "+result);
}

getCount();
*/


/*
async function select(callSid){
    var result=await workerObj.getWorkerSidFromCallSid(callSid);
    console.log(result);
}


async function insert(callSid,workerSid){
    var result=await workerObj.insertCallSidWorkerSid(callSid,workerSid);
    console.log("result: "+result);
    console.log("this happens after the result.");
}

async function update(workerSid){
    var result;
    var workerEntity=await clientWorkspace.workers('WK425caf724515f59b5620fba1af1e1fd8')
    .fetch();
    workerObj.updateWorkerAddAttributeArrayValue(workerEntity,"do_not_contact",workerSid);
}

//insert("callsidXIOSFDI",workerSid);

//workerObj.updateWorkerNameFromSid(null,"helloNewWorker");


//workerObj.createWorker("abcxisiwe","zzyswiew");
//update(workerSid);

//worker.addAllWorkersToDatabase();
//workerObj.updateWorkerAddAttribute(null,null,null);
*/