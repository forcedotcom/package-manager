const fs = require('fs');
if (fs.existsSync(__dirname + '/.env')) {
    require('dotenv').config();
    console.log(`Achtung. Running with local .env file.  Use for development purposes only.`);
}

// Ensure our database is alive and initialized
require('./util/sqlinit');

const express = require('express'),
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
    app = express();

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SESSION_TIMEOUT_HOURS = process.env.SESSION_TIMEOUT_HOURS || 2;

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(compression());
app.use(cookieSession({
    name: 'session',
    maxAge: 60 * 60 * 1000 * SESSION_TIMEOUT_HOURS, 
    keys: [CLIENT_SECRET]}));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

app.use(function (req, res, next) {
    if (req.path.startsWith('/api') && !req.session.access_token) {
        res.status(401).send();
        return;
    } 
    // Update a value in the cookie so that the set-cookie will be sent.
    // Only changes every minute so that it's not sent with every request.
    req.session.nowInMinutes = Math.floor(Date.now() / 60e3);
    next();
});

app.get('/oauth2/logout', auth.requestLogout);
app.get('/oauth2/loginurl', auth.oauthLoginURL);
app.get('/oauth2/orgurl', auth.oauthOrgURL);
app.get('/oauth2/callback', auth.oauthCallback);

app.get('/api/admin/fetch', admin.requestFetch);

app.get('/api/orgs', orgs.requestAll);
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
app.post('/api/packageorgs/refresh', packageorgs.requestRefresh);
app.post('/api/packageorgs/delete', packageorgs.requestDelete);

app.get('/api/upgrades', upgrades.requestAll);
app.get('/api/upgrades/:id', upgrades.requestById);

app.get('/api/upgradeitems', upgrades.requestItemsByUpgrade);
app.get('/api/upgradeitems/:id', upgrades.requestItemById);
app.post('/api/upgradeitems/:id/activate', upgrades.requestActivateUpgradeItem);
app.post('/api/upgradeitems/:id/cancel', upgrades.requestCancelUpgradeItem);
app.post('/api/upgradeitems/activate', upgrades.requestActivateUpgradeItems);
app.post('/api/upgradeitems/cancel', upgrades.requestCancelUpgradeItems);

app.get('/api/upgradejobs', upgrades.requestJobsByUpgradeItem);
app.get('/api/upgradejobs/:id', upgrades.requestJobById);
app.get('/api/upgradejobs/:id/status', upgrades.requestJobStatusByItem);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(app.get('port'), function () {
    console.log('Express listening on port ' + app.get('port'));
});
