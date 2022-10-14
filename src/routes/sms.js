"use strict";

var express = require("express"),
  router = express.Router(),
  twimlGenerator = require("../lib/twiml-generator");

module.exports = function (app) {
  /**
   * @openapi
   * '/sms/incoming':
   *  post:
   *     tags:
   *     - SMS
   *     summary: Process incoming SMS
   *     parameters:
   *       - in: body
   *         name: Body
   *         schema:
   *           type: string
   *         required: true
   *         description: SMS body
   *       - in: body
   *         name: From
   *         schema:
   *           type: string
   *         required: true
   *         description: SMS sender
   *     responses:
   *       200:
   *         description: Success
   */
  router.post("/incoming/", function (req, res) {
    var targetActivity =
      req.body.Body.toLowerCase() === "on" ? "idle" : "offline";
    var activitySid = app.get("workspaceInfo").activities[targetActivity];
    changeWorkerActivitySid(req.body.From, activitySid);
    res.type("text/xml");
    res.send(twimlGenerator.generateConfirmMessage(targetActivity));
  });

  function changeWorkerActivitySid(workerNumber, activitySid) {
    var accountSid = process.env.TWILIO_ACCOUNT_SID,
      authToken = process.env.TWILIO_AUTH_TOKEN,
      workspaceSid = app.get("workspaceInfo").workspaceSid,
      workerSid = app.get("workerInfo")[workerNumber],
      twilio = require("twilio"),
      client = require("twilio")(accountSid, authToken);

    //client = new twilio.TaskRouterClient(accountSid, authToken, workspaceSid);
    client.taskrouter
      .workspaces(workspaceSid)
      .workers(workerSid)
      .update({ activitySid: activitySid });
  }
  return router;
};
