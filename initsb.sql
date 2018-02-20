DROP TABLE IF EXISTS package_org;

CREATE TABLE IF NOT EXISTS package_org (
  id     SERIAL PRIMARY KEY,
  org_id TEXT,
  name TEXT,
  namespace TEXT,
  instance_url TEXT,
  username TEXT,
  refresh_token TEXT,
  access_token TEXT,
  status TEXT
);

-- ALTER DATABASE postgres SET search_path TO public,steelbrick