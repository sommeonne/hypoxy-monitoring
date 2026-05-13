SELECT 'CREATE DATABASE user_db'    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_db')\gexec
SELECT 'CREATE DATABASE device_db'  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'device_db')\gexec
SELECT 'CREATE DATABASE patient_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'patient_db')\gexec
SELECT 'CREATE DATABASE alert_db'   WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'alert_db')\gexec
SELECT 'CREATE DATABASE session_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'session_db')\gexec
SELECT 'CREATE DATABASE report_db'  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'report_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE user_db    TO hypoxy;
GRANT ALL PRIVILEGES ON DATABASE device_db  TO hypoxy;
GRANT ALL PRIVILEGES ON DATABASE patient_db TO hypoxy;
GRANT ALL PRIVILEGES ON DATABASE alert_db   TO hypoxy;
GRANT ALL PRIVILEGES ON DATABASE session_db TO hypoxy;
GRANT ALL PRIVILEGES ON DATABASE report_db  TO hypoxy;
