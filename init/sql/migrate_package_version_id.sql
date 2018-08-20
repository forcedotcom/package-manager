-- org package version
alter table org_package_version
  add if not exists version_id varchar(18);

update org_package_version a 
set version_id = v.version_id
from package_version v
where a.package_version_id = v.sfid;

alter table org_package_version
  drop column if exists package_version_id;

-- upgrade item
alter table upgrade_item
  add if not exists version_id varchar(18);

update upgrade_item 
set version_id = package_version_id;

alter table upgrade_item
  drop column if exists package_version_id;

-- upgrade job
update upgrade_job a
set original_version_id = v.version_id
from package_version v
where a.original_version_id = v.sfid;

-- license
alter table license
  add if not exists version_id varchar(18);

update license a
set version_id = v.version_id
from package_version v
where a.package_version_id = v.sfid;

alter table license
  drop column if exists package_version_id;

drop index if exists license_org_version_index;
create index if not exists license_org_version_index
  on license (org_id, version_id);

drop index if exists license_package_org_version_index;
create index if not exists license_package_org_version_index
  on license (org_id, package_id, version_id);
