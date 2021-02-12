const Logger = require('heroku-logger').Logger;

/*{
    color: Boolean,    // Defaults to `true` only if `NODE=ENV != 'production'`.
    delimiter: String, // Defaults to  `'#'`.
    level: String,     // Defaults to `LOG_LEVEL` if set, or `'info'`.
    prefix: String,    // Defaults to `''`.
    readable: Boolean, // Defaults to `true` only if `NODE=ENV != 'production'`.
}*/
const LOG = new Logger({});
exports.logger = {
	debug: (msg) => LOG.debug(msg),
	info: (msg) => LOG.info(msg),
	warn: (msg) => LOG.warn(msg),
	error: (e, data) => LOG.error(e.message || e, {stack: e.stack || null, ...data})
};
