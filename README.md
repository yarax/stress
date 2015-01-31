Stress
========

Stress is a customized load testing tool, based on Node.js and [Request](https://github.com/request/request) library
Uses all CPUs to make latency more realistic on high loads

#### Usage

```
npm i stress
npm start
```
#### Configuration and tasks

Tasks for stress located in ./configs directory
You can create your own config json file, based on default and run stress as:

```
npm start myOwnConfig
```

Configuration and customization of stress based on notion of attacker.
Attacker is a method of testing your backend, which includes modules.
Any new attackers can be added, using the existing interface.

./configs/default.json:

``` json
{
"cookieStore" : "./cookie.txt",
"fullLog" : "./reports/full.txt",
"aggregateLog" : "./reports/report.txt",
"webReport" : true, // if true, tool will be waiting for your connection via browser
"tasks" : // array of tasks, that going one after another, saving cookies
[
    {
        "request" : { // request object refers to [Request](https://github.com/request/request) options
            "method" : "GET",
            "url" : "http://www.google.com",
            "headers" : {
                "Content-type" : "text/html"
            }
        },
        "attack" : {
            "type" : "step", // required attack name, refers to directories inside ./attackers/
            "from" : 1, // [Step attacker]
            "to" : 10,
            "step" : 1,
            "dur" : 500
        }
    }
]
} 
``` json

#### Step attacker

Step is a default attacker for stress. It allows to request urls using rps in ascendant order.
Configuration:

``` json
"attack" : {
            "type" : "step",
            "from" : 1, // start from requests in duration
            "to" : 10, // finish to requests in duration
            "step" : 1, // step requests
            "dur" : 500 // duration for current number of requests
        }
``` json



