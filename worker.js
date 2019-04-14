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
		var workerEntity=await this.updateWorkerActivityFromSid(workerSid,activitySid,rejectPendingReservations);
		console.log("updateWorkerActivity: worker's friendlyName is "+workerEntity.friendlyName);
		return workerEntity;
	}

	async updateWorkerName(contact_uri,newName){
		console.log("updateWorkerName: getting workerSid from database");
		var workerSid=await database.getWorkerSid(contact_uri);
		if (workerSid==null){
			throw("updateWorkerName: error: workerSid not found for "+contact_uri);
		}


		console.log("updateWorkerName: workerSid is "+workerSid);
		var workerEntity=await this.workspace.workers(workerSid)
						.update({
							friendlyName:newName
						})
						.catch(err=>console.log("updateWorkerName: error: "+err));
		console.log("updateWorkerName: worker's new friendlyName is "+workerEntity.friendlyName);
		return workerEntity;

	}


	async updateWorkerNameFromSid(workerSid,newName){
		var workerEntity=await this.workspace.workers(workerSid)
						.update({
							friendlyName:newName
						})
						.catch(err=>console.log("updateWorkerNameFromSid: error: "+err));
		console.log("updateWorkerNameFromSid: worker's new friendlyName is "+workerEntity.friendlyName);
		return workerEntity;
	}

	async updateWorkerAddAttribute(workerSid,attributeName,attributeValue){
		var workerEntity=await this.workspace.workers
								.each(worker=>{
									console.log("friendlyName: "+worker.friendlyName);
								});
	}

	async updateWorkerActivityFromSid(workerSid,activitySid,rejectPendingReservations){
		var workerEntity=null;
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

	async updateContact_uri(oldContact_uri,newContact_uri){
		console.log("updateWorkerName: getting workerSid from database");
		var workerSid=await database.getWorkerSid(oldContact_uri);
		if (workerSid==null){
			throw("updateContact_uri: error: workerSid not found for "+oldContact_uri);
		}
		console.log("updateContact_uri: workerSid is "+workerSid);
		var dbResult=await database.updateWorkerContact_uri(oldContact_uri,newContact_uri);
		if (dbResult==null){
			//todo: is there a more efficient way to do this with a single call to worker?
			var attributes;
			var workerEntity;
			workerEntity=await this.workspace.workers(workerSid)
			.fetch()
			.then(workerObj=>attributes=workerObj.attributes);
			console.log("pre update");
			console.log(JSON.stringify(attributes));
			console.log("post update");
			attributes.contact_uri=newContact_uri;
			console.log(JSON.stringify(attributes));

			var workerEntity=await this.workspace.workers(workerSid)
			.update({
				attributes:JSON.stringify(attributes)
			})
			.catch(err=>console.log("updateContact_uri: error: "+err));
			console.log("updateContact_uri: worker's new contact_uri is "+workerEntity.attributes.contact_uri);
			return workerEntity;

		}
		else{
			console.log("updateContact_uri: dbResult is non-null, error: "+dbResult);
			return null;
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
