require("env2")(".env");
const fs = require("fs");
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const client = require("twilio")(accountSid, authToken);
const Password = require("./password");
const DataValidator = require("./dataValidator");
class Sms {
  constructor(worker, password) {
    this.worker = worker;
    this.commandList = this.createCommandList();
    var commandListKeys = Object.keys(this.commandList);
    this.commandListKeysString = commandListKeys.sort().join("\n");
    this.password = password;
    this.phoneNumberPattern = "^[+]d+$";
    this.dataValidator = new DataValidator();
  }

  createParameterObj(body, from, workerEntity) {
    var parameterObj = {
      body: body,
      from: from,
      workerEntity: workerEntity,
    };
    return parameterObj;
  }

  createCommandList() {
    let rawData = fs.readFileSync("./src/command-config.json");
    let commandList_output = JSON.parse(rawData);
    Object.keys(commandList_output).forEach((key) => {
      console.log(key);
      //if (key !== "default") {
        commandList_output[key].command = this[key].bind(this);
      //}
    });
    return commandList_output;
  }

  async sendall(parameterObj) {
    var messageBody = parameterObj.commandArray[2];

    //var workerList=await this.worker.getWorkerList();
    var index;
    //var workerEntity;

    var testListString = process.env.TEST_GROUP_LIST;
    var testArray = testListString.split(",");
    for (index = 0; index < testArray.length; index++) {
      console.log(testArray[index]);
      var phonenum = testArray[index];
      client.messages
        .create({
          from: process.env.TWILIO_PHONE_NUMBER,
          body: messageBody,
          to: phonenum,
        })
        .then((message) =>
          console.log(
            "Sms.sendMessageToWorkerEntity(): sent message to worker: " +
              message.sid
          )
        )
        .catch((err) =>
          console.log(
            "Sms.sendMessageToWorkerEntity(): Error sending message to worker: " +
              err
          )
        );
    }

    /*
        for(index=0;index<workerList.length;index++){
            workerEntity=workerList[index];
            console.log("sendAll: workerEntity contact_uri: "+workerEntity.contact_uri);
            this.sendMessageToWorkerEntity
            if(workerEntity.contact_uri=="+19257251305"){
                
            }

            //return this.sendMessageToWorkerEntity(workerEntity,messageBody);
        }
        */
  }

  async apply(parameterObj) {
    var contact_uri = parameterObj.commandArray[1];
    var friendlyName = parameterObj.commandArray[2];
    var authenticateCode = getRndInteger(
      process.env.AUTHENTICATECODE_MIN,
      process.env.AUTHENTICATECODE_MAX
    );
    var workerApply = await this.worker.createWorkerApply(
      contact_uri,
      friendlyName,
      authenticateCode
    );
  }

  getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async sendusername(parameterObj) {
    var friendlyName = parameterObj.commandArray[2];
    var messageBody = parameterObj.commandArray[3];
    var workerEntity = await this.worker.getWorkerEntityFromFriendlyName(
      friendlyName
    );
    console.log(
      "sendUsername: check testing worker attributes: " +
        workerEntity.contact_uri
    );
    this.sendMessageToWorkerEntity(workerEntity, messageBody);
  }

  sendMessageToWorkerEntity(workerEntity, messageBody) {
    client.messages
      .create({
        from: process.env.TWILIO_PHONE_NUMBER,
        body: messageBody,
        to: workerEntity.contact_uri,
      })
      .then((message) =>
        console.log(
          "Sms.sendMessageToWorkerEntity(): sent message to worker: " +
            message.sid
        )
      )
      .catch((err) =>
        console.log(
          "Sms.sendMessageToWorkerEntity(): Error sending message to worker: " +
            err
        )
      );
  }

  async setadminpassword(parameterObj) {
    var friendlyName = parameterObj.commandArray[2];
    console.log("setAdminPassword: friendlyName: " + friendlyName);
    var adminTask = parameterObj.commandArray[3];
    console.log("setAdminPassword: adminTask: " + adminTask);
    var passwordString = parameterObj.commandArray[4];
    var workerEntity = await this.worker.getWorkerEntityFromFriendlyName(
      friendlyName
    );
    var result = await this.password.insertPassword(
      workerEntity.sid,
      passwordString,
      adminTask
    );
    if (result == ",1") {
      return "Admin password set.";
    } else {
      return "Error: " + result;
    }
  }

  async changeAdminPassword(parameterObj) {
    var passwordString_old = parameterObj.bodyArray[1];
    var passwordString_new = parameterObj.bodyArray[2];
    var adminTask = parameterObj.bodyArray[3];
    var passwordMatch = await this.password.verifyPassword(
      parameterObj.workerEntity.sid,
      passwordString_old,
      adminTask
    );
    if (!passwordMatch) {
      return "Incorrect password.";
    } else {
      this.password.updatePassword(
        parameterObj.workerEntity.sid,
        passwordString_new,
        adminTask
      );
    }
  }

  async on(parameterObj) {
    console.log("on: parameterObj.from: " + parameterObj.from);
    var responseValue;
    console.log("on request made");
    //todo: this try-catch is duplicate of the default,
    //both need to be refactored into single function
    try {
      if (parameterObj.commandArray.length > 1) {
        responseValue = "Too many parameters for 'on'";
      } else {
        var workerEntity = await this.worker.updateWorkerActivity(
          parameterObj.from,
          process.env.TWILIO_IDLE_SID,
          false
        );
        responseValue =
          workerEntity.friendlyName + ", you are _available_ to receive calls.";
      }
      console.log("SMS.on(): responseValue: " + responseValue);
    } catch (err) {
      console.log("SMS.on() error: " + err);
      responseValue = err;
    }
    return responseValue;
  }

  //todo: there should probably be a separate class for building all these messages
  offMessage(friendlyName) {
    var responseValue =
      friendlyName +
      ", you are _not available_ to receive calls.  Send ON to set yourself available.";
    return responseValue;
  }

  async off(parameterObj) {
    var responseValue;
    try {
      var workerEntity = await this.worker.updateWorkerActivity(
        parameterObj.from,
        process.env.TWILIO_OFFLINE_SID,
        false
      );
      responseValue = this.offMessage(workerEntity.friendlyName);
      console.log("SMS.off(): responseValue: " + responseValue);
    } catch (err) {
      console.log("Sms.off() error: " + err);
      responseValue = err;
    }
    return responseValue;
  }

  async default(parameterObj){
    let offResult = await this.off(parameterObj);
    let manualResult = await this.manual(parameterObj);
    return offResult+"\n"+manualResult;
  }

  async addWithoutParameterObj(contact_uri, friendlyName) {
    //todo:this is duplicate code from add(), need to refactor
    var responseValue;
    var contact_uriExists = await this.worker.contact_uriExists(contact_uri);
    if (contact_uriExists) {
      responseValue =
        "Worker with contact_uri " + contact_uri + " already exists.";
    } else {
      responseValue = await this.worker.createWorker(contact_uri, friendlyName);
      //todo: this is a hack until I can figure out what the problem
      //is with the return value from worker.create
      if (responseValue == ",1") {
        //todo: need to allow user to remove themselves by texting "remove"
        this.sendAddNotification(friendlyName, contact_uri);
        responseValue = "Worker " + friendlyName + " successfully created.";
      }
    }
    return responseValue;
  }

  async add(parameterObj) {
    var responseValue;
    var contact_uri = parameterObj.commandArray[2];
    var friendlyName = parameterObj.commandArray[3];
    /*
        if(!(/^[+]\d+$/.test(contact_uri))){
            responseValue=contact_uri+" is an invalid phone number.  Must be format: +12345678 (any # of digits)";
            return responseValue;
        }
        */

    var contact_uriExists = await this.worker.contact_uriExists(contact_uri);
    if (contact_uriExists) {
      responseValue =
        "Worker with contact_uri " + contact_uri + " already exists.";
    } else {
      responseValue = await this.worker.createWorker(contact_uri, friendlyName);
      //todo: this is a hack until I can figure out what the problem
      //is with the return value from worker.create
      if (responseValue == ",1") {
        //todo: need to allow user to remove themselves by texting "remove"
        this.sendAddNotification(friendlyName, contact_uri);
        responseValue =
          "Worker " + parameterObj.commandArray[3] + " successfully created.";
      }
    }
    return responseValue;
  }

  sendAddNotification(friendlyName, contact_uri) {
    var adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;

    var confirmMessageBody =
      "You have been added as a Vent user, username " +
      friendlyName +
      ".  If you did not request to be added, please contact " +
      process.env.ADMIN_NAME +
      " at " +
      adminPhoneNumber +
      " for removal.";
    var manualText = this.manual(null);
    confirmMessageBody += "\n" + manualText;
    client.messages
      .create({
        from: process.env.TWILIO_PHONE_NUMBER,
        body: confirmMessageBody,
        to: contact_uri,
      })
      .then((message) =>
        console.log("Sms.add(): sent message to added worker: " + message.sid)
      )
      .catch((err) =>
        console.log("Sms.add(): Error sending message to added worker: " + err)
      );
  }

  async changename(parameterObj) {
    var responseValue;
    try {
      var newFriendlyName = parameterObj.commandArray[1];
      var workerEntity = await this.worker.updateWorkerName(
        parameterObj.from,
        newFriendlyName
      );
      responseValue = "Your new name is " + workerEntity.friendlyName + ".";
    } catch (err) {
      responseValue = err;
    }
    return responseValue;
  }

  //todo: validate oldNumber and newNumber as "\+\d+"
  async changenumber(parameterObj) {
    var responseValue;
    try {
      var oldNumber = parameterObj.commandArray[2];
      var newNumber = parameterObj.commandArray[3];
      var workerEntity = await this.worker.updateContact_uri(
        oldNumber,
        newNumber
      );
      if (workerEntity == null) {
        responseValue = "Error updating number.";
      } else {
        responseValue = "Number updated.";
      }
    } catch (err) {
      responseValue = err;
    }
    return responseValue;
  }

  async status(parameterObj) {
    var attributes = JSON.parse(parameterObj.workerEntity.attributes);
    var do_not_contact = attributes.do_not_contact;
    var workerSid = parameterObj.workerEntity.sid;
    var workerSidArray = [workerSid];
    var sids_to_exclude = do_not_contact.concat(workerSidArray);
    //var do_not_contact_toString=this.formatDoNotContact(do_not_contact);
    var workerCount = await this.worker.getCountOfIdleWorkers(sids_to_exclude);
    var activity;
    switch (parameterObj.workerEntity.activitySid) {
      case process.env.TWILIO_IDLE_SID:
        activity = "You are available to receive calls.";
        break;
      default:
        activity = "You are not available to receive calls.";
    }
    var responseValue =
      workerCount +
      " " +
      (workerCount == 1 ? "listener is" : "listeners are") +
      " waiting for your call.\n" +
      activity;
    return responseValue;
  }

  formatDoNotContact(do_not_contact) {
    var index;
    var output = do_not_contact;
    for (index = 0; index < output.length; index++) {
      output[index] = "'" + output[index] + "'";
    }
    return "[" + output.toString() + "]";
  }

  manualResponse(command) {
    return command.description + "\nUsage: " + command.parameterUsage;
  }

  //todo: add STOP reserved commands to manual()
  manual(parameterObj) {
    var responseValue;
    var commandListResponse =
      "--Command list--\n" +
      this.commandListKeysString +
      "\n\nSend MANUAL [command name] for instructions\n\n" +
      "To Vent: call the phone number that sent this text\n" +
      "To make yourself available to receive Vents: send ON";
    if (parameterObj == null) {
      responseValue = commandListResponse;
      return responseValue;
    }
    var commandName = parameterObj.commandArray[1];
    if (parameterObj.commandArray.length == 1) {
      responseValue = commandListResponse;
    } else if (commandName in this.commandList) {
      var command = this.commandList[commandName];
      responseValue = this.manualResponse(command);
    } else {
      var defaultCommand = this.commandList["default"];
      responseValue =
        "Command '" +
        commandName +
        "' not recognized. " +
        this.helpResponse(defaultCommand);
    }
    return responseValue;
  }

  parameterCountMatch(command, parameterObj) {
    if (
      parameterObj.commandArray.length == 1 &&
      command.commandName == "manual"
    ) {
      return true;
    } else {
      return parameterObj.commandArray.length == command.parameterCount;
    }
  }

  async processCommand(parameterObj) {
    console.log({parameterObj});
    var responseValue;
    var commandArray = this.bodyToCommandArray(parameterObj.body);
    const commandName = commandArray[0].toLowerCase();
    parameterObj.commandArray = commandArray;
    var command;
    if (commandName in this.commandList) {
      command = this.commandList[commandName];
      if (!this.parameterCountMatch(command, parameterObj)) {
        responseValue =
          "Incorrect syntax for '" +
          command.commandName +
          "':\n" +
          command.parameterUsage;
        return responseValue;
      }
      if (command.adminTask != null) {
        var workerSid = parameterObj.workerEntity.sid;
        var passwordString = parameterObj.commandArray[1];
        var passwordMatch = await this.password.verifyPassword(
          workerSid,
          passwordString,
          command.adminTask
        );
        if (!passwordMatch) {
          responseValue = "You entered an incorrect admin password.";
          return responseValue;
        }
      }
    } else {
      command = this.commandList["default"];
      console.log({command});
    }
    //responseValue = await command.commandFunction(parameterObj);
    responseValue = await command.command(parameterObj);


    return responseValue;
  }

  bodyToCommandArray(body) {
    var commandArray;
    if (body.includes('"')) {
      commandArray = this.bodyToCommandArray_quotedString(body);
      return commandArray;
    }
    body = body.replace(/\s\s+/g, " ");
    if (body == " ") {
      body = "";
    }
    body = body.trim();
    commandArray = body.split(" ");
    return commandArray;
  }

  //taken from https://stackoverflow.com/a/18647776/619177
  bodyToCommandArray_quotedString(body) {
    //The parenthesis in the regex creates a captured group within the quotes
    var myRegexp = /[^\s"]+|"([^"]*)"/gi;
    var myString = body;
    var myArray = [];

    do {
      //Each call to exec returns the next regex match as an array
      var match = myRegexp.exec(myString);
      if (match != null) {
        //Index 1 in the array is the captured group if it exists
        //Index 0 is the matched text, which we use if no captured group exists
        myArray.push(match[1] ? match[1] : match[0]);
      }
    } while (match != null);
    return myArray;
  }
}

module.exports = Sms;
