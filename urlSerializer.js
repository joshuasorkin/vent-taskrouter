const querystring=require('querystring');
require('env2')('.env');


class UrlSerializer{
	
	constructor(){
		this.paramArrayName="parameters";
	}
	
	serialize(endpoint,paramArray){
		var url=process.env.APP_BASE_URL+"/"+endpoint;
		return url+"?"+querystring.stringify({[this.paramArrayName]:JSON.stringify(paramArray)});
	}

	deserialize(req){
		return JSON.parse(req.query[this.paramArrayName]);
	}
	
}

module.exports=UrlSerializer;