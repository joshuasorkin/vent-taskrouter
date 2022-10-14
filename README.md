# Vent Task Router

### Tech stack

- Front end: JavaScript web client, Twilio API for voice/touch-tone interface
- Back end: NodeJS, Twilio API for call processing
- Database: PostgreSQL

## Elevator Pitch

Vent connects users to provide on-demand fixed-duration conversation. It is primarily intended to solve the problem of finding a friend to offer peer support by selecting a receiver from a pool of available callers and ensuring that all parties have agreed in advance to a time limit for the conversation.

## Running Vent

```shell
$ npm install
$ npm start
```

## Basic Workflow

The basic functionality of the app is as follows:

A user wants to have a conversation of a certain length. They call the Vent phone number, and when prompted, enter the number of minutes of chat they would like. The service then calls available receivers (who have set themselves to "available" via SMS) one by one, letting them know how many minutes of chat the caller has requested, and offering them the opportunity to accept the call. When a receiver accepts, the caller and receiver are then placed into conference call for that length of time, and given periodic voice alerts letting them know how much time is remaining. At the end of the call, both can indicate whether they would like to be connected with each other in the future.

**Benefit to caller**: Experiencing the emotional validation of finding human connection during life experiences when they would otherwise be isolated or need to pursue complex social negotiation to find a conversation partner, while trusting that their time boundaries and anonymity are secure.

**Benefit to receiver**: Getting offered opportunities for human connection with emotionally invested callers and earning credit for making calls, while trusting that their time boundaries and anonymity are secure.
