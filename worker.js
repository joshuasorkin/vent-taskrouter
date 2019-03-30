require('env2')('.env');
const Database=require('./database')
var database=new Database();

class Worker{
	constructor(workspace){
		this.workspace=workspace;
	}
	
	createWorker(contact_uri,friendlyName){
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
						return "Worker create error: "+err.message;
					});
	}
	
	addAllWorkersToDatabase(){
		this.workspace.workers
			.each(worker=>{
				database.createWorker(worker);
			});
	}
	
	
	async updateWorker(contact_uri,activitySid){
		console.log("updateWorker: getting workerSid from database");
		var workerSid=await database.getWorkerSid(contact_uri)
		console.log("updateWorker: workerSid is "+workerSid);
		var worker=await this.updateWorkerFromSid(workerSid,activitySid);
		console.log("updateWorker: worker's friendlyName is "+worker.friendlyName);
		return worker;
	}

	async updateWorkerFromSid(workerSid,activitySid){
		var worker;
		try{
			worker=await this.workspace.workers(workerSid)
						.update({
							activitySid:activitySid,
							RejectPendingReservations:true
						})
						.catch(err=>console.log("updateWorkerFromSid: error updating worker activity: "+err));
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

	async contact_uriExists(contact_uri){
		var workerSid=await database.getWorkerSid(contact_uri);
		console.log("contact_uriExists: workerSid "+workerSid);
		console.log("workerSid!=null: "+(workerSid!=null));
		return (workerSid!=null);
	}
	
}

module.exports=Worker;
