create table if not exists admin_job
(
  id            serial not null
    constraint admin_job_id_pk primary key,
  name          varchar(255),
  status        varchar(80),
  steps         integer,
  progress      integer,
  message       text,
  modified_date timestamp with time zone
);

create table if not exists package_org
(
  id             serial      not null,
  org_id         varchar(18) not null
    constraint package_org_org_id_pk primary key,
  name           varchar(100),
  description    text,
  division       varchar(100),
  namespace      varchar(16),
  instance_name  varchar(8),
  instance_url   varchar(100),
  refresh_token  varchar(256),
  access_token   varchar(256),
  type           varchar(80),
  status         varchar(80),
  refreshed_date timestamp with time zone
);

create table if not exists account
(
  id            serial      not null,
  org_id        varchar(18),
  account_id    varchar(18) not null
    constraint account_account_id_pk primary key,
  account_name  varchar(256),
  status        varchar(40),
  modified_date timestamp with time zone
);

create table if not exists org
(
  id            serial      not null,
  org_id        varchar(18) not null
    constraint org_org_id_pk primary key,
  name          varchar(255),
  instance      varchar(6),
  modified_date timestamp with time zone,
  account_id    varchar(18),
  is_sandbox    boolean,
  status        varchar(20),
  type          varchar(100)
);


create table if not exists org_group (
  id           serial primary key,
  master_id    integer,
  name         varchar(100),
  description  text,
  created_date timestamp with time zone
);

create table if not exists org_group_member (
  id           serial primary key,
  org_group_id integer,
  org_id       varchar(18)
);

create unique index if not exists org_group_member_org_id_org_group_id_uindex
  on public.org_group_member (org_id, org_group_id);

create table if not exists org_package_version (
  id                 serial not null
    constraint org_package_version_pkey
    primary key,
  org_id             varchar(18),
  package_id         varchar(18),
  package_version_id varchar(18),
  license_status     varchar(40),
  modified_date      timestamp with time zone,
  constraint org_package_version_org_id_package_id_pk
  unique (org_id, package_id)
);

-- create table if not exists org_group_criteria (
--   id     serial primary key,
--   org_group_id integer,
--   license_field_name varchar(40),
--   license_field_operator varchar(10),
--   license_field_value text
-- );

create table if not exists upgrade (
  id          serial primary key,
  start_time  timestamp with time zone,
  description text,
  created_by  varchar(255)
);

create table if not exists upgrade_item (
  id                 serial primary key,
  upgrade_id         integer,
  push_request_id    varchar(18),
  package_org_id     varchar(18),
  package_version_id varchar(18),
  status             varchar(40),
  start_time         timestamp with time zone,
  created_by         varchar(255)
);

create table if not exists upgrade_job (
  id              serial primary key,
  upgrade_id      integer,
  item_id         integer,
  push_request_id varchar(18),
  job_id          varchar(18),
  org_id          varchar(18),
  status          varchar(40),
  message         text
);

CREATE UNIQUE INDEX IF NOT EXISTS
  upgrade_job_job_id_uindex
  ON upgrade_job (job_id);

-- sb62 data
create table if not exists package
(
  id             serial      not null,
  sfid           varchar(18) not null
    constraint package_sfid_pk primary key,
  name           varchar(255),
  package_id     varchar(18),
  package_org_id varchar(18),
  modified_date  timestamp with time zone
);

create table if not exists package_version
(
  id             serial      not null,
  sfid           varchar(18) not null
    constraint package_version_sfid_pk primary key,
  name           varchar(255),
  version_number varchar(20),
  version_sort   varchar(12),
  major_version  int,
  package_id     varchar(18),
  release_date   timestamp with time zone,
  modified_date  timestamp with time zone,
  status         varchar(20),
  version_id     varchar(18)
);

create table if not exists package_version_latest
(
  id             serial      not null,
  package_id     varchar(18) not null
    constraint package_version_package_id_pk primary key,
  sfid           varchar(18) not null,
  name           varchar(255),
  version_number varchar(20),
  version_id     varchar(18)
);

create table if not exists license
(
  id                 serial      not null,
  sfid               varchar(18) not null
    constraint license_sfid_pk primary key,
  org_id             varchar(18),
  name               varchar(255),
  instance           varchar(6),
  is_sandbox         boolean,
  type               varchar(255),
  status             varchar(255),
  install_date       timestamp with time zone,
  modified_date      timestamp with time zone,
  expiration         timestamp with time zone,
  used_license_count integer,
  package_id         varchar(18),
  package_version_id varchar(18)
);

create index if not exists license_org_version_index
  on license (org_id, package_version_id);

create index if not exists license_package_org_version_index
  on license (org_id, package_id, package_version_id);

-- Default internal non-account
insert into account (account_name, account_id)
values ('Internal', '000000000000000'), ('Unknown/Invalid', '000000000000001')
on conflict do nothing;

-- Patching
alter table upgrade_item
  drop column if exists parent__item_id;

alter table org
  drop column if exists account_name;

alter table package
  add if not exists modified_date timestamp with time zone;

alter table package_org
  add if not exists type varchar(80) null,
  add if not exists status varchar(80) null,
  add if not exists description text null,
  add if not exists refreshed_date timestamp with time zone;

alter table upgrade
  add if not exists created_by varchar(255) null;

alter table upgrade_item
  add if not exists created_by varchar(255) null;

alter table package_version
  add if not exists version_sort varchar(12) null,
  drop column if exists real_version_number;

alter table upgrade_job
  add if not exists message text null;