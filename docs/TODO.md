high: needed for first prototype release

(high)
requests from test group:
-voice activation
-change chime
-change hold music to soothing music
-change do not contact request message to something clearer:
"press 1 to add them to do not contact list, press 2 to contact them again in the future"
-change final announcement to quick beep

(high)
when i add to do not contact from twilio console:
UnhandledPromiseRejectionWarning: SequelizeDatabaseError: value too long for type character varying(100)

(high)
what's going on with the timer messages?

(high)
if call ends prematurely, send text message to caller with "do-not-contact" option
to implement this:
--add "conference" table to db
--include field "do_not_contact_result", for now this can be boolean with nulls allowed
and it will be populated when user responds to do_not_contact prompt
--include fields "inboundCallSid","outboundCallSid"
--add row when both parties join conference
--if incomingCallEvent has "CallStatus":"completed" and "do_not_contact_result" is not populated
(note, will need to change the addBothToDoNotContact() to an await in process_postConferenceIVR
so that it completes before hanging up on user) then send SMS to user prompting them to respond with
ADDTODONOTCONTACT, for simplicity right now let's just have it only affect their most recent call if they
didn't send it on a previous call)

(high)
test admin password sms commands
--why is setadminpassword returning undefined error on success?

(high)
let user exit conference early by pressing "\*"
add this to pre-conference instructions

(high)
is there a way to avoid that initial "please wait..." before jumping to
"no one is available"? maybe the "please wait..." should be an interrupt to the caller's callSid

(high)
update vent-dev service to match vent service ExecStart

(high)
really need to mirror state in database so search can be done easily

(high) document all configuration:
--toroid.org git hook
--server port listener setup
--local git configuration
--twilio configuration

(high) when worker answers, sometimes the beginning of the say() is cut off

(medium)
instead of do_not_contact as a worker attribute, it should instead be in a database table,
so that the event logging table 'event' doesn't error when event.eventdescription has too many characters
(as it will when worker's do_not_contact array gets large enough)

(medium)
if receiver hangs up during transfer-into-conference, caller gets stuck on hold forever

(medium)
need to block certain sms commands from users who have calls in progress, e.g. "on" and "off"

(medium)
soft chime before each time warning, to make the voice less jarring

(medium)
sendall: text message to all users who have not opted out of alerts

(medium)
code commenting

(medium)
document Twilio's built-in commands in manual (e.g. HELP)

(medium)
change MANUAL text to be clearer about entering commands, e.g. "To enter a command, send a text to this number"

(medium)
until I transition to ORM, I can probably refactor all those SELECT functions
into one generalized function that gets arrays of column names and values passed to it
essentially i'm building my own ORM at that point, though

(medium)
set up unique constraint on adminPassword:workerId,adminTaskId,canceled=false
that way we can have many canceled but only one active password
and don't have to delete rows when we're creating a new password for that worker

(medium)
solve audio caching issue, using etag maybe?

(medium)
implement control panel for conference participants that doesn't require them
to temporarily exit conference with "\*":
-SMS (e.g. texting "exit" will remove the participant from
whatever conference they're currently in and take them to an IVR menu)
-Single page web app. not ideal given that my Android chrome browser tends to reload pages, but we could leave cookies
to keep it stateful. good for people whose mobile OS doesn't allow SMS during phone call. at this point might as well just
go over to an API that's better suited for TCP/IP voice conversations (whatever Facebook is using for their phone calls)

(medium)
allow erroneously created user to remove themselves by texting "remove"

(medium)
enable worker to deactivate themselves
this doesn't actually delete the worker,
instead it sets "active:false" attribute
so that they will not be included
in any communication (e.g. group SMS with system notification)

(medium)
continuously update state in database so that when/if server reboots, in-progress conversations remain uninterrupted

(medium)
give people each other's numbers if they both opt in?
or let them continue longer?

(medium) if no one is available, give user gather() option to continue interacting,
e.g. by recording a message

(medium) time economy:
-earning
-giving
-using

(medium) include password for git push to server

(medium) server questions:
how do I add an alias? can I write to .bashrc?

(medium) fix error when it tries to complete an already completed task

(medium) on startup, assign random number property to each worker,
and have workflow order by this number

(medium) use md5 hash to check password and contact_uri, no plaintext

(medium)
encryption checksum (not sure if this is strong enough for password)
each character [A-Za-z0-9] has an ascii value "n" and array position "x",
represent character as ((nth prime number) ^ x). multiplying all these
character values together gives password's hash value.
e.g. "abc" would be
(97th ^ 1) _ (98th ^ 2) _ (99th ^ 3)
=(509^1)_(521^2)_(523^3)
=19765067212828824

(medium)
sequelize: really need to move on to using ORM instead of raw queries, could clean up
the database class a lot

(medium)
do hashing in db instead of server, maybe faster that way

(medium)
chat coaching:
conversation expert is in coaching mode, so that as the conversation progresses,
they can give advice. if this is happening in the for-pay model where the caller is paying
the receiver, maybe a fraction of the payment goes to the expert

(medium)
if both caller and receiver opt in, they can connect their call to a third participant,
and then if all three opt in, they can add a fourth, and so on...

(medium)
spaces in usernames?

---done---

(high) when one participant leaves, remaining participant is routed to twiml:
say("the other participant has left the conference. Thank you, good-bye.")
hangup()

(high) if no worker available, route caller to twilio:
say("sorry, all listeners are unavailable at this time. Thank you, good-bye.")
then complete task

(high) when all time elapses, redirect both conference participants to twiml:
say("time's up. Thank you, good-bye.")
hangup()
make sure that task has completed

(high) verify that add a new worker is functioning correctly

(high) match constraints from worker database table with Taskrouter worker list:
unique contact_uri

(high) validation error when worker insert fails should be more descriptive:
"Worker with this contact_uri already exists" (since assumption is anyone inserting
worker is admin with correct password)

(high) worker.create needs to return correct value

(medium) set up IVR to get time request
use task attribute to store time

(low) check if caller is in list of users

(high) how to move on to next queue after all workers in queue reject call?

(high)
why is sms response message persisting?

(high)
worker.updateWorker is not a function

(high) if some workers are not Offline, but they are busy with other tasks, the workflow should treat them
as unavailable

(high)
is enqueue starting call after wait loop or immediately
-seems like it's starting after message informing user of wait loop

(high)
is worker receiving second call?
-doesn't seem to be, not sure why was seeing that in previous test

(high)
change random speech to random selection from text corpus

(high) verify sustained uptime 24 hr+

(high)
implement 'update' operation to update phone number in both Twilio and server database

(medium)
update event handler so that when setting user's status to "idle", it triggers
the availableNotifier

(high)
how to treat user when no one is available
-send notification when users are back on the system

(high)
send confirmation message to number when user is created
code added but still need to test

(high) ability to create "do not contact" list for each user
-will need to change caller's initial IVR endpoints from POST to GET because we'll need to pass
the caller's do_not_contact list to /processGatherConferenceMinutes so it can be added as a TaskAttribute
when the task is enqueued
-add target worker expression to workflow configuration:
worker.sid not in task.do_not_contact

(high)
right before generating each outbound call, saying "please wait, we are now calling a potential receiver"

(medium)
refactor /sms into sms.js

(medium)
change voice to something warmer

(high) deal with space parsing in sms commands
-spaces between items
-too many items in sms command
-how to have a space in username? for now let's have no spaces

(high)
add SMS commands (make sure not to use reserved command):
-"status" command that returns the following:
"There are [number] available listeners waiting for your call."
uses getCountOfIdleWorkers
-"directory"
lists each command and its syntax

(high)
send "directory" along with initial welcome message to new user (done, but need to test with new user)

(high) get domain so test users can see whether server is up

(high)
add event logging table to database,
populate from event handler

(high)
change wrap-up message to "do you want to add this person to your do-not-contact list?"

(high)
set caller to offline after call ends, with an indicating SMS

(high)
set worker to offline after they hang up, with an indicating SMS
other times when text message of user status should be sent:
-caller/agent hangs up (actually, maybe just the call disconnect event should be captured and then that's the only event
we need to send this message)
this is identified in req.body for incomingCallEvent as "CallStatus":"completed"
for outbound calls, can set up a statusCallbackEvent handler url as described at:
https://www.twilio.com/docs/voice/api/call#statuscallbackevent
once i set this up for the call status event changes, can remove from agent_answer_process...or can i?
technically it needs to happen after the status change occurs, though in practice the status change
for both parties occurred at the beginning of their call and they would have thrown an error at that time.
so probably safe to send the SMS when the call terminates

appInitializer
should all the routes files go into /lib ?

browserRoutes
//todo: this is a duplicate of the function in database.js, need to refactor
//todo: is there a way to incorporate the boolean parse into the class?
//maybe make const sequelize into a this.sequelize, and move this function into
//the class definition?
//Add forgot password functionality
//Add email confirmation functionality
//Add edit account page
