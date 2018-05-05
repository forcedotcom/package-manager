-- Default internal non-account
insert into account (account_name, account_id) values ('Internal', '000000000000000') on conflict do nothing;
