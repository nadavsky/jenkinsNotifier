/**
 * Created by nadav on 6/18/17.
 */
/**
 * Created by nadav on 4/6/17.
 */

/*var schedule = require('node-schedule');

var j = schedule.scheduleJob('5 * * * * *', function(){
    console.log('The answer to life, the universe, and everything!');
});*/
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});

var {Components, jenkinsHost, Api_Key, Api_Secret}= require("./config.js");

Components = Components || {
    "git-7" : {"compName":"engine", url:"git@git.assembla.com:capriza.7.git"},
    "git-5" : {"compName":"mobile", url:"git@git.assembla.com:capriza.5.git"},
    "git-8" :   {"compName":"designer", url:"git@git.assembla.com:capriza.8.git"},
    "git-dashboard" :{"compName":"dashboard", url:"git@git.assembla.com:capriza.dashboard.git"},
    "git-38" :{"compName":"dynamicdata", url:"git@git.assembla.com:capriza.dynamicdata.git"},

};

var buildList = [];
var jenkinsServer = process.argv[2] || jenkinsHost;
var componentMap = process.argv[3]|| Components;



notifyCommite();

function notifyCommite(){
    setTimeout(notifyCommite, 30000);
    var request = require("request");
    var time = {
        getDate : function(decreaseDay){
            var date = new Date();
            if(decreaseDay) date.setDate(date.getDate() - 1);
            var year = date.getFullYear(), month = date.getMonth()+ 1 , day = date.getDate();
            month = month < 10 ? `0${month}` : month;
            day = day < 10 ? `0${day}` : day;

            var dateInString = year + "-" + month + "-" + day;
            return dateInString.toString();
        },
        getTime : function(decreaseMinutes){
            var date = new Date(), hours = date.getHours(), seconds = date.getSeconds(), minutes = decreaseMinutes ? date.getMinutes() - 2 : date.getMinutes();
            hours = hours < 10 ? `0${hours}` : hours;
            minutes = minutes < 10 ? `0${minutes}` : minutes;
            var timeInString = `${hours}:${minutes}`;
            return timeInString.toString();

        }
    }
    function PollSCM(){
        request.get({
            uri: `https://api.assembla.com/v1/activity.json?from=${time.getDate(true)}%20${time.getTime(true)}&space_id=a8AZyo2gmr4iTOeJe4gwI3&per_page=100`,
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": Api_Key,
                "X-Api-Secret": Api_Secret,
            }
        }, function (err, resp, body) {
            var stream =[],pushedItems=[], pushedArray=[];
            //console.log(resp.body);
            try{stream = JSON.parse(resp.body)} catch (ex){console.log(ex);}
            stream.forEach((action)=>{
                if(action.operation == "pushed")  pushedItems.push(action)
            });
            console.log(`=-=-=-=-=-= last pushed items =-=-=-=-=-= (${time.getDate()} , ${time.getTime()})`)
            pushedItems.forEach((action)=>{
                var pushedItem = getComponentFromUrl(action.url), pushedId = getPushedId(action.url);
                if(pushedItem){
                    console.log(pushedItem.compName + " " + action.author_name + " " + pushedId + " " + pushedItem.url + " " + action.date );
                    if(!already_built(pushedId)) pushedArray.push({'pushedItem': pushedItem, 'pushedId': pushedId});
                }
            });
            if(pushedArray.length) trigger_jenkins(pushedArray);
            else console.log("=-=-=-=-=-= Nothing new =-=-=-=-=")

        });
    }





    function getComponentFromUrl(url) {
        var map = componentMap;
        var component = url.substr(url.indexOf("git-"));
        component = component.substr(0,component.indexOf("/"));
        return map[component];
    }
    function getPushedId(url){
        var component = url.match(/[^...]*$/)[0];
        return component;
    }

    function trigger_jenkins(pushedItemsArray){
        var pushedItemsObj = pushedItemsArray[0];
        var baseUrl = `${jenkinsServer}/git/notifyCommit?url=${pushedItemsObj.pushedItem.url}&sha1=${pushedItemsObj.pushedId}&branches=dev`;
        //var baseUrl = "http://jenkins.prod.capriza.com:8080/git/notifyCommit?url="
        request.get({
                uri:baseUrl,
                headers: {
                    "Content-Type": "application/json"
                }
            },function () {
                pushedItemsArray.splice(0,1);
                console.log("trigger jenkins with '" + baseUrl +"'");
                buildList.push(pushedItemsObj.pushedId); // push to the "already built" list the current item
                if (buildList.length > 30) buildList.splice(0,1);

                if(pushedItemsArray.length) trigger_jenkins(pushedItemsArray);
                else console.log("task finished successfully");
            }

        )

    }
    function already_built(pushedId){
        return buildList.indexOf(pushedId) != -1;
    }


    PollSCM();

//var p="curl http://yourserver/git/notifyCommit?url=<URL of the Git repository>[&branches=branch1[,branch2]*][&sha1=<commit ID>]"
//var s="2017-04-09T13:41:48.000+00:00";
}
