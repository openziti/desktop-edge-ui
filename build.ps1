
echo "------Setup Node Project------\n\n"
echo "Install Node Dependencies"
cd ./ziti-edge-ui
if (test-path 'node_modules') {
    echo "Modues Exists, Removing"
    Remove-Item node_modules -Recurse -Force -Confirm:$false
}
if (test-path 'package-lock.json') {
    echo "Package Lock Exists, Removing"
    Remove-Item package-lock.json -Force -Confirm:$false
}
npm cache clean --force
npm install
npm i -g electron-packager

echo "------Build Electron Package------\n\n"
cd ..
if (test-path 'release-builds') {
    echo "Releases Exist, Removing"
    Remove-Item release-builds -Recurse -Force -Confirm:$false
}
electron-packager ./ziti-edge-ui Ziti-Desktop-Edge --overwrite --asar --electron-version=26.2.4 --platform=win32 --arch=x64 --prune=true  --out=./release-builds --icon=./ziti-edge-ui/app.ico

echo "------Compress Build Files------\n\n"
Compress-Archive -Path ./release-builds/Ziti-Desktop-Edge-win32-x64/* -DestinationPath ./release-builds/ZitiUI.zip

