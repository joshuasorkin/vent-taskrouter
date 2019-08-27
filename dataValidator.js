require('env2')('.env');

class DataValidator{

    constructor(){
        this.phoneNumberPattern="^[+]\d+$";
    }

    validPhoneNumber(contact_uri){
        var match=contact_uri.match(/^[+]\d+$/g);
        return (match!=null);
    }

    validAuthenticateCode(authenticateCode){
        if(Number.isInteger(authenticateCode)){
            console.log("validAuthenticateCode: "+authenticateCode+" is integer");
            return (authenticateCode>=process.env.AUTHENTICATECODE_MIN)&&(authenticateCode<=process.env.AUTHENTICATECODE_MAX);
        }
        else{
            console.log("validAuthenticateCode: "+authenticateCode+" is not integer");
            return false;
        }
    }
}

module.exports=DataValidator;