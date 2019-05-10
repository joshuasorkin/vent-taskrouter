const Bcrypt=require('bcrypt');

class Password{

    constructor(database){
        this.database=database;
    }

    async insertPassword(workerSid,password){
        var salt;
        var passwordHash;
        var workerId;
        
        const [salt,workerId]=await Promise.all(
            Bcrypt.genSalt(),
            this.database.getWorkerIdFromSid(workerSid)
        );
        console.log("insertPassword: salt: "+salt);
        console.log("insertPassword: workerId: "+workerId);
        try{
            passwordHash=await Bcrypt.hash(password,salt);
        }
        catch(err){
            throw "insertPassword: hash error: "+err;
        }
        
    }
}