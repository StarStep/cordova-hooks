#!/usr/bin/env node

/* 
This plugin replaces text in a file with the app version from config.xml

Add to config.xml, src is relative to cordova root folder
<hook type="after_prepare" src="scripts/appversion.js" />

Add to index.html in cordova app, make sure to keep the same exact formatting...
<script>
    var APP_VERSION = '0.0.0';
    var APP_PACKAGE = 'the.app.package';
    var APP_NAME = 'APP';
</script>

*/

const fs = require('fs');
const path = require('path');

var wwwFileToReplace = "index.html";
var configXMLPath = "config.xml";
var rootdir = process.cwd();
var cliCommand = process.env.CORDOVA_CMDLINE;
var debug = cliCommand && cliCommand.indexOf('--verbose');

if (process.env.CORDOVA_PLATFORMS) {
    var currentBuildPlatforms = process.env.CORDOVA_PLATFORMS && process.env.CORDOVA_PLATFORMS.split(",");
} else {
    const source = rootdir + '/platforms/';
    const isDirectory = source => fs.lstatSync(source).isDirectory();
    const platform_folders = fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
    var currentBuildPlatforms = platform_folders.map((f) => {
        return f.split('\\').pop();
    });
}

function loadConfigXMLDoc(filePath) {
    var fs = require('fs');
    var xml2js = require('xml2js');
    var json = "";
    try {
        var fileData = fs.readFileSync(filePath, 'ascii');
        var parser = new xml2js.Parser();
        parser.parseString(fileData.substring(0, fileData.length), function(err, result) {
            //console.log("config.xml as JSON", JSON.stringify(result, null, 2));
            json = result;
        });
        return json;
    } catch (ex) {
        console.log('appversion.js error', ex);
    }
}

function replace_string_in_file(filename, to_replace, replace_with) {
    var data = fs.readFileSync(filename, 'utf8');
    var result = data.replace(new RegExp(to_replace, "g"), replace_with);
    if (result) {
        fs.writeFileSync(filename, result, 'utf8');
        if (debug) {
            console.log("↻ " + to_replace + " --> " + replace_with + " in " + filename);
        }
    } else {
        console.error("↻ " + to_replace + " --> " + replace_with + " in " + filename);
    }
}

var rawJSON = loadConfigXMLDoc(configXMLPath);

if (rootdir) {
    currentBuildPlatforms.forEach(function(val, index, array) {
        var wwwPath = "";
        switch (val) {
            case "ios":
                wwwPath = "platforms/ios/www/";
                break;
            case "android":
                wwwPath = "platforms/android/assets/www/";
                break;
            case "browser":
                wwwPath = "platforms/browser/www/";
                break;
            default:
                console.log("Unknown build platform: " + val);
        }
        var fullfilename = path.join(rootdir, wwwPath + wwwFileToReplace);
        if (fs.existsSync(fullfilename)) {
            replace_string_in_file(fullfilename, 'var APP_VERSION = .+', 'var APP_VERSION = "' + rawJSON.widget.$.version + '";');
            replace_string_in_file(fullfilename, 'var APP_PACKAGE = .+', 'var APP_PACKAGE = "' + rawJSON.widget.$.id + '";');
            replace_string_in_file(fullfilename, 'var APP_NAME = .+', 'var APP_NAME = "' + rawJSON.widget.name + '";');
        }
    });
}
