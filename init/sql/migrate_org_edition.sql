-- One-time execution
update org set edition = type;
update org set type = (CASE WHEN is_sandbox = true then 'Sandbox' else 'Production' end);