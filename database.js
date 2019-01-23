require('env2')('.env');
const Sequelize = require('sequelize');

const sequelize=new Sequelize(process.env.database,process.env.username,process.env.password,{
	dialect:'postgres'
});

/*
var Agent=sequelize.define('agent',{},{
	freezeTableName:true,
	tableName: 'agent'
});

updateValues={available:false};
Agent.update(updateValues,{where:{phonenumber:'+18005551212'}}).then(result=>{console.log(result)});
*/



class Database{
	
	createWorker(worker){
		return new Promise(function(resolve,reject){
			sequelize.query("insert into worker (contact_uri,sid) values ('"+worker.contact_uri+"','"+worker.sid+"')")
			.then(result=>{resolve(result)})
			.catch(err=>reject(err));
		});
	}
	
	//following select query on Worker table, returns a promise as follows:
	//callerPhoneNumber found: caller's data row
	//callerPhoneNumber not found: null
	getWorkerSid(contact_uri){
		return new Promise(function(resolve,reject){
			sequelize.query("select * from worker where contact_uri='"+contact_uri+"'",
			{ type: sequelize.QueryTypes.SELECT})
			.then(result=>{
				if(result.length==0){
					resolve(null);
				}
				else{
					resolve(result.sid);
				}
			})
			.catch(err=>reject(err));
		});
	}
	
	
}

module.exports=Database;
