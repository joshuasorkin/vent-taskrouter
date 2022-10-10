require("env2")(".env");
const Database = require("../config/database");
const accountSid = process.env.TWILIO_ACCOUNT_SID; //add your account sid
const authToken = process.env.TWILIO_AUTH_TOKEN; //add your auth token
const client = require("twilio")(accountSid, authToken);

var database = Database.getInstance();

class AvailableNotifier {
  constructor() {
    this.phoneNumberRegex = new RegExp("^\\+\\d+$");
    this.database = Database.getInstance();
  }
  async create(workerSid) {
    var result = await this.database.createAvailableNotificationRequest(workerSid);
    return result;
  }

  async updateToSent(workerSid) {
    var result = await this.database.updateNotificationToSent(workerSid);
    return result;
  }

  iterateSend(workerSid) {
    var result = this.database.iterateThroughUnsentNotificationsForMessaging(
      this.send.bind(this),
      workerSid
    );
  }

  //todo: there should really be a class 'SMSSender' that handles outbound SMS
  //so that this function only has to do something like SMSSender.send(contact_uri,message)
  //given that there will surely be many different operations that call for sending messages to a
  //group of users.
  //todo: need to figure out how to check that the listener is not on this contact_uri's "do not contact list";
  //maybe the listener's number should get passed in and checked against the workerSid that is also returned
  //in the iterator
  send(callbackParam) {
    var contact_uri = callbackParam.contact_uri;
    console.log("send: contact_uri: " + contact_uri);
    if (this.phoneNumberRegex.test(contact_uri)) {
      var body =
        "Message from Vent: There is now at least 1 listener available.";
      client.messages
        .create({
          from: process.env.TWILIO_PHONE_NUMBER,
          body: body,
          to: contact_uri,
        })
        .then((message) => {
          console.log("send: message.sid: " + message.sid);
          this.database.updateNotificationToSent(callbackParam.sid);
        });
    } else {
      console.log(contact_uri + " is not a valid phone number.");
    }
  }
}

module.exports = AvailableNotifier;
