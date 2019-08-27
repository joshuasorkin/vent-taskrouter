require('env2')('.env');

class DataValidator{

    constructor(){
        this.phoneNumberPattern="^[+]\d+$";
    }

    validPhoneNumber(contact_uri){
        var match=contact_uri.match(/^[+]\d+$/g);
        return (match!=null);
    }

    //basically just checks if authenticateCode is a sequence of digits,
    //since the actual verification of whether this digit sequence matches an entry in workerApply
    //happens elsewhere
    validAuthenticateCode(authenticateCode){
        return (authenticateCode.match(/^\d+$/g)!=null);
    }
}

module.exports=DataValidator;