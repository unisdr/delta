@echo off
set /p db_name=Enter the database name: 
set /p PGUSERNAME=Enter database username:
echo Creating database %db_name%...
createdb -U %PGUSERNAME% %db_name%
if %errorlevel% equ 0 (
    echo Database %db_name% created successfully.
    echo Restoring schema into %db_name%...
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/dts_db_schema.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250629032135_populating_countries_table_data.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250630074515_update_countries_table_to_add_iso3.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250811095649_update_countries_table_add_flag_url_data.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250813075915_populate_category_asset_and_sector_data.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250814092113_populate_hips_data_into_db.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250908093239_init_dts_system_info.sql
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/20250909065957_populate_initial_super_admin_user.sql
    if %errorlevel% equ 0 (
        echo Schema restored successfully.
    ) else (
        echo Failed to restore schema.
    )
) else (
    echo Failed to create database %db_name%.
)
pause