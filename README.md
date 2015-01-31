Stress
========

Stress is a customing load testing tool, based on Node.js and [Request](https://github.com/request/request) library

Uses all CPUs to make latency more realistic on high loads

#### Install and usage

```
git clone https://github.com/yarax/stress.git
cd stress
npm i
npm start
```

In case of problems with Ubuntu
``` bash
sudo ln -s /usr/bin/nodejs /usr/bin/node
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

``` javascript
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
```


#### Step attacker

Step is a default attacker for stress. It allows to request urls using rps in ascendant order.
Configuration:

``` javascript
"attack" : {
            "type" : "step",
            "from" : 1, // start from requests in duration
            "to" : 10, // finish to requests in duration
            "step" : 1, // step requests
            "dur" : 500 // duration for current number of requests
        }
```


###### Browser reports

Step can display reports online in browser throw websockets.
To use it set key "webReport" in config as true, and then follow the link in your console.
Stress starts to request after browser connection











