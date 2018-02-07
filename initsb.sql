DROP TABLE IF EXISTS org;
DROP TABLE IF EXISTS org_package;
DROP TABLE IF EXISTS packageevent;

CREATE TABLE IF NOT EXISTS org (
  id     SERIAL PRIMARY KEY,
  org_id TEXT
);

CREATE TABLE IF NOT EXISTS org_packageversion (
  id             SERIAL PRIMARY KEY,
  org_id         TEXT,
  pkg_version_id TEXT
);

CREATE TABLE IF NOT EXISTS packageevent (
  event_id       SERIAL PRIMARY KEY,
  pkg_version_id TEXT
);

-- ALTER DATABASE postgres SET search_path TO public,steelbrick
CREATE OR REPLACE VIEW org AS
  SELECT DISTINCT
    l.sflma__subscriber_org_id__c AS org_id,
    l.sflma__org_instance__c      AS instance,
    l.sflma__account__c           AS account_id,
    a.name                        AS account_name
  FROM sflma__license__c l INNER JOIN account AS a ON l.sflma__account__c = a.sfid;

-- ALTER DATABASE postgres SET search_path TO public,steelbrick
CREATE OR REPLACE VIEW org_package AS
  SELECT DISTINCT
    l.sflma__subscriber_org_id__c AS org_id,
    l.sflma__org_instance__c      AS instance,
    l.sflma__account__c           AS account_id,
    a.name                        AS account_name,
    p.name                        AS package_name,
    p.sfid                        AS package_id
  FROM sflma__license__c l INNER JOIN account AS a ON l.sflma__account__c = a.sfid
    INNER JOIN sflma__package__c AS p ON l.sflma__package__c = p.sfid;