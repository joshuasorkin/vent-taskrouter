const Bcrypt=require('bcrypt');
const Database=require('./database')
var database=new Database();

class Password{

    async insertPassword(workerSid,password,adminTask){
        var salt;
        var passwordHash;
        var workerId;
        var adminTaskId;
        const promiseResults=await Promise.all([
            Bcrypt.genSalt(),
            database.getWorkerIdFromSid(workerSid),
            database.getAdminTaskId(adminTask)
        ]);
        salt=promiseResults[0];
        workerId=promiseResults[1];
        adminTaskId=promiseResults[2];
        console.log("insertPassword: salt: "+salt);
        console.log("insertPassword: workerId: "+workerId);
        console.log("insertPassword: adminTaskId: "+adminTaskId);
        try{
            passwordHash=await Bcrypt.hash(password,salt);
            console.log("insertPassword: passwordHash "+passwordHash);
        }
        catch(err){
            throw "insertPassword: hash error: "+err;
        }
        var insertResult=await database.insertAdminPassword(workerId,salt,passwordHash,taskId);
        console.log("insertPassword: insertResult: "+insertResult);
    }
}

module.exports=Password;