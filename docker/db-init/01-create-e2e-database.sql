-- Runs once, the first time the volume is initialized (docker-entrypoint-initdb.d convention):
-- the image already creates POSTGRES_DB ("purpleschool") itself, so this script only adds the
-- second database the suite runs against, "purpleschool_e2e", so a `pnpm dev` session and a
-- Playwright run never share rows.
CREATE DATABASE purpleschool_e2e;
