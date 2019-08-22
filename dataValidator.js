class DataValidator{

    constructor(){
        this.phoneNumberPattern="^[+]?\d+$";
    }

    validPhoneNumber(contact_uri){
        return contact_uri.match(this.phoneNumberPattern);
    }
}

module.exports=DataValidator;