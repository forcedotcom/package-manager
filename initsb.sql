ALTER DATABASE postgres SET search_path TO public,steelbrick;

DROP TABLE IF EXISTS package_org;

CREATE TABLE IF NOT EXISTS package_org (
  id     SERIAL PRIMARY KEY,
  org_id VARCHAR(18),
  name VARCHAR(100),
  namespace VARCHAR(16),
  instance_name VARCHAR(8),
  instance_url VARCHAR(100),
  refresh_token VARCHAR(256),
  access_token VARCHAR(256)
);

