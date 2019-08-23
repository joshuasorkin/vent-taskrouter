const DataValidator=require('./dataValidator');

var dataValidator=new DataValidator();

console.log(dataValidator.validPhoneNumber("+15105551212"));
console.log(dataValidator.validPhoneNumber("+15105551212  +23423423423"));
console.log(dataValidator.validPhoneNumber("abcdefg"));
