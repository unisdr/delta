@echo off
setlocal enabledelayedexpansion

:: Total number of steps
set TOTAL_STEPS=14

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
echo === Step !STEP!/%TOTAL_STEPS%!. Dumping database schema into dts_database ===
echo.
set /p DB_USER=Enter PostgreSQL username: 
set /p DB_NAME=Enter Database name: 
echo You entered user: %DB_USER%, database: %DB_NAME%

pg_dump -U %DB_USER% -s -d %DB_NAME% --no-owner -f dts_shared_binary\dts_database\dts_db_schema.sql


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating init_db.bat inside dts_shared_binary ===
set INIT_DB_FILE=dts_shared_binary\init_db.bat

REM Delete file if it exists
if exist %INIT_DB_FILE% del %INIT_DB_FILE%


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating init_db.bat inside dts_shared_binary ===
REM Write file line by line
echo @echo off>> %INIT_DB_FILE%
echo set /p db_name=Enter the database name: >> %INIT_DB_FILE%
echo set /p PGUSERNAME=Enter database username: >> %INIT_DB_FILE%
echo echo Creating database %%db_name%%...>> %INIT_DB_FILE%
echo createdb -U %%PGUSERNAME%% %%db_name%%>> %INIT_DB_FILE%
echo if %%errorlevel%% equ 0 (>> %INIT_DB_FILE%
echo     echo Database %%db_name%% created successfully.>> %INIT_DB_FILE%
echo     echo Restoring schema into %%db_name%%...>> %INIT_DB_FILE%
echo     psql -U %%PGUSERNAME%% -W -d %%db_name%% -f dts_database\dts_db_schema.sql>> %INIT_DB_FILE%
echo     if %%errorlevel%% equ 0 (>> %INIT_DB_FILE%
echo         echo Schema restored successfully.>> %INIT_DB_FILE%
echo     )>> %INIT_DB_FILE%
echo     if %%errorlevel%% neq 0 (>> %INIT_DB_FILE%
echo         echo Failed to restore schema.>> %INIT_DB_FILE%
echo     )>> %INIT_DB_FILE%
echo )>> %INIT_DB_FILE%
echo if %%errorlevel%% neq 0 (>> %INIT_DB_FILE%
echo     echo Failed to create database %%db_name%%.>> %INIT_DB_FILE%
echo )>> %INIT_DB_FILE%
echo pause>> %INIT_DB_FILE%

echo === init_db.bat has been generated inside dts_shared_binary ===


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating init_db.sh inside dts_shared_binary ===
set INIT_DB_SH=dts_shared_binary\init_db.sh

REM Delete file if it exists
if exist %INIT_DB_SH% del %INIT_DB_SH%

REM Write the bash script line by line
echo #!/bin/bash>> %INIT_DB_SH%
echo.>> %INIT_DB_SH%
echo export PGUSERNAME="postgres">> %INIT_DB_SH%
echo export PGPASSWORD="postgres">> %INIT_DB_SH%
echo.>> %INIT_DB_SH%
echo read -p "Enter the database name: " db_name>> %INIT_DB_SH%
echo.>> %INIT_DB_SH%
echo echo "Creating database $db_name...">> %INIT_DB_SH%
echo createdb -U $PGUSERNAME $db_name>> %INIT_DB_SH%
echo.>> %INIT_DB_SH%
echo if [ $? -eq 0 ]; then>> %INIT_DB_SH%
echo     echo "Database $db_name created successfully.">> %INIT_DB_SH%
echo     echo "Restoring schema into $db_name...">> %INIT_DB_SH%
echo     psql -U $PGUSERNAME -d $db_name -f dts_db_schema.sql>> %INIT_DB_SH%
echo.>> %INIT_DB_SH%
echo     if [ $? -eq 0 ]; then>> %INIT_DB_SH%
echo         echo "Schema restored successfully.">> %INIT_DB_SH%
echo     else>> %INIT_DB_SH%
echo         echo "Failed to restore schema.">> %INIT_DB_SH%
echo     fi>> %INIT_DB_SH%
echo else>> %INIT_DB_SH%
echo     echo "Failed to create database $db_name.">> %INIT_DB_SH%
echo fi>> %INIT_DB_SH%

echo === init_db.sh has been generated inside dts_shared_binary ===


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating init_website.bat inside dts_shared_binary ===
set INIT_WEBSITE_BAT=dts_shared_binary\init_website.bat

REM Delete file if it exists
if exist %INIT_WEBSITE_BAT% del %INIT_WEBSITE_BAT%

REM Write init_website.bat line by line
echo @echo off>> %INIT_WEBSITE_BAT%
echo ECHO Starting installation process...>> %INIT_WEBSITE_BAT%
echo.>> %INIT_WEBSITE_BAT%
echo REM Check if npm is installed>> %INIT_WEBSITE_BAT%
echo ECHO Checking for npm...>> %INIT_WEBSITE_BAT%
echo where npm ^>nul 2^>^&1>> %INIT_WEBSITE_BAT%
echo IF %%ERRORLEVEL%% NEQ 0 (^>> %INIT_WEBSITE_BAT%
echo     ECHO Error: npm is not installed or not found in PATH. Please install Node.js first.>> %INIT_WEBSITE_BAT%
echo     pause>> %INIT_WEBSITE_BAT%
echo     EXIT /B 1>> %INIT_WEBSITE_BAT%
echo )>> %INIT_WEBSITE_BAT%
echo.>> %INIT_WEBSITE_BAT%
echo REM Installing yarn>> %INIT_WEBSITE_BAT%
echo ECHO Installing yarn globally...>> %INIT_WEBSITE_BAT%
echo CALL npm install --global yarn>> %INIT_WEBSITE_BAT%
echo IF %%ERRORLEVEL%% NEQ 0 (^>> %INIT_WEBSITE_BAT%
echo     ECHO Error: Failed to install yarn.>> %INIT_WEBSITE_BAT%
echo     pause>> %INIT_WEBSITE_BAT%
echo     EXIT /B 1>> %INIT_WEBSITE_BAT%
echo )>> %INIT_WEBSITE_BAT%
echo


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating init_website.sh inside dts_shared_binary ===
set INIT_WEBSITE_SH=dts_shared_binary\init_website.sh

REM Delete file if it exists
if exist %INIT_WEBSITE_SH% del %INIT_WEBSITE_SH%

REM Write init_website.sh line by line
echo #!/bin/bash>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo echo "Starting installation process...">> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo # Check if npm is installed>> %INIT_WEBSITE_SH%
echo if ! command -v npm ^>/dev/null 2^>^&1; then>> %INIT_WEBSITE_SH%
echo     echo "Error: npm is not installed or not found in PATH. Please install Node.js first.">> %INIT_WEBSITE_SH%
echo     exit 1>> %INIT_WEBSITE_SH%
echo fi>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo # Installing yarn>> %INIT_WEBSITE_SH%
echo echo "Installing yarn globally...">> %INIT_WEBSITE_SH%
echo npm install --global yarn>> %INIT_WEBSITE_SH%
echo if [ $? -ne 0 ]; then>> %INIT_WEBSITE_SH%
echo     echo "Error: Failed to install yarn.">> %INIT_WEBSITE_SH%
echo     exit 1>> %INIT_WEBSITE_SH%
echo fi>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo # Refresh PATH to ensure yarn is recognized>> %INIT_WEBSITE_SH%
echo export PATH="$HOME/.yarn/bin:$PATH">> %INIT_WEBSITE_SH%
echo if ! command -v yarn ^>/dev/null 2^>^&1; then>> %INIT_WEBSITE_SH%
echo     echo "Error: Yarn is not recognized. Ensure it installed correctly.">> %INIT_WEBSITE_SH%
echo     exit 1>> %INIT_WEBSITE_SH%
echo fi>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo # Install dependencies>> %INIT_WEBSITE_SH%
echo echo "Installing dependencies...">> %INIT_WEBSITE_SH%
echo yarn install --production>> %INIT_WEBSITE_SH%
echo if [ $? -ne 0 ]; then>> %INIT_WEBSITE_SH%
echo     echo "Error: Failed to install dependencies with yarn.">> %INIT_WEBSITE_SH%
echo     exit 1>> %INIT_WEBSITE_SH%
echo fi>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo # Install dotenv-cli globally>> %INIT_WEBSITE_SH%
echo echo "Installing dotenv-cli globally...">> %INIT_WEBSITE_SH%
echo yarn global add dotenv-cli>> %INIT_WEBSITE_SH%
echo if [ $? -ne 0 ]; then>> %INIT_WEBSITE_SH%
echo     echo "Error: Failed to install dotenv-cli.">> %INIT_WEBSITE_SH%
echo     exit 1>> %INIT_WEBSITE_SH%
echo fi>> %INIT_WEBSITE_SH%
echo.>> %INIT_WEBSITE_SH%
echo echo "Installation complete!">> %INIT_WEBSITE_SH%

echo === init_website.sh has been generated inside dts_shared_binary ===


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating start.bat inside dts_shared_binary ===
set START_BAT=dts_shared_binary\start.bat

REM Delete file if it exists
if exist %START_BAT% del %START_BAT%

REM Write start.bat line by line
echo @echo off>> %START_BAT%
echo echo Starting Remix app...>> %START_BAT%
echo dotenv -e .env -- yarn start2>> %START_BAT%
echo.>> %START_BAT%
echo pause>> %START_BAT%

echo === start.bat has been generated inside dts_shared_binary ===


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Generating start.sh inside dts_shared_binary ===
set START_SH=dts_shared_binary\start.sh

REM Delete file if it exists
if exist %START_SH% del %START_SH%

REM Write start.sh line by line
echo #!/bin/bash>> %START_SH%
echo.>> %START_SH%
echo echo "Starting Remix app...">> %START_SH%
echo dotenv -e .env -- yarn start2>> %START_SH%

echo === start.sh has been generated inside dts_shared_binary ===


echo === Done ===
endlocal
pause
