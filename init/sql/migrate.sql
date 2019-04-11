-- Patching

drop table if exists admin_job;

alter table account
  add if not exists edition varchar(100) null,
  add if not exists instance varchar(6) null;

alter table filter
  add if not exists id serial;

alter table upgrade_item
  add if not exists total_job_count integer,
  drop column if exists parent__item_id;

alter table org
  drop column if exists account_name,
  add if not exists parent_org_id varchar(18) null,
  add if not exists features text null,
  add if not exists edition text null;

alter table org_group
  drop column if exists master_id,
  add if not exists type varchar(80) null;

alter table package
  add if not exists modified_date timestamp with time zone,
  add if not exists dependency_tier integer;

alter table package_org
  alter column access_token type varchar(512),
  alter column refresh_token type varchar(512),
  add if not exists active boolean null,
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

update upgrade_item set total_job_count = (select count (*) from upgrade_job j where j.item_id = upgrade_item.id)
where total_job_count is null;

update package_org set active = true where active is null;
update package_org set type = 'Package' where type = 'Subscribers' OR (type is null AND namespace is not null);