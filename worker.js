require('env2')('.env');
const Database=require('./database')
var database=new Database();

class Worker{
	constructor(workspace){
		this.workspace=workspace;
	}
	
	create(friendlyName,contact_uri){
		
	}
	
	addAllWorkersToDatabase(){
		workspace.workers
			.each(worker=>{
				database.createWorker(worker);
			});
	}
	
	
	
	
	async getWorkerSidFromDatabase(contact_uri){
		workerSid=await database.getWorkerSid(contact_uri);
		return workerSid;
	}
	
	updateWorker(contact_uri,activitySid){
		workerSid=this.getWorkerSidFromDatabase(contact_uri);
		
					
		return workspace.workers(workerSid)
					.update({
						ActivitySid:activitySid
					})
					.then(worker=>{
						"worker "+worker.friendlyName+" updated to: "+worker.activityName;
						return "available";
					});
				});
	}
	
}

module.exports=Worker;
