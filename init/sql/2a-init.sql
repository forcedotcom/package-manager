alter table org
  drop column if exists account_name;

alter table package_org
  add if not exists status varchar(80) null,
  add if not exists description text null,
  add if not exists refreshed_date timestamp with time zone;