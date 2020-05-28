-- Add any data model changes, data fixes or new indices here.  Can be removed once all deployments are upgraded.

alter table upgrade
  add if not exists comment text,
  add if not exists retry_enabled boolean,
  add if not exists retry_count integer;

alter table upgrade_item
  add if not exists time_stamp timestamp with time zone,
  add if not exists remaining_orgs  integer;