require("env2")(".env");
const Sequelize = require("sequelize");

class Database {
  
  constructor() {
    if (Database._instance) {
      throw new Error(
        "Database connection can't be instantiated more than once."
      );
    }

    this.sequelize = new Sequelize(
      process.env.database,
      process.env.username,
      process.env.password,
      {
        dialect: "postgres",
        dialectOptions: {
          ssl: this.parseSSLEnvVar(),
        },
      }
    );

    try {
      this.sequelize.authenticate();
      console.log("Database onnection has been established successfully.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }

    Database._instance = this;
  }

  static getInstance() {
    return Database._instance;
  }

  parseSSLEnvVar() {
    this.sequelize_ssl = process.env.SEQUELIZE_SSL.toLowerCase();
    switch (this.sequelize_ssl) {
      case "true":
        return true;
        break;
      case "false":
        return false;
        break;
      default:
        throw (
          "Invalid value '" +
          process.env.SEQUELIZE_SSL +
          "' for process.env.SEQUELIZE_SSL, must be 'true' or 'false'"
        );
    }
  }

  createWorker(worker) {
    const attributes = JSON.parse(worker.attributes);
    const contact_uri = attributes.contact_uri;
    console.log("createWorker: now attempting sequelize insert worker");
    return this.sequelize.query(
      "insert into worker (contact_uri,sid) values ('" +
        contact_uri +
        "','" +
        worker.sid +
        "')"
    );
  }

  createWorkerApply(contact_uri, friendlyName, authenticateCode) {
    console.log("createWorkerApply: now attempting sequelize insert row");
    return this.sequelize.query(
      "insert into workerapply (contact_uri,friendlyName,authenticateCode,status) values(?,?,?,'incomplete')",
      {
        replacements: [contact_uri, friendlyName, authenticateCode],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  //following select query on Worker table, returns a promise as follows:
  //callerPhoneNumber found: caller's data row
  //callerPhoneNumber not found: null
  async getWorkerSid(contact_uri) {
    var workerRow = await this.getRowFromWorkerTable(contact_uri);
    if (workerRow.length == 0) {
      return null;
    } else {
      return workerRow[0].sid;
    }
  }

  getRowFromWorkerTable(contact_uri) {
    return this.sequelize.query(
      "select * from worker where contact_uri='" + contact_uri + "'",
      { type: this.sequelize.QueryTypes.SELECT }
    );
  }

  async updateWorkerContact_uri(oldContact_uri, newContact_uri) {
    var result = await this.sequelize.query(
      "update worker set contact_uri='" +
        newContact_uri +
        "' where contact_uri='" +
        oldContact_uri +
        "'"
    );
    if (result[1].rowCount == 0) {
      return "updateWorkerContact_uri: error: no row updated";
    } else {
      return null;
    }
  }

  //adds an entry to the available_notification_request table, using workerSid to look up worker's Id number
  //returns null if successful, otherwise returns string with error
  async createAvailableNotificationRequest(workerSid) {
    var id = await this.getWorkerIdFromSid(workerSid);
    if (id == null) {
      throw workerSid + " does not exist in worker table";
    }
    var insertResult = await this.insertAvailableNotificationRequest(id);
    console.log(
      "createAvailableNotificationRequest: insertResult: " + insertResult
    );
    return insertResult;
  }

  async getWorkerIdFromSid(workerSid) {
    var selectResult = await this.sequelize.query(
      "select * from worker where sid='" + workerSid + "'",
      { type: this.sequelize.QueryTypes.SELECT }
    );
    console.log(
      "getWorkerIdFromSid: selectResult: " + JSON.stringify(selectResult)
    );
    if (selectResult.length == 0) {
      return null;
    } else {
      console.log("getWorkerIdFromSid: selectResult[0]: " + selectResult[0]);
      var id = selectResult[0].id;
      console.log("getWorkerIdFromSid: id is " + id);
      return id;
    }
  }

  async getFunctionalityStatus(functionality) {
    var selectResult = await this.sequelize.query(
      "select * from systemstatus where function=?",
      {
        replacements: [functionality],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );
    if (selectResult.length == 0) {
      return null;
    } else {
      console.log(
        "getFunctionalityStatus: selectResult[0]: " + selectResult[0]
      );
      var available = selectResult[0].available;
      return available;
    }
  }

  insertAvailableNotificationRequest(worker_id) {
    console.log("insertAvailableNotificationRequest");
    return sequelize
      .query(
        "insert into available_notification_request (worker_id) values (" +
          worker_id +
          ")"
      )
      .then((result) => {
        if (result == ",1") {
          return null;
        } else {
          return result;
        }
      })
      .catch((err) => {
        if (err == "SequelizeUniqueConstraintError: Validation error") {
          return (
            "Open AvailableNotificationRequest for " +
            worker_id +
            " already exists."
          );
        } else throw err;
      });
  }

  insertConferenceParticipant(workerSid, callSid, conferenceSid) {
    console.log("insertConferenceParticipant");
    return this.sequelize.query(
      "insert into conference_participant (workerSid,callSid,conferenceSid) " +
        "values(?,?,?)",
      {
        replacements: [workerSid, callSid, conferenceSid],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  insertCallSidWorkerSid(callSid, workerSid) {
    console.log("insertCallSidWorkerSid");
    return this.sequelize.query(
      "insert into callsid_workersid (callsid,workersid) " + "values(?,?)",
      {
        replacements: [callSid, workerSid],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  insertAdminPassword(workerId, passwordHash, adminTaskId) {
    return this.sequelize.query(
      "insert into adminPassword " +
        "(workerId,passwordHash,adminTaskId) " +
        "values " +
        "(?,?,?)",
      {
        replacements: [workerId, passwordHash, adminTaskId],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  updateAdminPassword(workerId, passwordHash, adminTaskId) {
    return this.sequelize.query(
      "update adminPassword " +
        "set passwordHash=? " +
        "where workerId=? " +
        "and adminTaskId=?",
      {
        replacements: [passwordHash, workerId, adminTaskId],
        type: this.sequelize.QueryTypes.UPDATE,
      }
    );
  }

  async getAdminTaskId(adminTask) {
    var selectResult = await this.sequelize.query(
      "select * from adminTask " + "where adminTask=?",
      {
        replacements: [adminTask],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );
    if (selectResult.length == 0) {
      return null;
    } else {
      console.log("getAdminTaskId: selectResult[0]: " + selectResult[0]);
      var id = selectResult[0].id;
      console.log("getAdminTaskId: id is " + id);
      return id;
    }
  }

  //todo: this will need to get updated after we establish the 'canceled' unique constraint
  async getPasswordHash(workerId, adminTaskId) {
    var selectResult = await this.sequelize.query(
      "select * from adminPassword " + "where workerId=? and adminTaskId=?",
      {
        replacements: [workerId, adminTaskId],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );
    if (selectResult.length == 0) {
      return null;
    } else {
      console.log("getPasswordHash: selectResult[0]: " + selectResult[0]);
      var passwordHash = selectResult[0].passwordhash;
      return passwordHash;
    }
  }

  async updateNotificationToSent(workerSid) {
    var id = await this.getWorkerIdFromSid(workerSid);
    if (id == null) {
      throw workerSid + " does not exist in worker table";
    } else {
      return this.sequelize.query(
        "update available_notification_request set notification_sent=true" +
          " where worker_id=" +
          id +
          " and notification_sent=false"
      );
    }
  }

  //we pass in workerSid here because we don't want the worker who just went to Idle to get
  //a notification of an available worker (since calling themselves isn't an option)
  iterateThroughUnsentNotificationsForMessaging(callback, workerSid) {
    sequelize
      .query(
        "select * from available_notification_request_worker where notification_sent=false and sid!='" +
          workerSid +
          "'",
        { type: this.sequelize.QueryTypes.SELECT }
      )
      .then(function (result) {
        console.log(result);
        var x;
        for (x = 0; x < result.length; x++) {
          console.log("iterator: contact_uri: " + result[x].contact_uri);
          var callbackParam = {
            contact_uri: result[x].contact_uri,
            sid: result[x].sid,
          };
          callback(callbackParam);
        }
      })
      .catch((err) =>
        console.log(
          "iterateThroughUnsentNotificationsForMessaging: error: " + err
        )
      );
  }

  async getWorkerSidFromCallSid(callSid) {
    var selectResult = await this.sequelize.query(
      "select * from callsid_workersid where callsid=?",
      {
        replacements: [callSid],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );
    console.log(
      "getWorkerSidFromCallSid: selectResult: " + JSON.stringify(selectResult)
    );
    if (selectResult.length == 0) {
      return null;
    } else {
      console.log(
        "getWorkerSidFromCallSid: selectResult[0]: " + selectResult[0]
      );
      var workerSid = selectResult[0].workersid;
      console.log("getWorkerSidFromCallSid: id is " + workerSid);
      return workerSid;
    }
  }

  //returns other participant's workerSid,
  //or array of workerSids for multiple participants
  //eventually it should just have a single return type of array
  async getOtherParticipantWorkerSid(conferenceSid, callSid) {
    var selectResult = await this.sequelize.query(
      "select * from conference_participant " +
        "where conferenceSid=? and " +
        "callSid!=?",
      {
        replacements: [conferenceSid, callSid],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );
    console.log(
      "getOtherParticipantWorkerSid: selectResult: " +
        JSON.stringify(selectResult)
    );
    if (selectResult.length == 0) {
      return null;
    }
    //todo: this will be if we ever have more than two participants in conference
    //for now it's YAGNI but might as well leave it in here
    else if (selectResult.length > 1) {
      var result = [];
      var index;
      for (index = 0; index < result.length; index++) {
        result.push(selectResult[index].workersid);
      }
      return result;
    } else {
      return selectResult[0].workersid;
    }
  }

  insertEvent(reqBody) {
    return this.sequelize.query(
      "insert into event " +
        "(eventType,eventDescription,timestamp,resourceType,resourceSid,workerSid,data) " +
        "values " +
        "(?,?,?,?,?,?,?)",
      {
        replacements: [
          reqBody.EventType,
          reqBody.EventDescription,
          reqBody.Timestamp,
          reqBody.ResourceType,
          reqBody.ResourceSid,
          reqBody.WorkerSid,
          reqBody.Data,
        ],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  insertConference(
    inboundCallSid,
    outboundCallSid,
    inboundWorkerSid,
    outboundWorkerSid,
    conferenceSid
  ) {
    return this.sequelize.query(
      "insert into conference " +
        "(inboundCallSid,outboundCallSid,inboundWorkerId,outboundWorkerId,conferenceSid) " +
        "values " +
        "(?,?," +
        "(select id from worker where sid=?)," +
        "(select id from worker where sid=?)," +
        "?)",
      {
        replacements: [
          inboundCallSid,
          outboundCallSid,
          inboundWorkerSid,
          outboundWorkerSid,
          conferenceSid,
        ],
        type: this.sequelize.QueryTypes.INSERT,
      }
    );
  }

  async getMembershipRequest(contact_uri, authenticateCode) {
    var selectResult = await this.sequelize.query(
      "select * from workerapply where contact_uri='" +
        contact_uri +
        "' and status='incomplete' " +
        "and authenticatecode='" +
        authenticateCode +
        "'",
      { type: this.sequelize.QueryTypes.SELECT }
    );
    console.log(
      "getMembershipRequest: selectResult: " + JSON.stringify(selectResult)
    );
    if (selectResult.length != 0) {
      return selectResult[0];
    } else {
      return null;
    }
  }

  async updateMembershipRequestToComplete(contact_uri) {
    return this.sequelize.query(
      "update workerapply " + "set status='complete' " + "where contact_uri=?",
      {
        replacements: [contact_uri],
        type: this.sequelize.QueryTypes.UPDATE,
      }
    );
  }
}

module.exports = Database;
