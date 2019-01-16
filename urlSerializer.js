const querystring=require('querystring');
require('env2')('.env');


class UrlSerializer{
	serialize(endpoint,paramArray,paramArrayName){
		var url=process.env.APP_BASE_URL+"/"+endpoint;
		return url+"?"+querystring.stringify({[paramArrayName]:JSON.stringify(paramArray)});
	}

	deserialize(req,paramArrayName){
		return JSON.parse(req.query[paramArrayName]);
	}
	
}

module.exports=UrlSerializer;