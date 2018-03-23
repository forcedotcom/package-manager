const fs = require('fs');
if (fs.existsSync(__dirname + '/.env')) {
    require('dotenv').config();
    console.log(`Achtung. Running with local .env file.  Use for development purposes only.`);
}

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
    licenses = require('./api/licenses'),
    auth = require('./api/auth'),
    app = express();

const CLIENT_SECRET = process.env.CLIENT_SECRET;

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());
app.use('/', express.static(__dirname + '/www'));

app.use(cookieSession({
    name: 'session',
    maxAge: 60 * 60 * 1000 * 2, // 2 hours
    keys: [CLIENT_SECRET]}));
app.get('/oauth2/callback', auth.oauthOrgCallback);
app.get('/oauth2/orgurl', auth.oauthOrgURL);

app.get('/api/orgs', orgs.requestAll);
app.get('/api/orgs/:id', orgs.requestById);
app.post('/api/orgs/:id/upgrade', orgs.requestUpgrade);

app.get('/api/orggroups', orggroups.requestAll);
app.get('/api/orggroups/:id', orggroups.requestById);
app.get('/api/orggroups/:id/members', orggroups.requestMembers);
app.post('/api/orggroups', orggroups.requestCreate);
app.put('/api/orggroups', orggroups.requestUpdate);
app.delete('/api/orggroups/:id', orggroups.requestDelete);

app.get('/api/licenses', licenses.requestAll);
app.get('/api/licenses/:id', licenses.requestById);

app.get('/api/packages', packages.requestAll);
app.get('/api/packages/:id', packages.requestById);

app.get('/api/packageversions', packageversions.requestAll);
app.get('/api/packageversions/:id', packageversions.requestById);

app.get('/api/packageorgs', packageorgs.requestAll);
app.get('/api/packageorgs/:id', packageorgs.requestById);
app.delete('/api/packageorgs/:id', packageorgs.requestDeleteById);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname+'/www/index.html'));
});

app.listen(app.get('port'), function () {
    console.log('Express listening on port ' + app.get('port'));
});
