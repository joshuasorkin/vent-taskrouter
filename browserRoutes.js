require('env2')('.env');
var util = require('util');
var express = require('express');
var app = express();
var passport = require('passport');

var fs = require('fs');
var request = require('request');
const bcrypt= require('bcrypt')
const uuidv4 = require('uuid/v4');

const Sequelize = require('sequelize');

const sequelize=new Sequelize(process.env.database,process.env.username,process.env.password,{
	dialect:'postgres',
	dialectOptions:{
		ssl:parseSSLEnvVar()
	}
});

//todo: this is a duplicate of the function in database.js, need to refactor
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

//TODO
//Add forgot password functionality
//Add email confirmation functionality
//Add edit account page


app.use(express.static('public'));

const LocalStrategy = require('passport-local').Strategy;
//const connectionString = process.env.DATABASE_URL;

var currentAccountsData = [];

module.exports = function (app) {
	
	app.get('/', function (req, res, next) {
		res.render('index', {title: "Home", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
		
		console.log(req.user);
	});

	
	app.get('/join', function (req, res, next) {
		res.render('join', {title: "Join", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
	});
	
	
	app.post('/join', async function (req, res) {
        var selectResult;
        var insertResult;
        var pwd;
		try{
			await sequelize.query('BEGIN')
			pwd = await bcrypt.hash(req.body.password, 5);
			selectResult=await sequelize.query('SELECT id_uuid FROM users WHERE email=?', {
                    replacements:[req.body.username],
                    type:sequelize.QueryTypes.SELECT});
            if(selectResult.length>0){
                req.flash('warning', "This email address is already registered. <a href='/login'>Log in!</a>");
                res.redirect('/join');
            }
            else{
                try{
                insertResult=await sequelize.query('INSERT INTO users (id_uuid, firstName, lastName, email, passwordhash) VALUES (?,?,?,?,?)', {
                                        replacements:[uuidv4(), req.body.firstName, req.body.lastName, req.body.username, pwd],
                                        type:sequelize.QueryTypes.INSERT});
                }
                catch(err){
                    console.log(err);
                    return;
                }                    
                commit=await sequelize.query('COMMIT');
                console.log(insertResult);
                req.flash('success','User created.')
                res.redirect('/login');
                return;
            }
        }

		catch(e){
            throw(e)
        }
	});
	
	app.get('/account', function (req, res, next) {
		if(req.isAuthenticated()){
			res.render('account', {title: "Account", userData: req.user, userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
		}
		else{
			res.redirect('/login');
		}
	});
	
	app.get('/login', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/account');
		}
		else{
			res.render('login', {title: "Log in", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
		}
		
	});
	
	app.get('/logout', function(req, res){
		
		console.log(req.isAuthenticated());
		req.logout();
		console.log(req.isAuthenticated());
		req.flash('success', "Logged out. See you soon!");
		res.redirect('/');
	});
	
	app.post('/login',	passport.authenticate('local', {
		successRedirect: '/account',
		failureRedirect: '/login',
		failureFlash: true
		}), function(req, res) {
        console.log("/login: running done function");
        if(res!=false){
            console.log("/login: res: "+res);
        }
		if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
			} else {
			req.session.cookie.expires = false; // Cookie expires at end of session
		}
		res.redirect('/');
	});
	
	
	
}

passport.use('local', new  LocalStrategy({passReqToCallback : true}, (req, username, password, done) => {
	
	loginAttempt();
	async function loginAttempt() {
        var bcryptResult;
				
		try{
            var result;
            await sequelize.query('BEGIN')
            try{
			    result = await sequelize.query('SELECT id_uuid, firstName, email, passwordhash FROM users WHERE email=?', {
                                                                        replacements:[username],
                                                                        type:sequelize.QueryTypes.SELECT});
                }
            catch(err){
                return done(err);
            }
            console.log("loginAttempt: select query completed.");
			if (result.length==0){
                req.flash('danger', "Oops. Incorrect login details.");
                return done(null,false);
            }
			else{
                try{
                    bcryptResult=await bcrypt.compare(password, result[0].passwordhash);
                }
                catch(err){
                    console.log('Error while checking password');
                    return done();
                }
                if(bcryptResult){
                    console.log("loginAttempt: password match succeeded");
                    return done(null,[{
                        email:result[0].email,
                        firstName:result[0].firstName
                    }]);
                }
                else{
                    req.flash('danger',"Oops. Incorrect login details.");
                    return done(null,false);
                } 
		    }
        }
		catch(e){
            throw (e);
        }
	};
	
}
))




passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});		