const querystring=require('querystring');
require('env2')('.env');


class UrlSerializer{
	
	constructor(){
		this.paramArrayName="parameters";
	}
	
	serialize(endpoint,paramArray){
		var url=process.env.APP_BASE_URL+"/"+endpoint;
		console.log("urlSerializer base url: "+url);
		fullUrl=url+"?"+querystring.stringify({[this.paramArrayName]:JSON.stringify(paramArray)});
		console.log("urlSerializer full url: "+fullUrl);
		return fullUrl;
	}

	deserialize(req){
		return JSON.parse(req.query[this.paramArrayName]);
	}
	
}

module.exports=UrlSerializer;