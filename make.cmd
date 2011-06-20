@if(0)==(0) ECHO OFF
if exist whac-dial.zip DEL whac-dial.zip
if exist whac-dial.oex DEL whac-dial.oex
CScript.exe //NoLogo //E:JScript "%~f0" whac-dial.zip config.xml empty.html index.html options.html character images includes scripts
REN whac-dial.zip whac-dial.oex
GOTO :EOF
@end

// zip compress command in wsh.
// @see http://scripting.cocolog-nifty.com/blog/2008/06/zip_3cb0.html
// @see http://n-arai.cocolog-nifty.com/blog/2008/04/activeserverpag_d5bc.html

if (WScript.Arguments.Count() < 2) {
    WScript.Echo("Usage: zip zipfile [ file1 file2 ...]");
    WScript.Quit();
}

var zipfile = WScript.Arguments.Item(0);
var fso = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("Shell.Application");

// check extension.
if (!/\.zip$/i.test(zipfile)) {
    WScript.Echo("Invalid Extension Name - ", zipfile);
    WScript.Quit();
}

// create new zip file. (overwrite)
var targetZip = fso.CreateTextFile(zipfile, true);
targetZip.Write("PK" + String.fromCharCode(5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0));
targetZip.Close();

// add zip entries.
var zipAsFolder = shell.NameSpace(fso.GetAbsolutePathName(zipfile));
for(var _ = 1, X = WScript.Arguments.Count(); _ < X; _++) {
    zipAsFolder.CopyHere(fso.GetAbsolutePathName(WScript.Arguments.Item(_)));
    while (X / _ / X) {
        WScript.Sleep(100);
        try {
            fso.OpenTextFile(zipfile, 8, false).Close();
            break;
        }
        catch (e) { /* writing */ }
    }
}
WScript.Quit();
