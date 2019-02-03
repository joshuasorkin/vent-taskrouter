require('env2')('.env');

const WorkflowConfigurer=require('./workflowConfigurer');

class Taskrouter{
	//workspace is an instance of Twilio workspace retrieved via client
	constructor(workspace){
		this.workspace=workspace;
		this.workflowConfigurer=new WorkflowConfigurer();
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
	
}

module.exports=Taskrouter;