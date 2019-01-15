require('env2')('.env');

const queueSid=process.env.TWILIO_TASKQUEUE_SID;
console.log("queuesid:"+queueSid);
class WorkflowConfigurer{	
	configurationJSON(){
		var config={
			"task_routing":{
				"filters":[
					{
						"filter_friendly_name":"don't call self",
						"expression":"1==1",
						"targets":[
							{
								"queue":queueSid,
								"expression":"task.caller!=worker.contact_uri"
							}
						]
						
					}
				],
				"default_filter":{
					"queue":queueSid
				}
			}
		}
		return config;
	}
}

module.exports=WorkflowConfigurer;