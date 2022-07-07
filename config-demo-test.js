const Command = require('./config-demo-command');

const command = new Command();

command.runCommand("setTrue");
command.runCommand("show");
command.runCommand("setFalse");
command.runCommand("show");