require('env2')('.env');
const Sequelize = require('sequelize');

const sequelize=new Sequelize(process.env.database,process.env.username,process.env.password,{
	dialect:'postgres',
	dialectOptions:{
		ssl:true
	}
});

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
	
	                                                           
}

module.exports=Database;
