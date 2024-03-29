require("env2")(".env");
const Sms = require("./sms");
const Database = require("../config/database");

const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
//todo: is it better to have client instance created inside the constructor, maybe even passed in like workspace?
//does it matter?
const client = require("twilio")(accountSid, authToken);

class Worker {
  constructor(workspace) {
    this.workspace = workspace;
    this.sms = new Sms();
    this.database = Database.getInstance();
  }

  createWorker(contact_uri, friendlyName) {
    return this.workspace.workers
      .create({
        attributes: JSON.stringify({
          languages: "en",
          contact_uri: contact_uri,
          do_not_contact: [],
        }),
        friendlyName: friendlyName,
      })
      .then((worker) => {
        console.log(
          "createWorker: worker successfully created in Twilio, now creating in database..."
        );
        return this.database.createWorker(worker).then((result) => result);
      })
      .catch((err) => {
        console.log(err);
        return "Worker create error: " + err.message;
      });
  }

  createWorkerApply(contact_uri, friendlyName, authenticateCode) {
    return this.database.createWorkerApply(
      contact_uri,
      friendlyName,
      authenticateCode
    );
  }

  async getMembershipRequest(contact_uri, authenticateCode) {
    var result = await this.database.getMembershipRequest(
      contact_uri,
      authenticateCode
    );
    return result;
  }

  async updateMembershipRequestToComplete(contact_uri) {
    var result = await this.database.updateMembershipRequestToComplete(contact_uri);
    return result;
  }

  addAllWorkersToDatabase() {
    this.workspace.workers.each((worker) => {
      this.database.createWorker(worker);
    });
  }

  async updateWorkerActivity(
    contact_uri,
    activitySid,
    rejectPendingReservations
  ) {
    console.log("updateWorkerActivity: getting workerSid from database");
    var workerSid = await this.database.getWorkerSid(contact_uri);
    console.log("updateWorkerActivity: workerSid is " + workerSid);
    var workerEntity = await this.updateWorkerActivityFromSid(
      workerSid,
      activitySid,
      rejectPendingReservations
    );
    console.log(
      "updateWorkerActivity: worker's friendlyName is " +
        workerEntity.friendlyName
    );
    return workerEntity;
  }

  async updateWorkerName(contact_uri, newName) {
    console.log("updateWorkerName: getting workerSid from database");
    var workerSid = await this.database.getWorkerSid(contact_uri);
    if (workerSid == null) {
      throw "updateWorkerName: error: workerSid not found for " + contact_uri;
    }

    console.log("updateWorkerName: workerSid is " + workerSid);
    var workerEntity = await this.workspace
      .workers(workerSid)
      .update({
        friendlyName: newName,
      })
      .catch((err) => console.log("updateWorkerName: error: " + err));
    console.log(
      "updateWorkerName: worker's new friendlyName is " +
        workerEntity.friendlyName
    );
    return workerEntity;
  }

  async updateWorkerNameFromSid(workerSid, newName) {
    var workerEntity = await this.workspace
      .workers(workerSid)
      .update({
        friendlyName: newName,
      })
      .catch((err) => console.log("updateWorkerNameFromSid: error: " + err));
    console.log(
      "updateWorkerNameFromSid: worker's new friendlyName is " +
        workerEntity.friendlyName
    );
    return workerEntity;
  }

  //either adds an array property to the worker attributes object,
  //or pushes attributeArrayValue into the existing array property
  async updateWorkerAddAttributeArrayValue(
    workerEntity,
    attributeName,
    attributeArrayValue
  ) {
    var attributes = JSON.parse(workerEntity.attributes);
    if (!attributes.hasOwnProperty(attributeName)) {
      console.log(
        "updateWorkerAddAttributeArrayValue: new property to create: " +
          attributeName +
          ": " +
          attributeArrayValue
      );
      if (attributeArrayValue == null) {
        attributes[attributeName] = [];
      } else {
        attributes[attributeName] = [attributeArrayValue];
      }
    } else {
      console.log(
        "updateWorkerAddAttributeArrayValue: adding value to array property: " +
          attributeName +
          ": " +
          attributeArrayValue
      );
      if (attributeArrayValue != null) {
        if (!attributes[attributeName].includes(attributeArrayValue)) {
          attributes[attributeName].push(attributeArrayValue);
        }
      }
    }
    console.log(
      "updateWorkerAddAttributeArrayValue: new attributes: " +
        JSON.stringify(attributes)
    );
    workerEntity
      .update({
        attributes: JSON.stringify(attributes),
      })
      .then((updatedWorker) => {
        console.log(updatedWorker.friendlyName);
        console.log(JSON.parse(updatedWorker.attributes));
      })
      .catch((err) => {
        console.log("updateWorkerAddAttributeArrayValue: error: " + err);
        throw err;
      });
  }

  async updateWorkerActivityFromSid(
    workerSid,
    activitySid,
    rejectPendingReservations
  ) {
    var workerEntity = null;
    try {
      workerEntity = await this.workspace
        .workers(workerSid)
        .update({
          activitySid: activitySid,
          rejectPendingReservations: rejectPendingReservations,
        })
        .catch((err) =>
          console.log(
            "updateWorkerFromSid: error updating worker activity: " + err
          )
        );
      console.log(
        "updateWorkerFromSid: worker has been updated to activity: " +
          workerEntity.activityName
      );
      return workerEntity;
    } catch (err) {
      console.log("updateWorkerFromSid error: " + err);
    } finally {
      return workerEntity;
    }
  }

  async messageWorkerUnavailable(workerName, contact_uri) {
    console.log({contact_uri});
    try {
      console.log("messageWorkerUnavailable: sending message to worker...");
      var message = await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        body: this.sms.offMessage(workerName),
        to: contact_uri,
      });
      console.log("messageWorkerUnavailable: message sid: " + message.sid);
    } catch (err) {
      console.log("messageWorkerUnavailable: error sending message: " + err);
    }
  }

  async getWorkerEntityFromContact_uri(contact_uri) {
    var workerSid = await this.database.getWorkerSid(contact_uri);
    if (workerSid == null) {
      return null;
    }
    var workerEntity = await this.workspace.workers(workerSid).fetch();
    console.log(
      "getWorkerEntityFromContact_uri: friendlyName: " +
        workerEntity.friendlyName
    );
    return workerEntity;
  }

  //todo: get rid of this limit
  async getWorkerList() {
    var workerList;
    var pushResult = await this.workspace.workers.each((worker) => {
      workerList.push(worker);
    });
    return workerList;
  }

  async getWorkerEntityFromFriendlyName(friendlyName) {
    var workerList = await this.workspace.workers.list({
      friendlyName: friendlyName,
    });
    if (workerList.length == 0) {
      return null;
    }
    if (workerList.length > 1) {
      throw "Duplicate workers with friendlyName " + friendlyName;
    }
    var workerEntity = workerList[0];
    return workerEntity;
  }

  async updateContact_uri(oldContact_uri, newContact_uri) {
    console.log("updateWorkerName: getting workerSid from database");
    var workerSid = await this.database.getWorkerSid(oldContact_uri);
    if (workerSid == null) {
      throw (
        "updateContact_uri: error: workerSid not found for " + oldContact_uri
      );
    }
    console.log("updateContact_uri: workerSid is " + workerSid);
    var dbResult = await this.database.updateWorkerContact_uri(
      oldContact_uri,
      newContact_uri
    );
    if (dbResult == null) {
      //todo: is there a more efficient way to do this with a single call to worker?
      var attributes;
      var workerEntity;
      workerEntity = await this.workspace
        .workers(workerSid)
        .fetch()
        .then((workerObj) => (attributes = workerObj.attributes));
      console.log("pre update");
      console.log(attributes);
      var attributesObj = JSON.parse(attributes);
      attributesObj.contact_uri = newContact_uri;
      attributes = JSON.stringify(attributesObj);
      console.log("post update");
      console.log(attributes);

      var workerEntity = await this.workspace
        .workers(workerSid)
        .update({
          attributes: attributes,
        })
        .catch((err) => {
          console.log("updateContact_uri: error: " + err);
          return null;
        });
      if (workerEntity != null) {
        console.log(
          "updateContact_uri: worker's new contact_uri is " +
            workerEntity.attributes.contact_uri
        );
      }
      return workerEntity;
    } else {
      console.log(
        "updateContact_uri: dbResult is non-null, error: " + dbResult
      );
      return null;
    }
  }

  async getWorkerSid(contact_uri) {
    var workerSid = await this.database.getWorkerSid(contact_uri);
    return workerSid;
  }

  async contact_uriExists(contact_uri) {
    var workerSid = await this.database.getWorkerSid(contact_uri);
    console.log("contact_uriExists: workerSid " + workerSid);
    console.log("workerSid!=null: " + (workerSid != null));
    return workerSid != null;
  }

  async insertCallSidWorkerSid(callSid, workerSid) {
    var result;
    try {
      result = await this.database.insertCallSidWorkerSid(callSid, workerSid);
      if (result == ",1") {
        return null;
      } else {
        return result;
      }
    } catch (err) {
      console.log("insertCallSidWorkerSid: error: " + err);
      throw err;
    }
  }

  async getWorkerSidFromCallSid(callSid) {
    var result = await this.database.getWorkerSidFromCallSid(callSid);
    if (result == null) {
      throw (
        "getWorkerSidFromCallSid: callSid " +
        callSid +
        " not found in callsid_workersid"
      );
    } else {
      return result;
    }
  }

  //todo: return to stringified do_not_contact after issue gets resolved with targetWorkersExpression in API
  async getCountOfIdleWorkers(sids_to_exclude) {
    try {
      console.log("getCountOfIdleWorkers: sids_to_exclude: " + sids_to_exclude);
      var workers = await this.workspace.workers.list({
        activitySid: process.env.TWILIO_IDLE_SID,
        taskQueueSid: process.env.TWILIO_TASKQUEUE_SID,
      });
      var filteredWorkers = [];
      var workerEntity;
      var index;
      for (index = 0; index < workers.length; index++) {
        workerEntity = workers[index];
        console.log(
          "getCountOfIdleWorkers: workerEntity sid: " + workerEntity.sid
        );
        if (!sids_to_exclude.includes(workerEntity.sid)) {
          console.log(
            "getCountOfIdleWorkers: workerEntity.sid " +
              workerEntity.sid +
              " not found in sids_to_exclude"
          );
          filteredWorkers.push(workerEntity);
        }
      }
      return filteredWorkers.length;
    } catch (err) {
      return err;
    }
  }

  async addToDoNotContact(workerSid, otherWorkerSid) {
    var workerEntity = await this.workspace.workers(workerSid).fetch();
    var result = await this.updateWorkerAddAttributeArrayValue(
      workerEntity,
      "do_not_contact",
      otherWorkerSid
    );
  }

  addBothToDoNotContact(workerSid, otherWorkerSid) {
    this.addToDoNotContact(workerSid, otherWorkerSid);
    this.addToDoNotContact(otherWorkerSid, workerSid);
  }

  removeWorker(workerEntity, contact_uri) {}

  getStatisticsByWorkerSid(workerSid) {
    return this.workspace.workers(workerSid).statistics().fetch({
      startDate: "2019-09-30T01:00:00Z",
      endDate: "2019-11-18T01:00:00Z",
    });
  }

  async getStatisticsByWorkerSid_cumulative(workerSid) {
    try {
      var statistics = await this.getStatisticsByWorkerSid(workerSid);
      return statistics.cumulative;
    } catch (err) {
      console.log("getStatisticsByWorkerSid_cumulative: error " + err);
      return null;
    }
  }
}

module.exports = Worker;
