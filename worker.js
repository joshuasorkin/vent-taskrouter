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
	
	
	async updateWorker(contact_uri,activitySid){
		return await database.getWorkerSid(contact_uri)
				.then(workerSid=>{
					console.log("updateWorker: workerSid is "+workerSid);
					worker=this.updateWorkerFromWorkerSid(workerSid,activitySid);
					console.log("updateWorker: worker's friendlyName is "+worker.friendlyName);
					return worker;
				});
	}

	async updateWorkerFromWorkerSid(workerSid,activitySid){
		return await this.workspace.workers(workerSid)
					.update({
						activitySid:activitySid
					})
					.then(worker=>{
						console.log("updateWorkerFromWorkerSid: worker has been updated to activity: "+worker.activityName);
						return worker;
					})
					.catch(err=>console.log("updateWorkerFromWorkerSid error: "+err));

	}
	
}

module.exports=Worker;
