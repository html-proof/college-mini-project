@echo off
title 1. Seed Amazon RDS Database
echo ===================================================
echo 1. SEED AMAZON RDS POSTGRESQL DATABASE
echo ===================================================
echo.
set /p RDS_HOST="Enter your RDS Endpoint Host (e.g. tutor-database.cxqayi48y5pv.eu-north-1.rds.amazonaws.com): "
set /p RDS_PASSWORD="Enter your Master Password: "
echo.
echo Connecting and seeding database...
set DATABASE_URL=postgresql://postgres:%RDS_PASSWORD%@%RDS_HOST%:5432/postgres
node -e "const db = require('./backend/services/dbService'); db.initDb().then(() => { console.log('\n>>> SUCCESS: RDS Database Seeding Complete! <<<\n'); }).catch(err => { console.error('\n>>> ERROR Seeding Database:\n', err); })"
pause
