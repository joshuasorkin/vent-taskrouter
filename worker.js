require('env2')('.env');
const Database=require('./database')
var database=new Database();

class Worker{
	constructor(workspace){
		this.workspace=workspace;
	}
	
	create(contact_uri,friendlyName){
		return this.workspace.workers
					.create({attributes: JSON.stringify({
						languages: 'en',
						contact_uri: contact_uri
					}), friendlyName: friendlyName})
					.then(worker=>{
						return database.createWorker(worker)
						.then(result=>result);
					})
					.catch(err=>{
						console.log(err);
						return "Error: "+err.message;
					});
	}
	
	addAllWorkersToDatabase(){
		this.workspace.workers
			.each(worker=>{
				database.createWorker(worker);
			});
	}
	
	
	updateWorker(contact_uri,activitySid){
		database.getWorkerSid(contact_uri)
		.then(workerSid=>{
			console.log("workerSid is "+workerSid);
			this.workspace.workers(workerSid)
				.update({
					ActivitySid:activitySid
				})
				.then(worker=>{
					worker
				})
				
				.catch(err=>console.log("updateWorker error: "+err));
		});
	}
	
}

module.exports=Worker;
