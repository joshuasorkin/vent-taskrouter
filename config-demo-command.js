const fs = require('fs');
const commands = fs.readFileSync('config-demo.json');

class Command{
    constructor(){
        this.value = true;
        //let rawData = fs.readFileSync('config-demo.json');
        /*
        this.commands = JSON.parse(rawData);
        this.value = true;
        console.log(this.commands);
        Object.keys(this.commands).forEach(key =>{
            console.log(key);
            this.commands[key].command = this[key].bind(this);
        });
        */
       this.commands = this.buildCommands();
    }

    buildCommands(){
        let rawData = fs.readFileSync('config-demo.json');
        let commands = JSON.parse(rawData);
        console.log(commands);
        Object.keys(commands).forEach(key =>{
            console.log(key);
            commands[key].command = this[key].bind(this);
        });
        return commands;
    }

    setTrue(){
        this.value = true;
    }
    setFalse(){
        this.value = false;
    }
    show(){
        console.log(this.value);
    }
    runCommand(commandName){
        this.commands[commandName].command();
    }
}

module.exports = Command;