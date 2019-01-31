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
  instance      varchar(6),
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
  edition       varchar(100),
  type          varchar(100),
  features      text null
);

create table if not exists org_group (
  id           serial primary key,
  master_id    integer,
  name         varchar(100),
  type         varchar(80),
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
  version_id         varchar(18),
  license_status     varchar(40),
  install_date       timestamp with time zone,
  modified_date      timestamp with time zone,
  constraint org_package_version_org_id_package_id_pk
  unique (org_id, package_id)
);

create table if not exists upgrade
(
  id           serial primary key,
  start_time   timestamp with time zone,
  description  text,
  status       varchar(40),
  parent_id    varchar(18),
  org_group_id varchar(18),
  created_by   varchar(255)
);

create table if not exists upgrade_blacklist (
   id                  serial primary key,
   upgrade_id          integer,
   org_id              varchar(18)
);

create table if not exists upgrade_item (
  id              serial primary key,
  upgrade_id      integer,
  total_job_count integer,
  push_request_id varchar(18),
  package_org_id  varchar(18),
  version_id      varchar(18),
  status          varchar(40),
  start_time      timestamp with time zone,
  created_by      varchar(255)
);

create table if not exists upgrade_job (
  id                  serial primary key,
  upgrade_id          integer,
  item_id             integer,
  push_request_id     varchar(18),
  job_id              varchar(18),
  org_id              varchar(18),
  original_version_id varchar(18),
  status              varchar(40),
  message             text
);

CREATE UNIQUE INDEX IF NOT EXISTS
  upgrade_job_job_id_uindex
  ON upgrade_job (job_id);

-- sb62 data
create table if not exists package
(
  id              serial      not null,
  sfid            varchar(18) not null
    constraint package_sfid_pk primary key,
  name            varchar(255),
  package_id      varchar(18),
  package_org_id  varchar(18),
  dependency_tier integer,
  modified_date   timestamp with time zone
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
  id                     serial      not null,
  package_id             varchar(18) not null
    constraint package_version_package_id_pk primary key,
  version_id             varchar(18),
  version_number         varchar(20),
  version_sort           varchar(12),
  limited_version_id     varchar(18),
  limited_version_number varchar(20),
  limited_version_sort   varchar(12)
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
  version_id         varchar(18)
);

create table if not exists filter
(
  id         serial       not null,
  key        varchar(80)  not null,
  created_by varchar(80),
  name       varchar(255) not null,
  query      text
);

create index if not exists license_org_version_index
  on license (org_id, version_id);

create index if not exists license_package_org_version_index
  on license (org_id, package_id, version_id);

-- Default internal non-account
insert into account (account_name, account_id)
values ('Internal', '000000000000000'), ('Unknown/Invalid', '000000000000001')
on conflict do nothing;

-- Patching
drop table if exists admin_job;

alter table account
  add if not exists instance varchar(6) null;

alter table filter
  add if not exists id serial;

alter table upgrade_item
  add if not exists total_job_count integer,
  drop column if exists parent__item_id;

alter table org
  drop column if exists account_name,
  add if not exists features text null,
  add if not exists edition text null;

alter table org_group
  add if not exists type varchar(80) null;

alter table package
  add if not exists modified_date timestamp with time zone,
  add if not exists dependency_tier integer;

alter table package_org
  add if not exists type varchar(80) null,
  add if not exists status varchar(80) null,
  add if not exists description text null,
  add if not exists refreshed_date timestamp with time zone;

alter table upgrade
  add if not exists org_group_id varchar(18) null,
  add if not exists parent_id varchar(18) null,
  add if not exists status varchar(80) null,
  add if not exists created_by varchar(255) null;

alter table upgrade_item
  add if not exists created_by varchar(255) null;

alter table org_package_version
  add if not exists install_date timestamp with time zone;

alter table package_version
  add if not exists version_sort varchar(12) null,
  drop column if exists real_version_number;

alter table upgrade_job
  add if not exists message text null,
  add if not exists original_version_id varchar(18) null;

alter table package_version_latest
    drop column if exists name,
    drop column if exists sfid,
  add if not exists version_sort varchar(12),
  add if not exists limited_version_id     varchar(18),
  add if not exists limited_version_number varchar(20),
  add if not exists limited_version_sort varchar(12);

-- Data fixes

-- Added status field to upgrade.  Marking all null status as Active means the system will re-check the status of
-- all upgrades by querying its jobs, and set the status appropriately.
update upgrade set status = 'Active' where status is null;
update upgrade set status = 'Canceled' where id in 
     (select u.id from upgrade u inner join upgrade_item i on i.upgrade_id = u.id where i.status = 'Canceled');

-- Changed default status from null to Installed
update org set status = 'Installed' where status is null;

-- Added type field to group with default of Upgrade Group
update org_group set type = 'Upgrade Group' where type is null;

update org set edition = type where edition is null and status != 'Not Found';

update upgrade_item set total_job_count = (select count (*) from upgrade_job j where j.item_id = upgrade_item.id)
where total_job_count is null;