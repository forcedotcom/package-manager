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
drop table if exists upgrade_job;

create table if not exists package_org
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

create table if not exists org
(
  id serial not null,
  org_id varchar(18) not null
    constraint org_org_id_pk
    primary key,
  instance varchar(6),
  modified_date TIMESTAMP WITH TIME ZONE,
  account_name varchar(256),
  account_id varchar(18)
);

create table if not exists org_group (
  id     serial primary key,
  master_id     INTEGER,
  name varchar(100),
  description text,
  created_date TIMESTAMP WITH TIME ZONE
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
  start_time TIMESTAMP WITH TIME ZONE
);

create table if not exists upgrade_item (
  id     serial primary key,
  upgrade_id INTEGER,
  push_request_id varchar(18),
  package_org_id varchar(18),
  package_version_id varchar(18),
  status varchar(40),
  start_time TIMESTAMP WITH TIME ZONE
);

create table if not exists upgrade_job (
  id     serial primary key,
  upgrade_id INTEGER,
  item_id INTEGER,
  push_request_id varchar(18),
  job_id varchar(18),
  org_id varchar(18),
  status varchar(40)
);

-- SB62 Data
create table if not exists fetch_history
(
  id serial not null,
  object VARCHAR(40),
  fetch_date TIMESTAMP WITH TIME ZONE,
  max_record_date TIMESTAMP WITH TIME ZONE,
  count INTEGER
);

create table if not exists package
(
  id serial not null,
  sfid varchar(18) not null
    constraint package_sfid_pk
    primary key,
  name varchar(255),
  package_id varchar(18),
  package_org_id varchar(18)
);

create table if not exists package_version
(
  id serial not null,
  sfid varchar(18) not null
    constraint package_version_sfid_pk
    primary key,
  name varchar(255),
  version_number varchar(20),
  real_version_number varchar(12),
  package_id varchar(18),
  release_date TIMESTAMP WITH TIME ZONE,
  modified_date TIMESTAMP WITH TIME ZONE,
  status varchar(20),
  version_id varchar(18)
);

create table if not exists package_version_latest
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

create table if not exists license
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
  install_date TIMESTAMP WITH TIME ZONE,
  modified_date TIMESTAMP WITH TIME ZONE,
  expiration TIMESTAMP WITH TIME ZONE,
  used_license_count integer,
  package_id varchar(18),
  package_version_id varchar(18)
);

-- Test Data
delete from org_group;
delete from org_group_member;
insert into org_group (id, name, description) values
  (1, 'Alpha', 'Preferential customers, signed up for early delivery of new package versions.'),
  (2, 'Theta', 'Normal customers.'),
  (3, 'Omega', 'Deferred customers, approved for late delivery of new package versions.');

insert into org_group_member (org_group_id, org_id) values
  (1, '00D0m0000008dxK'),
  (1, '00D63000000CwEq'),
  (1, '00D3F000000CtxN');

insert into org_group_member (org_group_id, org_id) values
  (2, '00D0q000000CxI3'),
  (2, '00D9A0000000UbB')
