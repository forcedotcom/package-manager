const CLIENT_SECRET = process.env.CLIENT_SECRET;

const express = require('express'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    compression = require('compression'),
    orgs = require('./server/orgs'),
    orggroups = require('./server/orggroups'),
    packages = require('./server/packages'),
    packageorgs = require('./server/packageorgs'),
    packageversions = require('./server/packageversions'),
    licenses = require('./server/licenses'),
    auth = require('./server/auth'),
    app = express();

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

app.get('/orgs', orgs.requestAll);
app.get('/orgs/:id', orgs.requestById);
app.post('/orgs/:id/upgrade', orgs.requestUpgrade);

app.get('/orggroups', orggroups.requestAll);
app.get('/orggroups/:id', orggroups.requestById);
app.get('/orggroups/:id/members', orggroups.requestMembers);
app.post('/orggroups', orggroups.requestCreate);
app.put('/orggroups', orggroups.requestUpdate);
app.delete('/orggroups/:id', orggroups.requestDelete);

app.get('/licenses', licenses.requestAll);
app.get('/licenses/:id', licenses.requestById);

app.get('/packages', packages.requestAll);
app.get('/packages/:id', packages.requestById);

app.get('/packageversions', packageversions.requestAll);
app.get('/packageversions/:id', packageversions.requestById);

app.get('/packageorgs', packageorgs.requestAll);
app.get('/packageorgs/:id', packageorgs.requestById);
app.delete('/packageorgs/:id', packageorgs.requestDeleteById);

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});