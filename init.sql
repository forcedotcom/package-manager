ALTER DATABASE postgres SET search_path TO public,steelbrick;

DROP TABLE IF EXISTS package_org;
DROP TABLE IF EXISTS org_group;
DROP TABLE IF EXISTS org_group_member;
DROP TABLE IF EXISTS org_group_criteria;

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

CREATE TABLE IF NOT EXISTS org_group (
  id     SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT
);

CREATE TABLE IF NOT EXISTS org_group_member (
  id     SERIAL PRIMARY KEY,
  org_group_id integer,
  org_id VARCHAR(18)
);

CREATE TABLE IF NOT EXISTS org_group_criteria (
  id     SERIAL PRIMARY KEY,
  org_group_id integer,
  license_field_name VARCHAR(40),
  license_field_operator VARCHAR(10),
  license_field_value TEXT
);

INSERT INTO org_group (id, name, description) VALUES
  (1, 'Early Access', 'Preferential customers and orgs approved for early delivery of new package versions.'),
  (2, 'Bulk', 'Normal customers.'),
  (3, 'Sensitive', 'Preferential customers and orgs approved for late delivery of new package versions.');

INSERT INTO org_group_member (org_group_id, org_id) VALUES
  (1, '00D7F000002DFUR'),
  (1, '00D0v0000000gE7'),
  (1, '00D3B000000Dc3g'),
  (1, '00D1F0000008eiD'),
  (2, '00D3E0000000b5S'),
  (2, '00D1F0000008eiD'),
  (2, '00D1I000001WmO3'),
  (2, '00D0R0000000OOn'),
  (2, '00D1I000001Wmhw'),
  (2, '00D1I000001Xbb7'),
  (3, '00D1I000001WmhX'),
  (3, '00D1I000001Wmo5');
