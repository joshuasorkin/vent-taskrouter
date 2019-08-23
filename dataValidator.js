class DataValidator{

    constructor(){
        this.phoneNumberPattern="^[+]\d+$";
    }

    validPhoneNumber(contact_uri){
        var match=contact_uri.match(/^[+]\d+$/g);
        return (match!=null);
    }
}

module.exports=DataValidator;