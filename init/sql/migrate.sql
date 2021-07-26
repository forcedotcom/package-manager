-- Add any data model changes, data fixes or new indices here.  Can be removed once all deployments are upgraded.

-- License org id
alter table license
    add if not exists license_org_id varchar(18);

create index if not exists license_org_id_index
    on license (org_id, license_org_id);

update license
set license_org_id = po.org_id
from package_org po
where license_org_id IS NULL AND po.type = 'Licenses';

alter table account
    add if not exists license_org_id varchar(18);

create index if not exists account_license_org_id_index
    on account (license_org_id);

update account
set license_org_id = po.org_id
from package_org po
where license_org_id IS NULL AND po.type = 'Licenses';

alter table package
    add if not exists license_org_id varchar(18);

create index if not exists package_license_org_id_index
    on package (license_org_id);

update package
set license_org_id = po.org_id
from package_org po
where license_org_id IS NULL AND po.type = 'Licenses';

alter table package_version
    add if not exists license_org_id varchar(18);

create index if not exists package_version_license_org_id_index
    on package_version (license_org_id);

update package_version
set license_org_id = po.org_id
from package_org po
where license_org_id IS NULL AND po.type = 'Licenses';

alter table upgrade
  add if not exists comment text,
  add if not exists activated_by varchar(255),
  add if not exists activated_date  timestamp with time zone;

alter table upgrade_item
    add if not exists activated_by varchar(255),
    add if not exists activated_date  timestamp with time zone;

update upgrade_item
    set activated_by = u.activated_by, activated_date = u.activated_date
    from upgrade u
    where upgrade_item.activated_by is null
        and upgrade_id = u.id and u.activated_by is not null;

alter table package
  add if not exists status varchar(80);

alter table package_version
    add if not exists created_date timestamp with time zone,
    alter column version_sort type varchar(30);

alter table package_version_latest
    alter column version_sort type varchar(30),
    alter column limited_version_sort type varchar(30);
