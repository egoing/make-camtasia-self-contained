#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
var wacher = chokidar.watch('./*.tscproj');
var async = require('async');
var prettyjson = require('prettyjson');
var updateProjectFileQueue = async.queue((task, callback) => {
    console.log(`---- started convert : ${task.relativeBase}`);
    fs.writeFile(task.path, prettyjson.render(JSON.stringify(task.content)), 'utf8', err => {
        callback();
    });
});
updateProjectFileQueue.drain = function(){
    isProcess = false;
    console.log('<<< over');
}
// 변경 된 파일을 수정하면 다시 watch가 호출되기 때문에 작업을 해도 되는지 파악하기 위한 flag
var isProcess = false;

wacher.on('all', (event, fpath) => {
    if(isProcess)
        return;
    console.info('>>> scan start', event, fpath);
    var camtasiaJson = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    if(camtasiaJson['sourceBin'] === undefined)
        return;
    camtasiaJson['sourceBin'].forEach((element, index) => {
        var src = element.src;
        console.log('   source bin src : ', src);
        console.log('       is absolute : ', path.isAbsolute(src));
        if (path.isAbsolute(src)) {
            var relativeBase = `./${path.parse(src).base}`;
            fs.exists(relativeBase, exists => {
                console.log('       is file exists :' ,exists);
                if (!exists) {
                    fs.copyFile(src, relativeBase, err => {
                        console.log(`       Copied ${src} to ${relativeBase}`);
                        updateProjectFile(camtasiaJson, index, relativeBase, fpath);
                    });
                } else {
                    updateProjectFile(camtasiaJson, index, relativeBase, fpath);
                }
            });
        }

    });
});

function updateProjectFile(data, index, relativeBase, fpath) {
    isProcess = true;
    data['sourceBin'][index].src = relativeBase;
    updateProjectFileQueue.push({ path: fpath, content: data, relativeBase:relativeBase }, err => {
        console.log('---- finished convert', `${relativeBase}`);
    });
}

