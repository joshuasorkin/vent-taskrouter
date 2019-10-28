//this class is responsible for adding middleware to app

const passport = require('passport');
const session = require('express-session');
const flash=require('connect-flash');

class AppInitializer{

    initialize(app){
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use('/other_route',require('./other_route').router);
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(flash());

    }
}

module.exports=AppInitializer;