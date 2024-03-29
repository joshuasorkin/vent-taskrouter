require("env2")(".env");

const path = require("path");
const express = require("express");
const twilio = require("twilio");
const fetch = require("node-fetch");

const VoiceResponse = require("twilio").twiml.VoiceResponse;
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const http_port = process.env.HTTP_PORT || process.env.PORT;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const workspaceSid = process.env.TWILIO_WORKSPACE_SID;
const workflowSid = process.env.TWILIO_WORKFLOW_SID;

const client = require("twilio")(accountSid, authToken);

const Taskrouter = require("./lib/taskrouter");
const UrlSerializer = require("./lib/urlSerializer");
const Conference = require("./lib/conference");
const Worker = require("./lib/worker");
const TwimlBuilder = require("./lib/twimlBuilder");
const Textsplitter = require("./lib/textsplitter");
const AvailableNotifier = require("./lib/availableNotifier");
const Sms = require("./lib/sms");
const MembershipRequester = require("./lib/membershipRequester");
const DataValidator = require("./lib/dataValidator");
const AppInitializer = require("./appInitializer");

const shouldValidate =
  process.env.NODE_ENV === "local"
    ? twilio.webhook({ validate: false })
    : twilio.webhook();

const app = express();

var appInitializer = new AppInitializer();
var dataValidator = new DataValidator();
var availableNotifier = new AvailableNotifier();
var textsplitter = new Textsplitter();
var urlSerializer = new UrlSerializer();
var twimlBuilder = new TwimlBuilder();

var clientWorkspace;
var membershipRequester;
var conference;
var worker;
var sms;
var taskrouter = null;

var minMinutes = 1;
var maxMinutes = 10;

appInitializer.initialize(app);

/**
 * @openapi
 * '/workerStatistics':
 *  get:
 *     tags:
 *     - Worker
 *     summary: Get service worker statistics
 *     parameters:
 *       - in: body
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: service worker Id
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 */
app.get("/workerStatistics", async function (req, res) {
  var workerSid = req.query.workerSid;
  var statistics = await worker.getStatisticsByWorkerSid_cumulative(workerSid);
  res.send(statistics);
});

/**
 * @openapi
 * '/submit_newuser':
 *  post:
 *     tags:
 *     - User
 *     summary: Create new user
 *     parameters:
 *       - in: body
 *         name: phonenumber
 *         schema:
 *           type: string
 *         required: true
 *         description: user's phone number
 *       - in: body
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: username
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 */
app.post("/submit_newuser", async function (req, res) {
  var output;
  try {
    var phonenumber = req.body.phonenumber;
    var username = req.body.username;
    //output="you submitted: "+username+" "+phonenumber;
    //appending  "1" to start of phone number if it isn't already there
    var prefixedPhoneNumber = phonenumber;
    if (phonenumber.substring(0, 1) != "1") {
      prefixedPhoneNumber = `1${phonenumber}`;
    }
    var membershipRequestResult = await membershipRequester.requestNewWorker(
      prefixedPhoneNumber,
      username
    );
    console.log(
      "/submit_newuser: membershipRequestResult: " + membershipRequestResult
    );
    output = membershipRequestResult;
  } catch (err) {
    output = err;
  }
  console.log("/submit_newuser: text to send back: " + output);
  res.send(output);
});

/**
 * @openapi
 * '/sms':
 *  post:
 *     tags:
 *     - SMS
 *     summary: Create new user
 *     parameters:
 *       - in: body
 *         name: Body
 *         schema:
 *           type: string
 *         required: false
 *         description: SMS body
 *       - in: body
 *         name: From
 *         schema:
 *           type: string
 *         required: false
 *         description: SMS sender
 *       - in: body
 *         name: sid
 *         schema:
 *           type: string
 *         required: false
 *         description: SMS sid
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/sms", shouldValidate, async function (req, res) {
  var body = req.body.Body;
  var parameterObj;
  console.log("/sms: message SID " + req.body.sid);
  console.log(body);
  //replace multiple spaces with single space

  fromNumber = req.body.From;

  var responseValue;
  const response = new MessagingResponse();

  /**
   * Todo: the contact_uriExists check should get moved to sms.js,
   * as should the workerEntity retrieval.
   * basically, /sms should just extract the body and fromNumber parameters, then pass
   * them along to sms.processCommand() which will then create the parameterObj internally
   */
  contact_uriExists = await worker.contact_uriExists(fromNumber);
  console.log("/sms: contact_uriExists: " + contact_uriExists);
  if (!contact_uriExists) {
    var validAuthenticateCode = dataValidator.validAuthenticateCode(body);
    if (validAuthenticateCode) {
      var result = await membershipRequester.verifyRequest(fromNumber, body);
      responseValue = result;
    } else {
      responseValue =
        "You are not recognized as an authorized user.  Please register with an administrator and try again.";
    }
  } else {
    var workerEntity = await worker.getWorkerEntityFromContact_uri(fromNumber);
    parameterObj = sms.createParameterObj(body, fromNumber, workerEntity);
    responseValue = await sms.processCommand(parameterObj);
  }
  console.log("/sms: response value: " + responseValue);
  response.message(responseValue);
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(response.toString());
});

/**
 * @openapi
 * '/conferenceAnnounceEnd_participantLeave':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Announce a participant leaving a conference call
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get(
  "/conferenceAnnounceEnd_participantLeave",
  shouldValidate,
  function (req, res) {
    var parameters = urlSerializer.deserialize(req);
    url = urlSerializer.serialize("endConference_update", parameters);
    const response = new VoiceResponse();
    console.log(
      "/conferenceAnnounceEnd_participantLeave: running conferenceAnnounceEnd"
    );
    twimlBuilder.say(
      response,
      "Your conversation partner has exited.  Thanks for participating.  I'll end the conference now."
    );
    response.redirect(
      {
        method: "GET",
      },
      url
    );
    res.send(response.toString());
  }
);

/**
 * @openapi
 * '/conferenceAnnounceEnd_timeUp':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Announce to a participant that time is up
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
/**
 * Todo: refactor this, both of the conferenceAnnounceEnd should be the same function
 * /with different say() text passed in
 */
app.get("/conferenceAnnounceEnd_timeUp", shouldValidate, function (req, res) {
  var parameters = urlSerializer.deserialize(req);
  url = urlSerializer.serialize("endConference_update", parameters);
  const response = new VoiceResponse();
  console.log("/conferenceAnnounceEnd_timeUp: running conferenceAnnounceEnd");
  twimlBuilder.say(
    response,
    "Time's up.  The conference will end in a few seconds."
  );
  response.pause({
    length: 5,
  });
  response.redirect(
    {
      method: "GET",
    },
    url
  );
  res.send(response.toString());
});

/**
 * @openapi
 * '/postConferenceIVR':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Return TWIML for IVR request
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/postConferenceIVR", shouldValidate, function (req, res) {
  var parameters = urlSerializer.deserialize(req);
  const response = new VoiceResponse();

  var url = urlSerializer.serialize("process_postConferenceIVR", parameters);
  const gather = response.gather({
    input: "dtmf speech",
    hints: "yes,no",
    speechTimeout: "auto",
    speechModel: "numbers_and_commands",
    timeout: 3,
    action: url,
    method: "GET",
  });
  twimlBuilder.playChime(response);
  twimlBuilder.say(
    gather,
    "Would you like to connect with this person on one of your future calls?  Say 'Yes' or press 1 to keep them available, or say 'No' or press 2 to add them to your do not contact list."
  );
  res.send(response.toString());
});

/**
 * @openapi
 * '/process_postConferenceIVR':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Process IVR input
 *     parameters:
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *       - in: path
 *         name: otherParticipantWorkerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: other caller's sid
 *       - in: body
 *         name: Digits
 *         schema:
 *           type: string
 *         required: true
 *         description: user's IVR input
 *       - in: body
 *         name: SpeechResult
 *         schema:
 *           type: object
 *         required: true
 *         description: user's voice response
 *     responses:
 *       200:
 *         description: Success
 */
app.get(
  "/process_postConferenceIVR",
  shouldValidate,
  async function (req, res) {
    var parameters = urlSerializer.deserialize(req);
    var userInput;
    if (req.query.hasOwnProperty("Digits")) {
      userInput = req.query.Digits;
    } else if (req.query.hasOwnProperty("SpeechResult")) {
      userInput = req.query.SpeechResult;
    } else {
      throw "/process_postConferenceIVR: error: no 'Digits' or 'SpeechResult' property present";
    }
    const response = new VoiceResponse();
    switch (userInput) {
      case "1":
      case "Yes.":
        twimlBuilder.say(
          response,
          "I'm glad you enjoyed your conversation.  Good-bye."
        );
        response.hangup();
        break;
      case "2":
      case "No.":
        twimlBuilder.say(
          response,
          "I'm sorry you didn't enjoy your conversation.  I'll make sure " +
            "you're not connected to them on any future calls.  Good-bye."
        );
        response.hangup();
        worker.addBothToDoNotContact(
          parameters.workerSid,
          parameters.otherParticipantWorkerSid
        );
        break;
      default:
        var url = urlSerializer.serialize("postConferenceIVR", parameters);
        response.redirect({ method: "GET" }, url);
    }

    res.send(response.toString());
  }
);

/**
 * @openapi
 * '/endConference_update':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Ends conference call
 *     parameters:
 *       - in: path
 *         name: conferenceSid
 *         schema:
 *           type: string
 *         required: true
 *         description: conference sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/endConference_update", shouldValidate, function (req, res) {
  console.log("/endConference_update: reached this endpoint");
  var parameters = urlSerializer.deserialize(req);
  var conferenceSid = parameters.conferenceSid;
  conference.endConference_update(conferenceSid);
  const response = new VoiceResponse();
  res.send(response.toString());
});

/**
 * @openapi
 * '/conferenceAnnounceTime':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Announce time remaining for conference call
 *     parameters:
 *       - in: path
 *         name: timeRemaining
 *         schema:
 *           type: string
 *         required: true
 *         description: time remaining
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/conferenceAnnounceTime", shouldValidate, function (req, res) {
  const response = new VoiceResponse();
  parameters = urlSerializer.deserialize(req);
  timeRemaining = parameters.timeRemaining;
  var unit;
  if (timeRemaining == 1) {
    unit = "minute";
  } else {
    unit = "minutes";
  }
  twimlBuilder.playChime(response);
  twimlBuilder.say(response, timeRemaining + " " + unit + ".");
  res.send(response.toString());
});

/**
 * @openapi
 * '/processGatherConferenceMinutes':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Set length for conference call
 *     parameters:
 *       - in: path
 *         name: workflowSid
 *         schema:
 *           type: string
 *         required: true
 *         description: workflow sid
 *       - in: path
 *         name: do_not_contact
 *         schema:
 *           type: string
 *         required: true
 *         description: flag for do_not_contact
 *       - in: body
 *         name: Digits
 *         schema:
 *           type: string
 *         required: true
 *         description: user's IVR input
 *       - in: body
 *         name: SpeechResult
 *         schema:
 *           type: object
 *         required: true
 *         description: user's voice response
 *     responses:
 *       200:
 *         description: Success
 */
app.get(
  "/processGatherConferenceMinutes",
  shouldValidate,
  async function (req, res) {
    console.log(
      "/processGatherConferenceMinutes: req.query: " + JSON.stringify(req.query)
    );
    var digits;
    if (req.query.hasOwnProperty("Digits")) {
      digits = req.query.Digits;
    } else if (req.query.hasOwnProperty("SpeechResult")) {
      digits = req.query.SpeechResult;
    } else {
      throw "/processGatherConferenceMinutes: error: no 'Digits' or 'SpeechResult' property present";
    }
    const response = new VoiceResponse();
    var parameters = urlSerializer.deserialize(req);
    var digitsInt;
    var valid = true;
    if (digits.includes("*")) {
      valid = false;
    } else {
      digitsInt = parseInt(digits);
      if (isNaN(digitsInt)) {
        valid = false;
      } else if (digitsInt < minMinutes || digitsInt > maxMinutes) {
        valid = false;
      } else {
        valid = true;
      }
    }
    if (!valid) {
      twimlBuilder.say(response, "Not a valid number of minutes.");
      twimlBuilder.gatherConferenceMinutes(
        response,
        minMinutes,
        maxMinutes,
        parameters
      );
    } else {
      do_not_contact = parameters.do_not_contact;
      const taskJSON = {
        minutes: digitsInt,
        do_not_contact: do_not_contact,
      };
      twimlBuilder.say(response, "Thank you.");
      response
        .enqueue({
          workflowSid: workflowSid,
          //callerWorkerSid: parameters.workerSid,
          waitUrl: "/randomSoundLoop",
        })
        .task({}, JSON.stringify(taskJSON));
    }
    res.send(response.toString());
  }
);

/**
 * @openapi
 * '/redirectToWait':
 *  post:
 *     tags:
 *     - SMS
 *     summary: Play random sound loop while system finds potential participant
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/redirectToWait", shouldValidate, function (req, res) {
  response = new VoiceResponse();
  twimlBuilder.say(
    response,
    "Now calling a potential receiver.  Please continue to wait."
  );
  response.redirect("/randomSoundLoop");
  res.send(response.toString());
});

/**
 * @openapi
 * '/gatherConferenceMinutes':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Set length for conference call
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
//used for repeating initial conference minutes gather if user - doesn't respond the first time
app.get("/gatherConferenceMinutes", shouldValidate, function (req, res) {
  parameters = urlSerializer.deserialize(req);
  const response = new VoiceResponse();
  twimlBuilder.gatherConferenceMinutes(
    response,
    minMinutes,
    maxMinutes,
    parameters
  );
  res.send(response.toString());
});

/**
 * @openapi
 * '/voice':
 *  post:
 *     tags:
 *     - Conference Call
 *     summary: Initiate conference call
 *     parameters:
 *       - in: body
 *         name: From
 *         schema:
 *           type: string
 *         required: true
 *         description: user's phone number
 *       - in: body
 *         name: CallSid
 *         schema:
 *           type: string
 *         required: true
 *         description: call sid
 *       - in: path
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/voice", shouldValidate, async function (req, res) {
  const response = new VoiceResponse();

  var generalStatus = await taskrouter.getFunctionalityStatus("general");
  if (!generalStatus) {
    twimlBuilder.playChime(response);
    twimlBuilder.say(
      response,
      "The system is unavailable right now.  Please try your call again later."
    );
    response.pause({
      length: 1,
    });
    res.send(response.toString());
    return;
  }

  const fromNumber = req.body.From;

  const callSid = req.body.CallSid;
  console.log("/voice: callSid: " + callSid);
  contact_uriExists = await worker.contact_uriExists(fromNumber);
  if (contact_uriExists) {
    workerEntity = await worker.updateWorkerActivity(
      fromNumber,
      process.env.TWILIO_BUSY_SID,
      false
    );
    console.log("/voice: worker's sid is " + workerEntity.sid);
    friendlyName = workerEntity.friendlyName;
    console.log("/voice: worker's friendlyName is " + friendlyName);
    workerSid = workerEntity.sid;
    var result = await worker.insertCallSidWorkerSid(callSid, workerSid);
    if (result != null) {
      console.log("/voice: insertCallSidWorkerSid failed: " + result);
    }
    attributes = JSON.parse(workerEntity.attributes);
    do_not_contact = attributes.do_not_contact;
    parameters = {
      do_not_contact: do_not_contact,
      workerSid: workerSid,
      friendlyName: friendlyName,
      attempts: 1,
    };
    twimlBuilder.gatherConferenceMinutes(
      response,
      minMinutes,
      maxMinutes,
      parameters
    );
  } else {
    twimlBuilder.say(
      response,
      "You are not recognized as an authorized user.  Good-bye."
    );
    response.hangup();
  }
  res.send(response.toString());
});

/**
 * @openapi
 * '/randomSoundLoop':
 *  post:
 *     tags:
 *     - Audio
 *     summary: Play random sound loop
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/randomSoundLoop", shouldValidate, function (req, res) {
  const response = new VoiceResponse();
  response.play(process.env.WAIT_URL);
  res.send(response.toString());
});

/**
 * @openapi
 * '/randomWordLoop':
 *  post:
 *     tags:
 *     - Audio
 *     summary: Play random word loop
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/randomWordLoop", shouldValidate, function (req, res) {
  const response = new VoiceResponse();
  var word = textsplitter.randomSentenceFromFiletextArray();
  twimlBuilder.sayReading(response, word);
  response.redirect("/randomWordLoop");
  res.send(response.toString());
});

/**
 * @openapi
 * '/waitSound':
 *  get:
 *     tags:
 *     - Audio
 *     summary: Set header for sound loop
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/waitSound", shouldValidate, function (req, res) {
  res.append("Last-Modified", new Date(lastModifiedStringDate).toUTCString());
});

/**
 * @openapi
 * '/wait':
 *  get:
 *     tags:
 *     - Audio
 *     summary: Play random sound loop
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/wait", twilio.webhook, function (req, res) {
  const response = new VoiceResponse();
  response.redirect("/randomSoundLoop");
  res.send(response.toString());
});

/**
 * @openapi
 * '/agent_answer_hangup':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: This endpoint is called if the agent does not provide IVR response to the options presented by /agent_answer, either because they hung up or waited too long.
 *     parameters:
 *       - in: path
 *         name: from
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's phone number
 *       - in: path
 *         name: to
 *         schema:
 *           type: string
 *         required: true
 *         description: participaent's phone number
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/agent_answer_hangup", shouldValidate, function (req, res) {
  parameters = urlSerializer.deserialize(req);
  const response = new VoiceResponse();
  twimlBuilder.say(response, "I didn't get any input from you.  Goodbye!");
  console.log(`hanging up call from ${parameters.from} to ${parameters.to}`);
  response.hangup();
  console.log(
    "/agent_answer_hangup: now updating worker to offline, should automatically reject pending reservation"
  );
  var updateResult = worker.updateWorkerActivityFromSid(
    parameters.workerSid,
    process.env.TWILIO_OFFLINE_SID,
    true
  );

  console.log(response.toString());
  res.send(response.toString());
});

/**
 * @openapi
 * '/agent_answer':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: This endpoint is called if agent answers outbound call initiated by /assignment.
 *     parameters:
 *       - in: path
 *         name: minutes
 *         schema:
 *           type: string
 *         required: true
 *         description: number of minutes for call
 *       - in: path
 *         name: taskSid
 *         schema:
 *           type: string
 *         required: true
 *         description: task sid
 *       - in: path
 *         name: friendlyName
 *         schema:
 *           type: string
 *         required: true
 *         description: user's name
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/agent_answer", shouldValidate, async function (req, res) {
  parameters = urlSerializer.deserialize(req);
  const minutes = parameters.minutes;
  console.log("endpoint: agent_answer");
  url = urlSerializer.serialize("agent_answer_process", parameters);
  redirectUrl = urlSerializer.serialize("agent_answer_hangup", parameters);
  console.log("/agent_answer url: " + url);
  console.log("/agent_answer redirectUrl: " + redirectUrl);
  const response = new VoiceResponse();
  //check if inbound caller has hung up in the meantime by checking if task is canceled
  taskIsCanceled = await taskrouter.taskIsCanceled(parameters.taskSid);
  console.log("agent_answer: taskIsCanceled = " + taskIsCanceled);
  //disconnect if caller disconnected.  no need to cancel reservation
  //as is done at agent_answer_hangup because this is already handled by taskrouter
  //in response to inbound caller's hangup
  if (taskIsCanceled) {
    twimlBuilder.say(
      response,
      "The caller disconnected already.  I'm sorry for the interruption.  Good-bye."
    );
    response.hangup();
  } else {
    const gather = response.gather({
      input: "dtmf speech",
      hints: "yes,no",
      speechTimeout: "auto",
      speechModel: "numbers_and_commands",
      numDigits: 1,
      action: url,
      method: "GET",
      timeout: 5,
    });
    twimlBuilder.say(gather, "Hello, " + parameters.friendlyName);
    response.pause({
      length: 1,
    });
    twimlBuilder.say(
      gather,
      "Would you like a Vent call for " +
        minutes +
        "minutes? Say yes, or press 1, to accept.  Say no, or press 2, to refuse."
    );
    response.redirect({ method: "GET" }, redirectUrl);
  }
  res.send(response.toString());
});

/**
 * @openapi
 * '/incomingCallEvents':
 *  post:
 *     tags:
 *     - Conference Call
 *     summary: This endpoint is called if agent answers outbound call initiated by /assignment.
 *     parameters:
 *       - in: body
 *         name: CallStatus
 *         schema:
 *           type: string
 *         required: true
 *         description: call status
 *       - in: path
 *         name: From
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's phone number
 *       - in: path
 *         name: StatusCallbackEvent
 *         schema:
 *           type: string
 *         required: true
 *         description: status callback event name
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/incomingCallEvents", shouldValidate, async function (req, res) {
  event = req.body.StatusCallbackEvent;
  console.log("/incomingCallEvents:");
  console.log(JSON.stringify(req.body));

  if (
    req.body.CallStatus == "completed" &&
    req.body.From != process.env.TWILIO_PHONE_NUMBER
  ) {
    var workerEntity = await worker.getWorkerEntityFromContact_uri(
      req.body.From
    );
    if (workerEntity == null) {
      throw (
        "/incomingCallEvents: error: no workerEntity found for contact_uri " +
        req.body.From
      );
    }
    var updateResult = await worker.updateWorkerActivityFromSid(
      workerEntity.sid,
      process.env.TWILIO_OFFLINE_SID
    );
    worker.messageWorkerUnavailable(workerEntity.friendlyName, req.body.From);
  }
});

/**
 * @openapi
 * '/conferenceEvents':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: This endpoint is called if agent answers outbound call initiated by /assignment.
 *     parameters:
 *       - in: path
 *         name: conferenceSid
 *         schema:
 *           type: string
 *         required: true
 *         description:
 *       - in: query
 *         name: ConferenceSid
 *         schema:
 *           type: string
 *         required: true
 *         description: conference sid
 *       - in: query
 *         name: CallSid
 *         schema:
 *           type: string
 *         required: true
 *         description: call sid
 *       - in: query
 *         name: taskSid
 *         schema:
 *           type: string
 *         required: true
 *         description: task sid
 *       - in: query
 *         name: StatusCallbackEvent
 *         schema:
 *           type: string
 *         required: true
 *         description: status callback event name
 *       - in: query
 *         name: minutes
 *         schema:
 *           type: string
 *         required: true
 *         description: number of minutes for call
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/conferenceEvents", shouldValidate, async function (req, res) {
  var responseValue = "";
  var callSid;
  var outboundCallSid;
  var participants;
  var parameters;
  var event;
  var conferenceSid;
  try {
    parameters = urlSerializer.deserialize(req);
    event = req.query.StatusCallbackEvent;
    conferenceSid = req.query.ConferenceSid;
    console.log("/conferenceEvents: conference event: " + event);
    console.log("/conferenceEvents: req.query: " + JSON.stringify(req.query));
    callSid = req.query.CallSid;
    console.log("/conferenceEvents: callSid: " + callSid);
    console.log(
      "/conferenceEvents: now listing conference participants' callSids for conferenceSid " +
        conferenceSid +
        ":"
    );
    participants = await conference.getParticipants(conferenceSid);
    console.log(
      "/conferenceEvents: participants length " +
        participants.length +
        " for conferenceSid " +
        conferenceSid
    );
    for (index = 0; index < participants.length; index++) {
      var participant = participants[index];
      console.log(
        "/conferenceEvents: participant callSid: " + participant.callSid
      );
      if (participant.callSid != parameters.callSid) {
        outboundCallSid = participant.callSid;
      }
    }
    parameters.conferenceSid = conferenceSid;
    console.log(
      "/conferenceEvents: end of try() pre-switch code for conferenceSid " +
        conferenceSid
    );
  } catch (err) {
    console.log("/conferenceEvents: error during pre-switch code: " + err);
  }
  switch (event) {
    case "conference-start":
      initialMinutes = parameters.minutes;
      conference.announce(conferenceSid, initialMinutes);
      conference.setTimedAnnounce(
        initialMinutes,
        initialMinutes / 2,
        conferenceSid
      );
      if (initialMinutes > 3) {
        conference.setTimedAnnounce(
          initialMinutes,
          initialMinutes - 1,
          conferenceSid
        );
      }
      conference.setTimedEndConference(initialMinutes, parameters);
      //conference.insertConference(parameters.callSid,outboundCallSid,parameters.callerWorkerSid,parameters.workerSid,conferenceSid);
      break;
    case "participant-join":
      //todo:add participant's callSid and workerSid to conference_participant
      var workerSid = await worker.getWorkerSidFromCallSid(callSid);
      console.log("/conferenceEvents: workerSid: " + workerSid);
      var insertResult = await conference.insertConferenceParticipant(
        workerSid,
        callSid,
        conferenceSid
      );
      break;
    case "participant-leave":
      console.log(
        "/conferenceEvents: now ending conference, starting with endConferenceAnnounce..."
      );

      conference.endConferenceAnnounce(
        parameters,
        "conferenceAnnounceEnd_participantLeave"
      );
      //conference.endConferenceTask(req.query.ConferenceSid,parameters.taskSid,'conferenceAnnounceEnd_participantLeave');
      break;
    case "conference-end":
      console.log(
        "/conferenceEvents: about to run conference.endConferenceTask"
      );
      conference.endConferenceTask(parameters.taskSid);
      responseValue = "";
      break;
    default:
      responseValue = "";
  }

  res.type("application/json");
  if (responseValue == "") {
    res.status(200).send();
  } else {
    console.log("conferenceEvents: sending responseValue");
    res.send(responseValue);
  }
});

/**
 * @openapi
 * '/updateCallToConference':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Generate a conference call.
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/updateCallToConference", shouldValidate, function (req, res) {
  parameters = urlSerializer.deserialize(req);
  console.log(
    "/updateCallToConference: about to generate conference transfer twiml"
  );
  var response = conference.generateConference(parameters, null);
  console.log(
    "/updateCallToConference: conference transfer twiml: " + response.toString()
  );
  res.send(response.toString());
});

/**
 * @openapi
 * '/agent_answer_process':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Generate a conference call.
 *     parameters:
 *       - in: query
 *         name: Digits
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's phone number
 *       - in: query
 *         name: SpeechResult
 *         schema:
 *           type: object
 *         required: true
 *         description: caller's voice result
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *       - in: path
 *         name: callSid
 *         schema:
 *           type: string
 *         required: true
 *         description: call sid
 *       - in: path
 *         name: taskSid
 *         schema:
 *           type: object
 *         required: true
 *         description: caller's voice result
 *       - in: path
 *         name: reservationSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/agent_answer_process", shouldValidate, async function (req, res) {
  console.log("endpoint: agent_answer_process");
  console.log("/agent_answer_process: req.query: " + JSON.stringify(req.query));
  parameters = urlSerializer.deserialize(req);
  redirectUrl = urlSerializer.serialize("agent_answer", parameters);
  conferenceUpdateUrl = urlSerializer.serialize(
    "updateCallToConference",
    parameters
  );
  var response = new VoiceResponse();
  //todo: this digits vs. speechresult should be in its own class since it's also used in processGatherConferenceMinutes
  //actually, the whole processing gathered speech/text input should be in a GatherProcessor class
  //similar to the TwimlBuilder
  var userInput;
  if (req.query.hasOwnProperty("Digits")) {
    userInput = req.query.Digits;
  } else if (req.query.hasOwnProperty("SpeechResult")) {
    userInput = req.query.SpeechResult;
  } else {
    throw "/agent_answer_process: error: no 'Digits' or 'SpeechResult' property present";
  }
  switch (userInput) {
    case "1":
    case "Yes.":
      //prepare twiml to put agent into conference
      response = conference.generateConference(
        parameters,
        "Thank you.  You will now be connected to the caller."
      );

      console.log("worker accepted call");
      //put caller into conference
      client
        .calls(parameters.callSid)
        .update({
          url: conferenceUpdateUrl,
          method: "GET",
        })
        .then((call) => {
          console.log(
            "/agent_answer_process: inbound call has been updated to conference, now updating reservation to 'accepted'"
          );
          clientWorkspace
            .tasks(parameters.taskSid)
            .reservations(parameters.reservationSid)
            .update({
              reservationStatus: "accepted",
            })
            .then((reservation) => {
              console.log(
                "/agent_answer_process: reservation updated to 'accepted'"
              );
              console.log(
                "reservation status: " + reservation.reservationStatus
              );
              console.log("worker name: " + reservation.workerName);
              workerEntity = worker.updateWorkerActivityFromSid(
                parameters.workerSid,
                process.env.TWILIO_BUSY_SID,
                false
              );
            })
            .catch((err) =>
              console.log(
                "/agent_answer_process: error updating reservation to 'accepted': " +
                  err
              )
            );
        })
        .catch((err) =>
          console.log(
            "/agent_answer_process: error updating inbound call to conference: " +
              err
          )
        );
      break;
    case "2":
    case "No.":
      //todo:move this into GatherProcessor so the same rejection can be called either if the worker refuses
      //or there are multiple unclear inputs
      twimlBuilder.say(
        response,
        "Thanks for letting me know that you're not available.  Goodbye!"
      );
      response.hangup();
      console.log("worker rejected call");
      try {
        var reservation = await clientWorkspace
          .workers(parameters.workerSid)
          .reservations(parameters.reservationSid)
          .update({
            reservationStatus: "rejected",
          });

        console.log("reservation status: " + reservation.reservationStatus);
        console.log("worker name: " + reservation.workerName);
      } catch (err) {
        console.log(
          "/agent_answer_process: error updating reservation to rejected: " +
            err
        );
      }
      break;
    default:
      twimlBuilder.say(
        response,
        "I'm sorry, I didn't understand your response."
      );
      response.redirect({ method: "GET" }, redirectUrl);
  }
  res.send(response.toString());
});

/**
 * @openapi
 * '/assignment':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Generate a conference call.
 *     parameters:
 *       - in: body
 *         name: taskSid
 *         schema:
 *           type: string
 *         required: true
 *         description: task sid
 *       - in: body
 *         name: reservationSid
 *         schema:
 *           type: string
 *         required: true
 *         description: reservation sid
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *       - in: body
 *         name: callSid
 *         schema:
 *           type: string
 *         required: true
 *         description: call sid
 *       - in: body
 *         name: taskQueueSid
 *         schema:
 *           type: string
 *         required: true
 *         description: task queue sid
 *       - in: body
 *         name: minutes
 *         schema:
 *           type: string
 *         required: true
 *         description: number of minutes for call
 *       - in: body
 *         name: fromNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's phone number
 *       - in: body
 *         name: callerWorkerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: caller worker sid
 *       - in: body
 *         name: contact_uri
 *         schema:
 *           type: string
 *         required: true
 *         description: contact uri
 *       - in: body
 *         name: friendlyName
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's name
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/assignment", shouldValidate, async function (req, res) {
  console.log("task attributes: " + req.body.TaskAttributes);
  console.log("worker attributes: " + req.body.WorkerAttributes);
  console.log("reservation sid: " + req.body.ReservationSid);
  taskSid = req.body.TaskSid;
  console.log("task sid: " + taskSid);
  TaskAttributes = JSON.parse(req.body.TaskAttributes);
  callSid = TaskAttributes.call_sid;
  fromNumber = TaskAttributes.from;
  callerWorkerSid = TaskAttributes.callerWorkerSid;
  minutes = TaskAttributes.minutes;
  console.log("call sid: " + callSid);
  reservationSid = req.body.ReservationSid;
  WorkerAttributes = JSON.parse(req.body.WorkerAttributes);
  contact_uri = WorkerAttributes.contact_uri;
  workerSid = req.body.WorkerSid;
  taskQueueSid = req.body.TaskQueueSid;
  var workerEntity = await clientWorkspace.workers(workerSid).fetch();
  friendlyName = workerEntity.friendlyName;
  console.log("contact_uri: " + contact_uri);
  parameters = {
    taskSid: taskSid,
    reservationSid: reservationSid,
    callSid: callSid,
    workerSid: workerSid,
    taskQueueSid: taskQueueSid,
    minutes: minutes,
    fromNumber: fromNumber,
    callerWorkerSid: callerWorkerSid,
    contact_uri: contact_uri,
    friendlyName: friendlyName,
  };
  url = urlSerializer.serialize("agent_answer", parameters);
  outboundUrl = urlSerializer.serialize("outboundCallEvent", parameters);
  switch (taskQueueSid) {
    case process.env.TWILIO_TASKQUEUE_SID:
      var call;
      try {
        console.log(
          "/assignment: now redirecting caller with wait notification"
        );
        var notifyCaller = client
          .calls(parameters.callSid)
          .update({
            method: "POST",
            url: process.env.APP_BASE_URL + "/redirectToWait",
          })
          .then((call) => {
            console.log("/assignment: call redirected: call.sid " + call.sid);
          })
          .catch((err) => {
            console.log("/assignment: call redirect error: " + err);
          });

        var call = await client.calls.create({
          url: url,
          to: contact_uri,
          from: process.env.TWILIO_PHONE_NUMBER,
          method: "GET",
          statusCallback: outboundUrl,
          statusCallbackMethod: "GET",
          statusCallbackEvent: ["completed"],
        });
        console.log(
          "/assignment: logging return value of client calls create, 'to' value " +
            call.to
        );
        var outboundCallSid = call.sid;
        console.log("/assignment: outbound call sid " + outboundCallSid);
        var result = await worker.insertCallSidWorkerSid(
          outboundCallSid,
          workerSid
        );
        if (result != null) {
          console.log("/voice: insertCallSidWorkerSid failed: " + result);
        }
      } catch (err) {
        console.log(err);
        throw err;
      }
      break;
    case process.env.TWILIO_TASKQUEUE_AUTOMATIC_SID:
      clientWorkspace
        .tasks(parameters.taskSid)
        .reservations(parameters.reservationSid)
        .update({
          reservationStatus: "accepted",
        })
        .then((reservation) => {
          console.log("reservation status: " + reservation.reservationStatus);
          console.log("worker name: " + reservation.workerName);
          automaticUrl = urlSerializer.serialize("automatic", parameters);
          client
            .calls(callSid)
            .update({ method: "GET", url: automaticUrl })
            .then((call) =>
              console.log(
                "/assignment: updating call to automatic response: " + call.from
              )
            )
            .catch((err) =>
              console.log(
                "/assignment: error updating call to automatic response: " + err
              )
            );
        })
        .catch((err) =>
          console.log("/assignment: error accepting reservation: " + err)
        );
      break;
  }

  res.type("application/json");
  res.status(200).send({
    error: "an error occurred in sending response to assignment callback",
  });
});

/**
 * @openapi
 * '/outboundCallEvent':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Generate a conference call.
 *     parameters:
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/outboundCallEvent", shouldValidate, async function (req, res) {
  var response = new VoiceResponse();
  parameters = urlSerializer.deserialize(req);
  switch (req.query.CallStatus) {
    case "completed":
    case "busy":
    case "no-answer":
      var workerEntity = await worker.updateWorkerActivityFromSid(
        parameters.workerSid,
        process.env.TWILIO_OFFLINE_SID
      );
      worker.messageWorkerUnavailable(workerEntity.friendlyName, req.query.To);
      break;
  }
  res.send(response.toString());
});

/**
 * @openapi
 * '/endCall_automatic':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: Generate a conference call.
 *     parameters:
 *       - in: path
 *         name: workerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/endCall_automatic", shouldValidate, function (req, res) {
  console.log("/endCall_automatic: now hanging up");
  var response = new VoiceResponse();
  response.hangup();
  res.send(response.toString());
});

/**
 * @openapi
 * '/automatic':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary: this endpoint is called when there are no valid live agents remaining to accept the call and the task falls through to the automatic queue
 *     parameters:
 *       - in: path
 *         name: fromNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: requester's phone number
 *       - in: path
 *         name: taskSid
 *         schema:
 *           type: string
 *         required: true
 *         description: task sid
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/automatic", shouldValidate, async function (req, res) {
  parameters = urlSerializer.deserialize(req);
  var response = new VoiceResponse();
  var url = urlSerializer.serialize("endCall_automatic", parameters);
  twimlBuilder.say(
    response,
    "We're sorry, no one is available to take your call.  I will notify you by text message when a receiver becomes available.  Good-bye."
  );
  response.hangup();
  workerSid = await worker.getWorkerSid(parameters.fromNumber);
  console.log("/automatic: workerSid: " + workerSid);
  console.log("/automatic: now creating available notification request");
  availableNotifier.create(workerSid);

  //consider task completed once automatic response finishes
  clientWorkspace
    .tasks(parameters.taskSid)
    .update({
      assignmentStatus: "completed",
    })
    .then((task) => {
      console.log("task status: " + task.assignmentStatus);
    })
    .catch((err) =>
      console.log("/automatic: update task to completed: error: " + err)
    );

  res.send(response.toString());
});

/**
 * @openapi
 * '/processAutomatic':
 *  get:
 *     tags:
 *     - Conference Call
 *     summary:
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/processAutomatic", shouldValidate, function (req, res) {});

/**
 * @openapi
 * '/workspaceEvent':
 *  post:
 *     tags:
 *     - Conference Call
 *     summary: this endpoint is called when there are no valid live agents remaining to accept the call and the task falls through to the automatic queue
 *     parameters:
 *       - in: body
 *         name: EventType
 *         schema:
 *           type: string
 *         required: true
 *         description: event type
 *       - in: body
 *         name: EventDescription
 *         schema:
 *           type: string
 *         required: true
 *         description: event description
 *       - in: body
 *         name: EventDate
 *         schema:
 *           type: string
 *         required: true
 *         description: event date
 *       - in: body
 *         name: ResourceSid
 *         schema:
 *           type: string
 *         required: true
 *         description: resouece sid
 *       - in: body
 *         name: WorkerSid
 *         schema:
 *           type: string
 *         required: true
 *         description: worker sid
 *     responses:
 *       200:
 *         description: Success
 */
app.post("/workspaceEvent", shouldValidate, async function (req, res) {
  eventType = req.body.EventType;
  eventDescription = req.body.EventDescription;
  eventDate = req.body.EventDate;
  resourceType = req.body.ResourceType;
  resourceSid = req.body.ResourceSid;
  console.log(
    "Event Details:\n" +
      eventType +
      "\n" +
      eventDescription +
      "\n" +
      eventDate +
      "\n" +
      resourceType +
      "\n" +
      resourceSid
  );
  var workerSid;
  switch (eventType) {
    case "reservation.rejected":
      console.log(
        "/workspaceEvent: reservation rejected, worker will be set offline"
      );
      workerSid = req.body.WorkerSid;
      console.log(
        "/workspaceEvent: workerSid " + workerSid + " now being set to offline"
      );
      var updateResult = await worker.updateWorkerActivityFromSid(
        workerSid,
        process.env.TWILIO_OFFLINE_SID,
        true
      );
      if (updateResult != null) {
        worker.messageWorkerUnavailable(
          updateResult.friendlyName,
          updateResult.contact_uri
        );
      }
      break;
    case "worker.activity.update":
      if (eventDescription.includes("updated to Idle Activity")) {
        workerSid = resourceSid;
        availableNotifier.iterateSend(workerSid);
      }
      break;
  }

  if (taskrouter != null) {
    try {
      taskrouter.logEvent(req.body);
    } catch (err) {
      console.log("/workspaceEvent: Event logging error: " + err);
    }
  } else {
    console.log("/workspaceEvent: taskrouter is null, no event logged");
  }

  res.type("application/json");
  res
    .status(204)
    .send({ error: "error occurred in processing workspace event callback" });
});

/**
 * @openapi
 * '/':
 *  get:
 *     tags:
 *     summary: Root route
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/", function (req, res, next) {
  res.status(200).json({ status: "up" });
});

app.listen(http_port, async () => {
  console.log(`app listening on port ${http_port}`);
  console.log("Configuring incoming call urls...");
  baseUrl = process.env.APP_BASE_URL;

  function checkWebhookUrl(req, result, next) {
    let data = false;
    let errMsg = `Error - Current webhook URL is not configured or working properly - ${baseUrl}`;
    if (data === false) {
      fetch(baseUrl)
        .then((res) => {
          if (res.ok) {
            console.log(`Webhook URL configured properly!`);
            data = true;
            return res;
          } else throw new Error(errMsg);
        })
        .catch(() => {
          throw new Error(errMsg);
        });
    } else {
      next();
    }
  }

  checkWebhookUrl();

  incoming_phone_number = await client
    .incomingPhoneNumbers(process.env.TWILIO_PHONE_NUMBER_SID)
    .update({
      smsUrl: baseUrl + "/sms",
      voiceUrl: baseUrl + "/voice",
      statusCallback: baseUrl + "/incomingCallEvents",
    });
  console.log(incoming_phone_number.friendlyName);

  console.log("Configuring workspace...");
  clientWorkspace = client.taskrouter.workspaces(workspaceSid);
  worker = new Worker(clientWorkspace);
  sms = new Sms(worker);
  membershipRequester = new MembershipRequester(client, worker, sms);
  taskrouter = new Taskrouter(clientWorkspace);
  conference = new Conference(client, clientWorkspace);
  taskrouter.configureWorkspace();
  workflow = await taskrouter.configureWorkflow();
  console.log("returned from configureWorkflow");
  textsplitter.splitTextFromFile("./docs/critiqueofpurereason.txt");
});
