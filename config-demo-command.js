const fs = require('fs');
const commands = fs.readFileSync('config-demo.json');

class Command{
    constructor(){
        let rawData = fs.readFileSync('config-demo.json');
        this.commands = JSON.parse(rawData);
        this.value = true;
        console.log(this.commands);
        Object.keys(this.commands).forEach(key =>{
            console.log(key);
            this.commands[key].command = this[key].bind(this);
        });
//        this.commands.setTrue.command = this["setTrue"].bind(this);
//        this.commands.setFalse.command = this["setFalse"].bind(this);
//        this.commands.show.command = this["show"].bind(this);
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