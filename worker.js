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
	
	
	async updateWorkerActivity(contact_uri,activitySid,rejectPendingReservations){
		console.log("updateWorkerActivity: getting workerSid from database");
		var workerSid=await database.getWorkerSid(contact_uri);
		console.log("updateWorkerActivity: workerSid is "+workerSid);
		var workerEntity=await this.updateWorkerFromSid(workerSid,activitySid,rejectPendingReservations);
		console.log("updateWorkerActivity: worker's friendlyName is "+workerEntity.friendlyName);
		return workerEntity;
	}

	async updateWorkerName(contact_uri,newName){
		console.log("updateWorkerName: getting workerSid from database");
		var workerSid=await database.getWorkerSid(contact_uri);
		console.log("updateWorkerName: workerSid is "+workerSid);
		var workerEntity=await this.workspace.workers(workerSid)
						.update({
							friendlyName:newName
						})
						.catch(err=>console.log("updateWorkerName: error: "+err));
		console.log("updateWorkerName: worker's new friendlyName is "+workerEntity.friendlyName);
		return workerEntity;

	}

	async updateWorkerActivityFromSid(workerSid,activitySid,rejectPendingReservations){
		var workerEntity;
		try{
			workerEntity=await this.workspace.workers(workerSid)
						.update({
							activitySid:activitySid,
							rejectPendingReservations:rejectPendingReservations
						})
						.catch(err=>console.log("updateWorkerFromSid: error updating worker activity: "+err));
			console.log("updateWorkerFromSid: worker has been updated to activity: "+workerEntity.activityName);
			return workerEntity;
		}
		catch(err){
			console.log("updateWorkerFromSid error: "+err);
		}
		finally{
			return workerEntity;
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
