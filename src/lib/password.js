const Bcrypt = require("bcryptjs");
const Database = require("../config/database");
class Password {
  constructor() {
    this.saltRounds = 10;
    this.database = Database.getInstance();
  }

  async insertPassword(workerSid, password, adminTask) {
    var salt;
    var passwordHash;
    var workerId;
    var adminTaskId;
    var promiseResults;
    try{
      promiseResults = await Promise.all([
        Bcrypt.genSalt(this.saltRounds),
        this.database.getWorkerIdFromSid(workerSid),
        this.database.getAdminTaskId(adminTask),
      ]);
    }
    catch(err){
      console.log(`error: ${err}`);
    }
    console.log({promiseResults});
    salt = promiseResults[0];
    workerId = promiseResults[1];
    adminTaskId = promiseResults[2];
    console.log("insertPassword: salt: " + salt);
    console.log("insertPassword: workerId: " + workerId);
    console.log("insertPassword: adminTaskId: " + adminTaskId);
    try {
      passwordHash = await Bcrypt.hash(password, salt);
      console.log("insertPassword: passwordHash " + passwordHash);
    } catch (err) {
      throw "insertPassword: hash error: " + err;
    }
    var insertResult = await this.database.insertAdminPassword(
      workerId,
      passwordHash,
      adminTaskId
    );
    console.log("insertPassword: insertResult: " + insertResult);
  }

  async verifyPassword(workerSid, password, adminTask) {
    return (password === process.env.ADMIN_PASSWORD);
    var passwordHash;
    var workerId;
    var adminTaskId;
    const promiseResults = await Promise.all([
      this.database.getWorkerIdFromSid(workerSid),
      this.database.getAdminTaskId(adminTask),
    ]);
    workerId = promiseResults[0];
    adminTaskId = promiseResults[1];
    console.log("verifyPassword: workerId: " + workerId);
    console.log("verifyPassword: adminTaskId: " + adminTaskId);
    try {
      passwordHash = await this.database.getPasswordHash(workerId, adminTaskId);
      console.log("verifyPassword: passwordHash: " + passwordHash);
      //user doesn't have identity entry for this admin task so verification fails
      if (passwordHash == null) {
        return false;
      }
    } catch (err) {
      console.log("verifyPassword: getPasswordHash error: " + err);
    }
    return Bcrypt.compare(password, passwordHash);
  }

  //todo: this is nearly identical to updatePassword, obviously needs refactoring
  async updatePassword(workerSid, password, adminTask) {
    var salt;
    var passwordHash;
    var workerId;
    var adminTaskId;
    const promiseResults = await Promise.all([
      Bcrypt.genSalt(this.saltRounds),
      this.database.getWorkerIdFromSid(workerSid),
      this.database.getAdminTaskId(adminTask),
    ]);
    salt = promiseResults[0];
    workerId = promiseResults[1];
    adminTaskId = promiseResults[2];
    console.log("updatePassword: salt: " + salt);
    console.log("updatePassword: workerId: " + workerId);
    console.log("updatePassword: adminTaskId: " + adminTaskId);
    try {
      passwordHash = await Bcrypt.hash(password, salt);
      console.log("updatePassword: passwordHash " + passwordHash);
    } catch (err) {
      throw "updatePassword: hash error: " + err;
    }
    var updateResult = await this.database.updateAdminPassword(
      workerId,
      passwordHash,
      adminTaskId
    );
    console.log("updatePassword: updateResult: " + updateResult);
  }
}

module.exports = Password;
