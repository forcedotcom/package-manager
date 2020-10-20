-- Add any data model changes, data fixes or new indices here.  Can be removed once all deployments are upgraded.

alter table upgrade
  add if not exists comment text;

alter table package
  add if not exists status varchar(80);
