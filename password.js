const Bcrypt=require('bcrypt');
const Database=require('./database')
var database=new Database();

class Password{

    constructor(){
        this.saltRounds=10;
    }

    async insertPassword(workerSid,password,adminTask){
        var salt;
        var passwordHash;
        var workerId;
        var adminTaskId;
        const promiseResults=await Promise.all([
            Bcrypt.genSalt(this.saltRounds),
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
        var insertResult=await database.insertAdminPassword(workerId,salt,passwordHash,adminTaskId);
        console.log("insertPassword: insertResult: "+insertResult);
    }

    async verifyPassword(workerSid,password,adminTask){
        var passwordHash;
        var workerId;
        var adminTaskId;
        const promiseResults=await Promise.all([
            database.getWorkerIdFromSid(workerSid),
            database.getAdminTaskId(adminTask)
        ]);
        workerId=promiseResults[0];
        adminTaskId=promiseResults[1];
        console.log("verifyPassword: workerId: "+workerId);
        console.log("verifyPassword: adminTaskId: "+adminTaskId);
        try{
            passwordHash=database.getPasswordHash(workerId,adminTaskId);
        }
        catch(err){
            console.log("verifyPassword: getPasswordHash error: "+err);
        }
        return Bcrypt.compare(password,passwordHash);
    }
}

module.exports=Password;