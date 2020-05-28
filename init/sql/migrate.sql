-- Add any data model changes, data fixes or new indices here.  Can be removed once all deployments are upgraded.

alter table upgrade
  add if not exists comment text,
  add if not exists retry_enabled boolean,
  add if not exists retry_count integer;

alter table upgrade_item
    add if not exists time_stamp timestamp with time zone,
    add if not exists remaining_orgs  integer;

alter table package
  add if not exists status varchar(80);

alter table package_version
    add if not exists created_date timestamp with time zone,
    alter column version_sort type varchar(30);

alter table package_version_latest
    alter column version_sort type varchar(30),
    alter column limited_version_sort type varchar(30);
