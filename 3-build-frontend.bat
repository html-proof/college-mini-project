@echo off
title 3. Build React Frontend for Amazon S3
echo ===================================================
echo 3. BUILD REACT FRONTEND FOR AMAZON S3
echo ===================================================
echo.
echo Building React production bundle...
cd frontend
call npm run build
cd ..
echo.
echo >>> SUCCESS: Frontend compiled successfully into 'frontend/dist/'! <<<
echo Upload all files INSIDE 'frontend/dist/' directly to your S3 bucket root.
echo.
pause
