@echo off
title 2. Package Backend for AWS Lambda
echo ===================================================
echo 2. PACKAGE BACKEND FOR AWS LAMBDA
echo ===================================================
echo.
echo Packaging backend folder... Please wait...
powershell -Command "New-Item -ItemType Directory -Force -Path .\temp-backend; Copy-Item -Path .\backend\* -Destination .\temp-backend -Recurse -Exclude '*.db','*.log','.env','.git'; Remove-Item -Path .\temp-backend\uploads\* -Recurse -Force -ErrorAction Ignore; Compress-Archive -Path .\temp-backend\* -DestinationPath .\backend-deploy.zip -Force; Remove-Item -Path .\temp-backend -Recurse -Force"
echo.
echo >>> SUCCESS: Packaged backend into 'backend-deploy.zip'! <<<
echo You can now upload 'backend-deploy.zip' directly to your AWS Lambda function.
echo.
pause
