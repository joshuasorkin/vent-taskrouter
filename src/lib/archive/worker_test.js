require("env2")(".env");

console.log("requiring Worker...");
const Worker = require("../worker");
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const workspaceSid = process.env.TWILIO_WORKSPACE_SID; //add your workspace sid
console.log("requiring Twilio client...");
const client = require("twilio")(accountSid, authToken);

console.log("obtaining workspace...");
clientWorkspace = client.taskrouter.workspaces(workspaceSid);

async function getWorkerList() {
  var index;
  console.log("getting worker list...");

  var pushResult = await clientWorkspace.workers.each((worker) => {
    workerList.push(worker);
  });
  return workerList;
}

getWorkerList();
