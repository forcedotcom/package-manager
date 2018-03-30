alter database postgres set search_path to public,steelbrick;

drop table if exists package_org;
drop table if exists org;
drop table if exists org_group;
drop table if exists org_group_member;
drop table if exists org_group_criteria;
drop table if exists package;
drop table if exists package_version;
drop table if exists package_version_latest;
drop table if exists license;
drop table if exists upgrade;
drop table if exists upgrade_item;

create table package_org
(
  id serial not null,
  org_id varchar(18) not null
    constraint package_org_org_id_pk
    primary key,
  name varchar(100),
  division varchar(100),
  namespace varchar(16),
  instance_name varchar(8),
  instance_url varchar(100),
  refresh_token varchar(256),
  access_token varchar(256)
);

create table org
(
  id serial not null,
  org_id varchar(18) not null
    constraint org_org_id_pk
    primary key,
  instance varchar(6),
  modified_date TIMESTAMP,
  type varchar(40),
  status varchar(20),
  account_name varchar(256),
  account_id varchar(18)
);

create table if not exists org_group (
  id     serial primary key,
  master_id     INTEGER,
  name varchar(100),
  description text,
  created_date TIMESTAMP
);

create table if not exists org_group_member (
  id     serial primary key,
  org_group_id integer,
  org_id varchar(18)
);x

create table if not exists org_group_criteria (
  id     serial primary key,
  org_group_id integer,
  license_field_name varchar(40),
  license_field_operator varchar(10),
  license_field_value text
);

create table if not exists upgrade (
  id     serial primary key,
  start_time TIMESTAMP
);

create table if not exists upgrade_item (
  id     serial primary key,
  upgrade_id INTEGER,
  push_request_id varchar(18),
  package_org_id varchar(18),
  package_version_id varchar(18),
  start_time TIMESTAMP
);

insert into org_group (id, name, description) values
  (1, 'Early Access', 'Preferential customers and orgs approved for early delivery of new package versions.'),
  (2, 'Bulk', 'Normal customers.'),
  (3, 'Sensitive', 'Preferential customers and orgs approved for late delivery of new package versions.');

insert into org_group_member (org_group_id, org_id) values
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

-- SB62 Data
create table fetch_history
(
  id serial not null,
  object VARCHAR(40),
  fetch_date TIMESTAMP,
  max_record_date TIMESTAMP,
  count INTEGER
);

create table package
(
  id serial not null,
  sfid varchar(18) not null
    constraint package_sfid_pk
    primary key,
  name varchar(255),
  package_id varchar(18),
  package_org_id varchar(18)
);

create table package_version
(
  id serial not null,
  sfid varchar(18) not null
    constraint package_version_sfid_pk
    primary key,
  name varchar(255),
  version_number varchar(20),
  real_version_number varchar(12),
  package_id varchar(18),
  release_date TIMESTAMP,
  modified_date TIMESTAMP,
  status varchar(20),
  version_id varchar(18)
);

create table package_version_latest
(
  id serial not null,
  package_id varchar(18) not null
    constraint package_version_package_id_pk
    primary key,
  sfid varchar(18) not null,
  name varchar(255),
  version_number varchar(20),
  version_id varchar(18)
);

create table license
(
  id serial not null,
  sfid varchar(18) not null
    constraint license_sfid_pk
    primary key,
  org_id varchar(18),
  name varchar(255),
  instance varchar(6),
  is_sandbox boolean,
  type varchar(255),
  status varchar(255),
  install_date TIMESTAMP,
  modified_date TIMESTAMP,
  expiration TIMESTAMP,
  used_license_count integer,
  package_id varchar(18),
  package_version_id varchar(18)
);