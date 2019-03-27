require('env2')('.env');

const queueSid=process.env.TWILIO_TASKQUEUE_SID;
const automaticQueueSid=process.env.TWILIO_TASKQUEUE_AUTOMATIC_SID;
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
								//"expression":"(task.caller!=worker.contact_uri) and (worker.sid NOT IN task.rejectedWorkers)",
								"expression":"task.caller!=worker.contact_uri",
								"skip_if": "workers.available == 0"
							},
							{
								"queue":automaticQueueSid
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