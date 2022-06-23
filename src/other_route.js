var express=require('express');
var router=express.Router();

router.get('/other_route_endpoint',function(req,res){
    res.send('other_route_endpoint');
});

module.exports.router=router;
