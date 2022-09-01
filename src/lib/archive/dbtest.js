const Database = require("../../config/database");
require("env2")(".env");

var db = Database.getInstance();
var args = process.argv.slice(2);
var workerSid = args[0];

async function insert() {
  var result = await db.insertConferenceParticipant(
    workerSid,
    "callSid101",
    "conferenceSid12345"
  );
  return result;
}

console.log(insert());
