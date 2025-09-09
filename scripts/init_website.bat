@echo off
ECHO Starting installation process...

REM Check if npm is installed
ECHO Checking for npm...
where npm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Error: npm is not installed or not found in PATH. Please install Node.js first.
    pause
    EXIT /B 1
)

REM Installing yarn
ECHO Installing yarn globally...
CALL npm install --global yarn
IF %ERRORLEVEL% NEQ 0 (
    ECHO Error: Failed to install yarn.
    pause
    EXIT /B 1
)

REM Refresh PATH to ensure yarn is recognized
SET "PATH=%PATH%;%USERPROFILE%\AppData\Roaming\npm"
ECHO Verifying yarn installation...
where yarn >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Error: Yarn is not recognized. Ensure it installed correctly.
    pause
    EXIT /B 1
)

REM Install dependencies
ECHO Installing dependencies...
CALL yarn install --production
IF %ERRORLEVEL% NEQ 0 (
    ECHO Error: Failed to install dependencies with yarn.
    pause
    EXIT /B 1
)

REM Install dotenv-cli globally
ECHO Installing dotenv-cli globally...
CALL yarn global add dotenv-cli
IF %ERRORLEVEL% NEQ 0 (
    ECHO Error: Failed to install dotenv-cli.
    pause
    EXIT /B 1
)

ECHO Installation complete!
pause