# package-manager

For onboarding automation, see https://github.com/forcedotcom/package-manager-onboarding

## Data Sources
### Accounts data (for internal ISVs)
Org62 supplies account names.  Normal ISVs have account data provisioned in their LMO.  Internal ISVs seem not to.  Thus they need to query Org62 to retrieve account names based on production org ids.  The tool then associates those account names and ids with the production orgs and their child sandbox orgs. The Org62 user used must be able to query accounts data and have Heroku private space IP addresses exempted.

### LMA Org
Your LMA org supplies you packages, package version details and license data.

### *NEW* Change Traffic Control Org (CTC)
<todo> this is a new feature in PM that allows a scheduled package upgrade operation to comply with checks in an external system (usually a Salesforce or running Agile Accelerator, or it could be a build system that contains dependency tracking).

#### Permission sets
Anyone with access to your LMO gets read-only access to the upgrade tool. For full access to connect orgs, create groups or perform upgrades, you must create a new permission set in the LMO:

* Ensure that permission set has the Edit perm on Package Version.
* If your user is not an admin, be sure to add at least Read permissions on Package, Package Version and License.
* Assign yourself and any other users you desire to that perm set.

#### Required Objects and Fields
##### Package -> Dependency Tier (sfLma__Package__c.DependencyTier__c)
Object: Package (fLma__Package__c)
Name: Dependency Tier (DependencyTier__c)
Type: Integer
Description: Identifies simple dependency tree.  Packages in Tier 1 are upgraded before Tier 2.  Tier 2 before Tier 3, and so on.

##### Package -> Status (fLma__Package__c.Status__c)
Object: Package (fLma__Package__c)
Name: Status (Status__c)
Type: Picklist
Description: If Inactive, the package is skipped altogether and not loaded into the package manager tool.
Values:
* "Active"
* "Inactive"

##### sfLma__Package_Version__c.Status__c
Object: Package Version (fLma__Package_Version__c)
Name: Status (Status__c)
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

# Provide the specific instance url of the org against which you wish to authenticate and authorize users.
# Package Manager will otherwise choose the first connected org you have added of type Licenses.  If no licenses type
# orgs have been registered yet in the app, any org may be used (which is clearly not secure).
#AUTH_URL=https://ourlma.my.salesforce.com

# You can define multiple databases for dev and test purposes, and switch between them here.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Blacklisting orgs by default looks simply at the id of the org being blacklisted.  If however you
# instead want to look at the account id of the org being blacklisted and blacklist all other orgs
# associated with that account, set this to true.
EXPAND_BLACKLIST=false

# It is highly recommended to enable IP Access Restrictions on all of your orgs, as a general rule.  This
# option just makes it a bit easier by automatically updating the IP ranges for you, if a profile with
# the given name is found. Provide a profile name here to enable the feature, and create and assign the
# profile (should be a clone of System Administrator) on each org. The tool will NOT create or assign
# the profile for you, it will only define the login IP ranges.
#PACKAGE_MANAGER_ADMIN_PROFILE=SteelBrick Package Manager Admin
#PACKAGE_ORG_IP_RANGES=[{"description": "SFDC Network", "startAddress": "204.14.232.0", "endAddress": "204.14.239.255"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.148.180", "endAddress": "35.165.148.180"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.168.63", "endAddress": "35.165.168.63"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.214.66", "endAddress": "35.165.214.66"}, {"description": "SteelBrick Heroku NA", "startAddress": "35.165.214.102", "endAddress": "35.165.214.102"}, {"description": "SFDC Phoenix (PRD)", "startAddress": "136.146.0.0", "endAddress": "136.147.255.255"}]

# The app runs various background jobs to keep everything monitored and data synced.  Use the following
# to determine the job intervals.
JOB_SCHEDULES={"org_monitor_interval_seconds": 240, "fetch_interval_minutes": 5, "fetch_all_interval_days": 1, "upgrade_monitor_interval_seconds": 30,"upload_orgs_interval_hours": 12}
# The app requires four specific org types, in addition to whatever packaging orgs you need.  If you
# want to explicitly the instance url for one or more of them, like with your LMA org, you may do so
# here.  This is very much optional.

LOG_LEVEL=DEBUG
#DEBUG_SQL_VALUES=true

# WARNING: use with caution, for testing and development purposes only.
ENFORCE_ACTIVATION_POLICY=true
ENFORCE_AUTH=true

# Built-in whitelisting, very useful for local development where you only want to be able to affect
# a limited number of internal orgs.
#ALLOWED_ORGS=["00D...","00D..."]

# Whether to force usage of HTTPS.  Good for production, not so good for local development
FORCE_HTTPS=true

# In Dev mode, we run the UI on 3000 and proxy to the backend API (on 5000)
CLIENT_PORT=3000

# Required for production, but not generally needed for local development (just leave them unset).
# CLIENT_URL is the front-end application url. API_URL is the backend API service url.
# Unless you have a very creative deployment strategy, the two should match.
#CLIENT_URL=https://pm.steelbrick.com
#API_URL=https://pm.steelbrick.com

# If an org must be authorized by someone with access to the app containuer but without direct access to the app itself,
# register it here.  A heroku admin, for example, would set this in the app's config vars. Note this assumes all admins are
# allowed to read this sensitive config var, containing all-powerful access and refresh tokens.  Use with care.
 #SFDX_PREAUTHORIZED_ORGS=[{"type":OrgType,"name":String,"org_id":String,"instance_url":String,"refresh_token":String,"access_token":String}]

 # For temporary admin access for an external user, use the ADMIN_ACCESS_KEY config var.  This should _not_ be left permanently,
 # as it is obviously insecure.  This is useful for granting temporary access to someone outside of your organization.
 # Once set, the login screen will give you the option to enter this key for full admin access to the application..
 # ADMIN_ACCESS_KEY=donotleavemeherealone
```

# How to remotely debug the app in Heroku
```
heroku ps:exec -a package-manager-staging
```
Once you get a command prompt, hit ctrl-C or type 'exit' to exit.
```
heroku ps:forward 9229 -a package-manager-staging
```
You should now be able to start the debugging session in your editor and have it connect to your running app within a few seconds. All the normal debugging features, including breakpoints, call stacks, variable inspection etc should work.
