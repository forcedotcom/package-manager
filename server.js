const fs = require('fs');
if (fs.existsSync(__dirname + '/.env')) {
	require('dotenv').config();
	console.log(`Achtung. Running with local .env file.  Use for development purposes only.`);
}

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SESSION_TIMEOUT_HOURS = process.env.SESSION_TIMEOUT_HOURS || 2;

const express = require('express'),
	enforce = require('express-sslify'),
	path = require('path'),
	bodyParser = require('body-parser'),
	cookieSession = require('cookie-session'),
	compression = require('compression'),
	orgs = require('./api/orgs'),
	orggroups = require('./api/orggroups'),
	packages = require('./api/packages'),
	packageorgs = require('./api/packageorgs'),
	packageversions = require('./api/packageversions'),
	upgrades = require('./api/upgrades'),
	licenses = require('./api/licenses'),
	auth = require('./api/auth'),
	admin = require('./api/admin'),
	// filters = require('./api/filters'),
	sqlinit = require('./init/sqlinit'),
	logger = require('./util/logger').logger;

const http = require('http');
const socketIo = require('socket.io');


// Ensure our database is alive and initialized
sqlinit.init();

// Setup express and socket.io
const app = express();
const server = http.Server(app);
const session = cookieSession({
	name: 'session',
	maxAge: 60 * 60 * 1000 * SESSION_TIMEOUT_HOURS,
	keys: [CLIENT_SECRET]
});

if (process.env.FORCE_HTTPS === "true") {
	app.use(enforce.HTTPS({trustProtoHeader: true}));
}

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(compression());
app.use(session);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

app.use(function (req, res, next) {
	if (process.env.ENFORCE_AUTH !== "false" && req.path.toLowerCase().startsWith('/api') && !req.session.access_token) {
		res.status(401).send();
		logger.info("Denied", {path: req.path, ip: req.ip, user: req.session.username, display_name: req.session.display_name, has_access_token: typeof req.session.access_token !== "undefined"})
		return;
	}
	logger.info("Access", {path: req.path, ip: req.ip, user: req.session.username, display_name: req.session.display_name, has_access_token: typeof req.session.access_token !== "undefined"})
	// Update a value in the cookie so that the set-cookie will be sent.
	// Only changes every minute so that it's not sent with every request.
	req.session.nowInMinutes = Math.floor(Date.now() / 60e3);
	next();
});

app.get('/oauth2/user', auth.requestUser);
app.get('/oauth2/logout', auth.requestLogout);
app.get('/oauth2/loginurl', auth.oauthLoginURL);
app.get('/oauth2/orgurl', auth.oauthOrgURL);
app.get('/oauth2/callback', auth.oauthCallback);

// app.get('/api/filters', filters.requestFilters);
// app.put('/api/filters', filters.requestSaveFilters);

app.get('/api/admin/settings', admin.requestSettings);
app.get('/api/admin/jobs', admin.requestJobs);
app.post('/api/admin/jobs/cancel', admin.requestCancel);

app.get('/api/orgs', orgs.requestAll);
app.put('/api/orgs', orgs.requestAdd);
app.get('/api/orgs/:id', orgs.requestById);
app.post('/api/orgs/:id/upgrade', orgs.requestUpgrade);

app.get('/api/orggroups', orggroups.requestAll);
app.get('/api/orggroups/:id', orggroups.requestById);
app.get('/api/orggroups/:id/members', orggroups.requestMembers);
app.post('/api/orggroups/:id/members', orggroups.requestAddMembers);
app.post('/api/orggroups/:id/members/remove', orggroups.requestRemoveMembers);
app.post('/api/orggroups', orggroups.requestCreate);
app.post('/api/orggroups/:id/upgrade', orggroups.requestUpgrade);
app.put('/api/orggroups', orggroups.requestUpdate);
app.post('/api/orggroups/delete', orggroups.requestDelete);

app.get('/api/licenses', licenses.requestAll);
app.get('/api/licenses/:id', licenses.requestById);

app.get('/api/packages', packages.requestAll);
app.get('/api/packages/:id', packages.requestById);

app.get('/api/packageversions', packageversions.requestAll);
app.get('/api/packageversions/:id', packageversions.requestById);

app.get('/api/packageorgs', packageorgs.requestAll);
app.get('/api/packageorgs/:id', packageorgs.requestById);
app.post('/api/packageorgs', packageorgs.requestUpdate);
app.post('/api/packageorgs/refresh', packageorgs.requestRefresh);
app.post('/api/packageorgs/revoke', packageorgs.requestRevoke);
app.post('/api/packageorgs/delete', packageorgs.requestDelete);

app.get('/api/upgrades', upgrades.requestAll);
app.get('/api/upgrades/:id', upgrades.requestById);
app.post('/api/upgrades/activate/:id', upgrades.requestActivateUpgrade);
app.post('/api/upgrades/cancel/:id', upgrades.requestCancelUpgrade);
app.post('/api/upgrades/retry/:id', upgrades.requestRetryFailedUpgrade);

app.get('/api/upgradeitems', upgrades.requestItemsByUpgrade);
app.get('/api/upgradeitems/:id', upgrades.requestItemById);
app.post('/api/upgradeitems/activate/:id', upgrades.requestActivateUpgradeItem);
app.post('/api/upgradeitems/cancel/:id', upgrades.requestCancelUpgradeItem);

app.get('/api/upgradejobs', upgrades.requestAllJobs);
app.get('/api/upgradejobs/:id', upgrades.requestJobById);

app.get('/api/emit/:key', admin.requestEmit);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

server.listen(app.get('port'), function () {
	logger.info('Express initialized', {port: app.get('port')});
});

// Kick off socket.io
const io = socketIo(server);
io.on('connection', function (socket) {
	session(socket.request, {}, () => {
		const sess = socket.request.session;
		if (typeof sess.access_token !== "undefined") {
			admin.connect(socket);
			admin.emit(admin.Events.ALERT, {subject: "Welcome", message: `Session secured.  Proceed with caution, ${sess.display_name.split(' ')[0]}.`})
		}
	});
});

// Set job intervals
admin.scheduleJobs();