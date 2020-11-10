-- Add any data model changes, data fixes or new indices here.  Can be removed once all deployments are upgraded.

alter table upgrade
  add if not exists comment text;

alter table package
  add if not exists status varchar(80);

alter table package_version
    add if not exists created_date timestamp with time zone,
    alter column version_sort type varchar(30);

alter table package_version_latest
    alter column version_sort type varchar(30),
    alter column limited_version_sort type varchar(30);
