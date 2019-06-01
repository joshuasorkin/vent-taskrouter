require('env2')('.env');
const Database=require('./database');
//todo: this class is too general.  It should be
//broken out into workspace.js, workflow.js, etc

const WorkflowConfigurer=require('./workflowConfigurer');

class Taskrouter{
	//workspace is an instance of Twilio workspace retrieved via client
	constructor(workspace){
		this.workspace=workspace;
		this.workflowConfigurer=new WorkflowConfigurer();
		//todo: should database be passed in instead of
		//creating a new connection here?
		this.database=new Database();
	}
	
	configureWorkspace(){
		return this.workspace
				.update({
					eventCallbackUrl:process.env.APP_BASE_URL+'/workspaceEvent'
				})
				.then(workspace=>{
					console.log("workspace update then");
				})
				.catch(err=>console.log("configureWorkspace error: "+err.message));
	}

	configureWorkflow(){
		const workflowSid=process.env.TWILIO_WORKFLOW_SID;
		const configurationJSON=this.workflowConfigurer.configurationJSON();
		console.log("configuration: "+JSON.stringify(configurationJSON));
		return this.workspace.workflows(workflowSid)
					.update({
						assignmentCallbackUrl:process.env.APP_BASE_URL+'/assignment',
						configuration:JSON.stringify(configurationJSON)
					})
                 .then(workflow => {
					 console.log("workflow update then:\n"+workflow.configuration);
					 return workflow;
				 })
				 .catch(err=>console.log("Error during workflow update: "+err));
	}
	
	async logEvent(reqBody){
		var result=await this.database.insertEvent(reqBody);
		return result;
	}


	//todo: this should be moved into worker.js
	updateWorker(contact_uri){
		activitySid=process.env.TWILIO_IDLE_SID;
		return workspace.workers
				.each({
					targetWorkersExpression:'contact_uri=="'+contact_uri+"'"
				},worker=>{
					console.log("worker friendlyname: "+worker.friendlyName);
					activitySid=process.env.TWILIO_IDLE_SID;
					worker.update({
						ActivitySid:activitySid
					})
					.then(worker=>{
						"worker updated to: "+worker.activityName;
						return "available";
					});
				});
	}

	async taskIsCanceled(taskSid){
		var task=await this.workspace.tasks(taskSid).fetch();
		console.log("taskIsCanceled: task status: "+task.assignmentStatus);
		return (task.assignmentStatus=='canceled');
	}

	async rejectReservation(workerSid,reservationSid){
		console.log("worker rejected call");
		return this.workspace
						.workers(workerSid)
						.reservations(reservationSid)
						.update({
							reservationStatus:'rejected'
						});
						/*
						.then(reservation=>{
							console.log("reservation status: "+reservation.reservationStatus);
							console.log("worker name: "+reservation.workerName);
						})
						*/
	}

	//todo: this function doesn't really belong in Taskrouter,
	//need to create a separate class for db admin functions
	async getFunctionalityStatus(functionality){
		var result=await database.getFunctionalityStatus(functionality);
		var logResult;
		switch(result){
			case null:
				logResult="no entry found for functionality '"+functionality+"'";
				break;
			case true:
				logResult="true";
				break;
			case false:
				logResult="false";
				break;
			default:
				logResult=result;
		}
		logResult="getFunctionalityStatus: "+functionality+" status:"+logResult;
		console.log(logResult);
		return result;
	}
	
}

module.exports=Taskrouter;