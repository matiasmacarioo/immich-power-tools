@echo off
echo ==============================================
echo Building the custom Immich Power Tools image...
echo ==============================================
docker build -t matiasmacarioo/immich-power-tools:latest .

echo.
echo ==============================================
echo Pushing the image to Docker Hub...
echo ==============================================
echo NOTE: Make sure you are logged into Docker Desktop! 
echo If the push fails because of authentication, run 'docker login' first.
docker push matiasmacarioo/immich-power-tools:latest

echo.
echo ==============================================
echo Done! 
echo The image is now available on Docker Hub as: matiasmacarioo/immich-power-tools:latest
echo On your server, update your docker-compose.yml to use this image.
echo ==============================================
pause
