
var gulp = require('gulp'); 
var download = require("gulp-download2");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var crypto = require('crypto');
var fs = require('fs');
var args = require('yargs').argv;

// Parse URL
function httpGet(theUrl){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

// Check SHA256
function checkSHA(file, sha256) {
    var buffer = fs.readFileSync(file);
    var fsHash = crypto.createHash('sha256');
    
    fsHash.update(buffer);
    var fileSha256 = fsHash.digest('hex');

    if(fileSha256 != sha256){
        throw (file + ": Checksum Failed!");
    }
}

var version = args.jdkVersion;
var arch = args.arch;
var archJDK = arch; 
var vscAPI;

if ( arch == "x64"){
    vscAPI =  "https://update.code.visualstudio.com/api/update/win32-x64/stable/version";
}
else {
    vscAPI =  "https://update.code.visualstudio.com/api/update/win32/stable/version";
    archJDK = "x32";
}

var obj =  JSON.parse(httpGet(vscAPI));
var strs = obj.url.split("/");
var fileName = strs[strs.length-1];

// Download VS Code
gulp.task('downloadVSC', function(){
    return download(obj.url).pipe(gulp.dest('binaries/vscode/'+ arch +'/'));
});

gulp.task('checkVSC', gulp.series('downloadVSC', function(){
    checkSHA('binaries/vscode/'+ arch +'/' + fileName, obj.sha256hash);
    console.log("success");
    return Promise.resolve("Done");
}));

// Download JDK
var API = "https://api.adoptopenjdk.net/v2/latestAssets/nightly/openjdk"+version+"?os=windows&arch="+ archJDK + "&type=jdk&heap_size=normal&openjdk_impl=hotspot";
var jdkobj = JSON.parse(httpGet(API))[0];

gulp.task("downloadJDKChecksum", function(){
    return download(jdkobj.installer_checksum_link).pipe(gulp.dest('binaries/JDK/'+arch+'/'+version+'/'));
});

gulp.task("downloadJDK", function(){
    return download(jdkobj.installer_link).pipe(gulp.dest('binaries/JDK/'+arch+'/'+version+'/'));
});

gulp.task("checkJDK", gulp.series("downloadJDK", "downloadJDKChecksum", function(){
    var sha256TXT = 'binaries/JDK/'+arch+'/'+version+'/'+jdkobj.installer_name+'.sha256.txt'
    var sha256 = fs.readFileSync(sha256TXT).toString().split(" ")[0];
    checkSHA('binaries/JDK/'+arch+'/'+version+'/'+ jdkobj.installer_name, sha256);
    console.log("success");
    return Promise.resolve("Done");
}));

// Main
gulp.task("default", gulp.series("checkVSC", "checkJDK", function(){
    return Promise.resolve("Done");
}));
