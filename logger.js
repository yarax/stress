var winston = require('winston');
var logger = new winston.Logger();
var util = require('util');

logger.add(winston.transports.Console, {
    level: 'info',
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false,
    humanReadableUnhandledException: true,
    formatter: function(options) {
        return '['+ process.pid + '] ' + winston.config.colorize(options.level, options.level) +' '+ (undefined !== options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t'+ util.inspect(options.meta) : '' );
    }
});

module.exports = logger;