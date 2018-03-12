alter database postgres set search_path to public,steelbrick;

drop table if exists package_org;
drop table if exists org;
drop table if exists org_group;
drop table if exists org_group_member;
drop table if exists org_group_criteria;

create table package_org
(
  id serial not null,
  org_id varchar(18) not null
    constraint package_org_org_id_pk
    primary key,
  name varchar(100),
  namespace varchar(16),
  instance_name varchar(8),
  instance_url varchar(100),
  refresh_token varchar(256),
  access_token varchar(256)
);

create table org
(
  id serial not null,
  org_id varchar(18) not null
    constraint org_org_id_pk
    primary key,
  instance varchar(6),
  type varchar(40),
  status varchar(20),
  account_name varchar(256),
  account_id varchar(18),
  aov_band varchar(40)
);


create table if not exists org_group (
  id     serial primary key,
  name varchar(100),
  description text
);

create table if not exists org_group_member (
  id     serial primary key,
  org_group_id integer,
  org_id varchar(18)
);

create table if not exists org_group_criteria (
  id     serial primary key,
  org_group_id integer,
  license_field_name varchar(40),
  license_field_operator varchar(10),
  license_field_value text
);

insert into org_group (id, name, description) values
  (1, 'Early Access', 'Preferential customers and orgs approved for early delivery of new package versions.'),
  (2, 'Bulk', 'Normal customers.'),
  (3, 'Sensitive', 'Preferential customers and orgs approved for late delivery of new package versions.');

insert into org_group_member (org_group_id, org_id) values
  (1, '00D7F000002DFUR'),
  (1, '00D0v0000000gE7'),
  (1, '00D3B000000Dc3g'),
  (1, '00D1F0000008eiD'),
  (2, '00D3E0000000b5S'),
  (2, '00D1F0000008eiD'),
  (2, '00D1I000001WmO3'),
  (2, '00D0R0000000OOn'),
  (2, '00D1I000001Wmhw'),
  (2, '00D1I000001Xbb7'),
  (3, '00D1I000001WmhX'),
  (3, '00D1I000001Wmo5');
