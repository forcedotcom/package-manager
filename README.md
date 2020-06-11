# brick-manager

## Data Sources
### Accounts data (for internal ISVs)
Org62 supplies account names.  Normal ISVs have account data provisioned in their LMO.  Internal ISVs seem not to.  Thus they need to query Org62 to retrieve account names based on production org ids.  The tool then associates those account names and ids with the production orgs and their child sandbox orgs. The Org62 user used must be able to query accounts data and have Heroku private space IP addresses exempted.

### LMA Org
Your LMA org supplies you packages, package version details and license data.

#### Required Objects and Fields
##### sfLma__Package__c.DependencyTier__c
Type: Integer
Description: Identifies simple dependency tree.  Packages in Tier 1 are upgraded before Tier 2.  Tier 2 before Tier 3, and so on.

##### sfLma__Package__c.Status__c
Type: Picklist
Description: If Inactive, the package is skipped altogether and not loaded into the package manager tool.
Values:
* "Active"
* "Inactive"

##### sfLma__Package_Version__c.Status__c
Type: Picklist
Values:
* "Verified" - The version is GA
* "Pre-Release" - The version is ready for SB
* "Preview" - The version is a preview package, similar to SB but not meant for everyone
* "Limited" - The version was built for a specific purpose for specific customers

#### Connected App
A connected app is required to enable and govern your oauth connections to your various orgs. For your 
connected app:  
*Permitted User* should be "All users may self-authorize".  Note: if you like, you may choose "Admin approved users
are pre-authorized", and then select specific users via permission sets or profiles.  This is only recommended if 
you have a large user base in your LMO, and you do not wish for all users to have access to the push upgrade tool.
 
*Selected OAuth Scopes* should include:
* Access your basic information (id, profile, email, address, phone)
* Access and manage your data (api)
* Provide access to your data via the Web (web)
* Perform requests on your behalf at any time (refresh_token, offline_access)

*Callback URL* should include localhost for dev purposes, and your actual production (or staging) url.
* https://pm.steelbrick.com/oauth2/callback
* http://localhost:5000/oauth2/callback

### Packaging Dev Orgs
You may connect one or more packaging orgs.  This must be an admin user, able to query PackageSubscribers and write to the PackagePush API to query, schedule and activate push upgrades.

## Heroku Environment Configuration (.env)
When deployed to Heroku, config settings must be added for each.  When running locally, your .env file 
supplies them.
```
# You need your client id and secret from your connected app
CLIENT_ID=your connected app client id
CLIENT_SECRET=your connected app secret key

# You can define multiple databases for dev and test purposes, and switch between them here.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Blacklisting orgs by default looks simply at the id of the org being blacklisted.  If however you 
# instead want to look at the account id of the org being blacklisted and blacklist all other orgs 
# associated with that account, set this to true.
EXPAND_BLACKLIST=true

# It is highly recommended to enable IP Access Restrictions on all of your orgs, as a general rule.  This 
# option just makes it a bit easier by automatically updating the IP ranges for you, if a profile with 
# the given name is found. Provide a profile name here to enable the feature, and create and assign the 
# profile (should be a clone of System Administrator) on each org. The tool will NOT create or assign 
# the profile for you, it will only define the login IP ranges.
PACKAGE_MANAGER_ADMIN_PROFILE=SteelBrick Package Manager Admin
PACKAGE_ORG_IP_RANGES=[{"description": "SFDC Network", "startAddress": "204.14.232.0", "endAddress": "204.14.239.255"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.148.180", "endAddress": "35.165.148.180"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.168.63", "endAddress": "35.165.168.63"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.214.66", "endAddress": "35.165.214.66"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.214.102", "endAddress": "35.165.214.102"}, {"description": "SFDC Phoenix (PRD)", "startAddress": "136.146.0.0", "endAddress": "136.147.255.255"}]

# The app runs various background jobs to keep everything monitored and data synced.  Use the following
# to determine the job intervals.
JOB_SCHEDULES={"org_monitor_interval_seconds": 240, "fetch_interval_minutes": 5, "fetch_all_interval_days": 1, "upgrade_monitor_interval_seconds": 30,"upload_orgs_interval_hours": 12}
# The app requires four specific org types, in addition to whatever packaging orgs you need.  If you 
# want to explicitly the instance url for one or more of them, like with your LMA org, you may do so 
# here.  This is very much optional.

NAMED_ORGS=[{"type": "Licenses","orgId": "00D300000008V7fEAE","name": "SB 62","instanceUrl":"https://steelbrick.my.salesforce.com"}]

LOG_LEVEL=DEBUG
DEBUG_SQL_VALUES=true

# WARNING: use with caution, for testing and development purposes only.
ENFORCE_ACTIVATION_POLICY=true
ENFORCE_AUTH=true

# Built-in whitelisting, very useful for local development where you only want to be able to affect
# a limited number of internal orgs.
ALLOWED_ORGS=["00D...","00D..."]

# Whether to force usage of HTTPS.  Good for production, not so good for local development
FORCE_HTTPS=true

# In Dev mode, we run the UI on 3000 and proxy to the backend API (on 5000)
CLIENT_PORT=3000

# Required for production, not generally needed for local development (just leave them unset).
# CLIENT_URL is the front-end application url. API_URL is the backend API service url.  
# Unless you have a very creative deployment strategy, the two should match.
#CLIENT_URL=https://pm.steelbrick.com
#API_URL=https://pm.steelbrick.com

# Provide the instance url of the org against which you wish to authenticate and authorize users.
# By default the Licenses org instanceUrl is used.  If for some reason you need to override that, use this.
#AUTH_URL=https://steelbrick.my.salesforce.com
```
