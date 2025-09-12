@echo off
setlocal enabledelayedexpansion

:: Total number of steps
set TOTAL_STEPS=9

:: Initialize step counter
set STEP=0


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Creating folder dts_shared_binary ===
if not exist dts_shared_binary mkdir dts_shared_binary


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Creating folder dts_database inside dts_shared_binary ===
if not exist dts_shared_binary\dts_database mkdir dts_shared_binary\dts_database


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Build Remix App ===
call yarn build
if errorlevel 1 (
    echo WARNING: yarn build failed, continuing anyway...
)


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying build folder into dts_shared_binary ===
xcopy /E /I /Y build dts_shared_binary\build


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying package.json into dts_shared_binary ===
copy package.json dts_shared_binary\package.json /Y


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying example.env into dts_shared_binary as .env ===
copy example.env dts_shared_binary\.env /Y


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying dts_db_schema.sql schema into dts_database ===
copy scripts\dts_db_schema.sql dts_shared_binary\dts_database\dts_db_schema.sql /Y

set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Adding data initialization commands into dts_db_schema.sql ===
type app\drizzle\migrations\20250629032135_populating_countries_table_data.sql >> dts_shared_binary\dts_database\dts_db_schema.sql
type app\drizzle\migrations\20250813075915_populate_category_asset_and_sector_data.sql >> dts_shared_binary\dts_database\dts_db_schema.sql
type app\drizzle\migrations\20250814092113_populate_hips_data_into_db.sql >> dts_shared_binary\dts_database\dts_db_schema.sql
type app\drizzle\migrations\20250908093239_init_dts_system_info.sql >> dts_shared_binary\dts_database\dts_db_schema.sql
type app\drizzle\migrations\20250909065957_populate_initial_super_admin_user.sql >> dts_shared_binary\dts_database\dts_db_schema.sql


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying shell scripts into dts_shared_binary ===
copy .\scripts\init_db.bat dts_shared_binary\init_db.bat /Y
copy .\scripts\init_db.sh dts_shared_binary\init_db.sh /Y
copy .\scripts\init_website.bat dts_shared_binary\init_website.bat /Y
copy .\scripts\init_website.sh dts_shared_binary\init_website.sh /Y
copy .\scripts\start.bat dts_shared_binary\start.bat /Y
copy .\scripts\start.bat dts_shared_binary\start.sh /Y


echo === Done ===
endlocal
pause
