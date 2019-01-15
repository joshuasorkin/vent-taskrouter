require('env2')('.env');

const WorkflowConfigurer=require('./workflowConfigurer');

class Taskrouter{
	//workspace is an instance of Twilio workspace retrieved via client
	constructor(workspace){
		this.workspace=workspace;
		this.workflowConfigurer=new WorkflowConfigurer();
	}
	
	configureWorkflow(){
		const workflowSid=process.env.TWILIO_WORKFLOW_SID;
		const configurationJSON=this.workflowConfigurer.configurationJSON();
		console.log("configuration: "+JSON.stringify(configurationJSON));
		this.workspace.workflows(workflowSid)
					.update({
						assignmentCallbackUrl:process.env.APP_BASE_URL+'/assignment',
						configuration:configurationJSON
					})
                 .then(workflow => console.log(workflow.configuration))
                 .done();
	}
	
}

module.exports=Taskrouter;