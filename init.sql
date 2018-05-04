-- alter database postgres set search_path to public,steelbrick;

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

create table if not exists account
(
  id serial not null,
  org_id varchar(18),
  account_id varchar(18)  not null
    constraint account_account_id_pk
    primary key,
  account_name varchar(256),
  status varchar(40),
  modified_date TIMESTAMP WITH TIME ZONE
);

create table if not exists org
(
  id serial not null,
  org_id varchar(18) not null
    constraint org_org_id_pk
    primary key,
  name varchar(255),
  instance varchar(6),
  modified_date TIMESTAMP WITH TIME ZONE,
  account_name varchar(256),
  account_id varchar(18),
  is_sandbox boolean,
  status varchar(20),
  type varchar(100)
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
);

CREATE UNIQUE INDEX org_group_member_org_id_org_group_id_uindex ON public.org_group_member (org_id, org_group_id);

-- create table if not exists org_group_criteria (
--   id     serial primary key,
--   org_group_id integer,
--   license_field_name varchar(40),
--   license_field_operator varchar(10),
--   license_field_value text
-- );

create table if not exists upgrade (
  id     serial primary key,
  start_time TIMESTAMP WITH TIME ZONE,
  description text
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
  major_version int,
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

create index if not exists license_org_version_index
  on license (org_id,package_version_id)
;

create index if not exists license_package_org_version_index
  on license (org_id,package_id,package_version_id)
;
