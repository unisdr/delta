-- Custom SQL migration file, put your code below! --
DELETE FROM public.dts_system_info;

INSERT INTO
	public.dts_system_info (id, db_version_no, app_version_no)
VALUES
	('54809ea1-6d7d-443b-b051-0d7496c91de1', '1.0.0', '0.0.9');