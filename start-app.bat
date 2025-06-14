@echo off
echo Starting The Deep Interview application...

:: Start the server in a new window
start cmd /k "node server/index.js"

:: Wait a moment for the server to initialize
timeout /t 3

:: Start the client in a new window
start cmd /k "cd client && npm start"

echo Application started in separate windows.
echo Close this window when you're done using the application. 