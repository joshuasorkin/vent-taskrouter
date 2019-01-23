require('env2')('.env');
const Worker=require('./worker');

var worker=new Worker();

worker.addAllWorkersToDatabase();