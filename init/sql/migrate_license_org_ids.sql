-- One-time execution
alter table license
    add if not exists license_org_id varchar(18);

create index if not exists license_org_id_index
    on license (org_id, license_org_id);

update license l
set license_org_id = po.org_id
from package_org po
where license_org_id IS NULL AND po.type = 'Licenses';
