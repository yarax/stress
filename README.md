Stress
========

Simple Node.js tool fot stress testing HTTP services.
Uses https://github.com/yarax/nnb with C++ POSIX threads for higher performance.

### Install

```
git clone https://github.com/yarax/stress.git
cd stress
npm i
```
There are can be some problems with building, then try to run `npm i` one more time.

### Configuration

Nnb uses [https://github.com/lorenwest/node-config] for configuration, so you can create your own config files.
Default config file: config/default.json

* workersNum - number of spawning processes (1 recommended)
* concurrency - concurrency for nnb (depends on your ulimit -n value)
* task.request - options for nnb. See more [https://github.com/yarax/nnb]
* task.attack - configuration of the attack. Currently only `step` type supported.


