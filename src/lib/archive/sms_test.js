const Sms = require('../sms');

function createParameterObj_assert(){
    const sms = new Sms(null,null);
    const paramObj = sms.createParameterObj("body","from","workerEntity");
    const paramObj_test = {
        body:"body",
        from:"from",
        workerEntity:"workerEntity"
    }
    return (
        paramObj.body === paramObj_test.body &&
        paramObj.from === paramObj_test.from &&
        paramObj.workerEntity === paramObj_test.workerEntity
    )
}

function createCommandList_assert(){
    const sms = new Sms(null,null);
    console.log(sms.commandList);
}

console.log(createParameterObj_assert());
console.log(createCommandList_assert());

/*
var args=process.argv.slice(2);
var friendlyName=args[0];
var contact_uri=args[1];
var sms=new Sms();
sms.sendAddNotification(friendlyName,contact_uri);
*/