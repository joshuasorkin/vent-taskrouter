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
		workerSid=await database.getWorkerSid(contact_uri)
		console.log("updateWorker: workerSid is "+workerSid);
		worker=this.updateWorkerFromSid(workerSid,activitySid);
		console.log("updateWorker: worker's friendlyName is "+worker.friendlyName);
		return worker;
	}

	async updateWorkerFromSid(workerSid,activitySid){
		var worker;
		try{
			worker=await this.workspace.workers(workerSid)
						.update({
							activitySid:activitySid
						});
			console.log("updateWorkerFromSid: worker has been updated to activity: "+worker.activityName);
			return worker;
		}
		catch(err){
			console.log("updateWorkerFromSid error: "+err);
		}
		finally{
			return worker;
		}

	}
	
}

module.exports=Worker;
