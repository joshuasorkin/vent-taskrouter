"use strict";

var express = require("express"),
  router = express.Router(),
  VoiceResponse = require("twilio/lib/twiml/VoiceResponse");

module.exports = function (app) {
  /**
   * @openapi
   * '/call/incoming':
   *  post:
   *     tags:
   *     - Call
   *     summary: Twilio webhook for incoming call
   *     parameters:
   *     responses:
   *       200:
   *         description: Success
   */
  router.post("/incoming/", function (req, res) {
    //create new voice response
    var twimlResponse = new VoiceResponse();
    //voice response prompts user to enter a digit
    //this digit is then sent to /call/enqueue for processing
    var gather = twimlResponse.gather({
      numDigits: 1,
      action: "/call/enqueue",
      method: "POST",
    });
    gather.say(
      "For Programmable SMS, press one. For Voice, press any other key."
    );
    res.type("text/xml");
    res.send(twimlResponse.toString());
  });

  /**
   * @openapi
   * '/call/enqueue':
   *  post:
   *     tags:
   *     - Call
   *     summary: Enqueue call
   *     parameters:
   *       - in: body
   *         name: Digits
   *         schema:
   *           type: string
   *         required: true
   *         description: input from user keypad
   *     responses:
   *       200:
   *         description: Success
   */
  router.post("/enqueue/", function (req, res) {
    var pressedKey = req.body.Digits;
    var twimlResponse = new VoiceResponse();
    var selectedProduct =
      pressedKey === "1" ? "ProgrammableSMS" : "ProgrammableVoice";
    var enqueue = twimlResponse.enqueueTask({
      workflowSid: app.get("workspaceInfo").workflowSid,
    });
    enqueue.task({}, JSON.stringify({ selected_product: selectedProduct }));

    res.type("text/xml");
    res.send(twimlResponse.toString());
  });

  // POST
  /**
   * @openapi
   * '/call/assignment':
   *  post:
   *     tags:
   *     - Call
   *     summary: Dequeue call
   *     parameters:
   *     responses:
   *       200:
   *         description: Success
   */
  router.post("/assignment/", function (req, res) {
    res.type("application/json");
    res.send({
      instruction: "dequeue",
      post_work_activity_sid: app.get("workspaceInfo").activities.idle,
    });
  });

  return router;
};
