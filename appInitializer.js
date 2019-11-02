//this class is responsible for adding middleware to app
require('env2')('.env');

const passport = require('passport');
const session = require('express-session');
const flash=require('connect-flash');
const bodyParser = require('body-parser');
const express = require('express');

class AppInitializer{

    initialize(app){
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use('/other_route',require('./other_route').router);
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(flash());
        app.use(session({secret: process.env.SESSION_SECRET}));
        app.use(express.static('public'));
        app.set('view engine', 'pug');
        app.set('view options', { layout: false });

    }
}

module.exports=AppInitializer;