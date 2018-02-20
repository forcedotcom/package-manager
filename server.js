const CLIENT_SECRET = process.env.CLIENT_SECRET;

const express = require('express'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    compression = require('compression'),
    orgs = require('./server/orgs'),
    packages = require('./server/packages'),
    packageorgs = require('./server/package_orgs'),
    packageversions = require('./server/packageVersions'),
    licenses = require('./server/licenses'),
    auth = require('./server/auth'),
    // sqlinit = require('./server/sqlinit'),
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

app.get('/orgs', orgs.findAll);
app.get('/orgs/:id', orgs.findById);

app.get('/licenses', licenses.findAll);
app.get('/licenses/:id', licenses.findById);

app.get('/packages', packages.findAll);
app.get('/packages/:id', packages.findById);

app.get('/packageversions', packageversions.findAll);
app.get('/packageversions/:id', packageversions.findById);

app.get('/packageorgs', packageorgs.findAll);
app.get('/packageorgs/:id', packageorgs.findById);
app.post('/packageorgs', packageorgs.createItem);
app.put('/packageorgs', packageorgs.updateItem);
app.delete('/packageorgs/:id', packageorgs.deleteItem);

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});