require('env2')('.env');
const Sequelize = require('sequelize');

const sequelize=new Sequelize(process.env.database,process.env.username,process.env.password,{
	dialect:'postgres',
	dialectOptions:{
		ssl:parseSSLEnvVar()
	}
});

//todo: is there a way to incorporate the boolean parse into the class?
//maybe make const sequelize into a this.sequelize, and move this function into
//the class definition?
function parseSSLEnvVar(){
	sequelize_ssl=process.env.SEQUELIZE_SSL.toLowerCase();
	switch(sequelize_ssl){
		case 'true':
			return true;
			break;
		case 'false':
			return false;
			break;
		default:
			throw "Invalid value '"+process.env.SEQUELIZE_SSL+"' for process.env.SEQUELIZE_SSL, must be 'true' or 'false'";
	}
}

class Database{
	
	createWorker(worker){
		const attributes=JSON.parse(worker.attributes);
		const contact_uri=attributes.contact_uri;
		console.log("createWorker: now attempting sequelize insert worker");
		return sequelize.query("insert into worker (contact_uri,sid) values ('"+contact_uri+"','"+worker.sid+"')");
	}
	
	//following select query on Worker table, returns a promise as follows:
	//callerPhoneNumber found: caller's data row
	//callerPhoneNumber not found: null
	async getWorkerSid(contact_uri){
		var workerRow=await this.getRowFromWorkerTable(contact_uri);
		if (workerRow.length==0){
			return null;
		}
		else{
			return workerRow[0].sid;
		}
	}

	getRowFromWorkerTable(contact_uri){
		return sequelize.query("select * from worker where contact_uri='"+contact_uri+"'",
		{ type: sequelize.QueryTypes.SELECT});
	}

	async updateWorkerContact_uri(oldContact_uri,newContact_uri){
		var result= await sequelize.query("update worker set contact_uri='"+newContact_uri+"' where contact_uri='"+oldContact_uri+"'");
		if (result[1].rowCount==0){
			throw("updateWorkerContact_uri: error: no row updated");
		}
		else
		{
			return true;
		}
	}
	
	                                                           
}

module.exports=Database;
