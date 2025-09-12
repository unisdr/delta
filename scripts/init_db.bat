@echo off
set /p db_name=Enter the database name: 
set /p PGUSERNAME=Enter database username:
echo Creating database %db_name%...
createdb -U %PGUSERNAME% %db_name%
if %errorlevel% equ 0 (
    echo Database %db_name% created successfully.
    echo Restoring schema into %db_name%...
    psql -U %PGUSERNAME% -W -d %db_name% -f dts_database/dts_db_schema.sql
    if %errorlevel% equ 0 (
        echo Schema restored successfully.
    ) else (
        echo Failed to restore schema.
    )
) else (
    echo Failed to create database %db_name%.
)
pause