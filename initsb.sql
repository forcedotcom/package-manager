drop table IF EXISTS license;
drop table IF EXISTS org;
drop table IF EXISTS org_package;
drop table IF EXISTS packageevent;

CREATE TABLE IF NOT EXISTS license (
    id              SERIAL PRIMARY KEY,
    account_id      TEXT,
    account_name    TEXT,
    expiration      DATE,
    install_date    DATE,
    instance        TEXT,
    license_id      TEXT,
    license_status  TEXT,
    license_type    TEXT,
    licensed_seats  INTEGER,
    org_id          TEXT,
    org_edition     TEXT,
    org_status      TEXT,
    pkg_id          TEXT,
    pkg_version     TEXT,
    org_is_sandbox  BIT
  );

CREATE TABLE IF NOT EXISTS org (
    id              SERIAL PRIMARY KEY,
    org_id          TEXT
  );

CREATE TABLE IF NOT EXISTS pkgversion (
    pkgversion_id   SERIAL PRIMARY KEY,
    name            TEXT,
    number          TEXT
  );

CREATE TABLE IF NOT EXISTS org_pkgversion (
    id              SERIAL PRIMARY KEY,
    org_id          TEXT,
    pkg_version_id  TEXT
  );

CREATE TABLE IF NOT EXISTS pkgevent (
    event_id        SERIAL PRIMARY KEY,
    pkg_version_id          TEXT
  );