// Modules to control application life and create native browser window
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const electron = require('electron');
const os = require('os');
const dialog = require('electron').dialog;
const moment = require('moment');
const storage = require('electron-json-storage');
const path = require('path');
const fs = require('fs');
const md5 = require('md5');
const external = require("request");
const ipc = require("node-ipc").default;
const child_process = require('child_process');
var sudo = require('sudo-prompt');

var mainWindow;
var logging = true;
var iconPath = "./assets/images/ziti-white.png";

var Application = {
    CreateWindow: function() {
        var mainScreen = electron.screen.getPrimaryDisplay();
        var dimensions = mainScreen.size;
        mainWindow = new BrowserWindow({
            width: dimensions.width-380,
            height: dimensions.height-264,
            //minWidth: dimensions.width-1080,
            //minHeight: dimensions.height-640,
            title: "Ziti Desktop Edge",
            icon: iconPath, 
            show: false,
            resizable: true,
            transparent: true,
            frame: false,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false,
            }
        });
        //mainWindow.setMenu(null);
        //mainWindow.maximize();
        mainWindow.loadFile('app.htm');
        mainWindow.on("system-context-menu", (event, _point) => {
            event.preventDefault();
        });
        mainWindow.webContents.openDevTools();
        var appIcon = new Tray(iconPath);
        var contextMenu = Menu.buildFromTemplate([
            { 
                label: 'Show App', click: () => {
                    mainWindow.show();
                } 
            },
            { 
                label: 'Quit', click: () => {
                    app.isQuiting = true;
                    app.quit();
                } 
            }
        ]); 
        appIcon.setContextMenu(contextMenu);
        //mainWindow.on('closed', function () {
          //mainWindow = null
          //})
          //mainWindow.on('close', function (event) {
            //if (!app.isQuiting) {
              //event.preventDefault();
              //mainWindow.hide();
            //}
            //return false;
        //});  
        mainWindow.webContents.on('did-finish-load', function() {
            setTimeout(() => {
                mainWindow.show();

                var ipcpaths = {
                    events: "ziti-edge-tunnel-event.sock",
                    tunnel: "ziti-edge-tunnel.sock",
                    monitorEvents: ".\\OpenZiti\\ziti-monitor\\events",
                    monitor: ".\\OpenZiti\\ziti-monitor\\ipc"
                };

                if (os.platform() === "linux") {
                    ipcpaths.events = "/tmp/"+ipcpaths.events;
                    ipcpaths.tunnel = "/tmp/"+ipcpaths.tunnel;
                    ipcpaths.monitorEvents = null;
                    ipcpaths.monitor = null;
                } else if (os.platform() === "darwin") {
                    
                }

                ipc.connectTo(
                    'ziti',
                    ipcpaths.events,
                    function() {
                        ipc.of.ziti.on(
                            'data',
                            function(data) {
                                Application.onData("ziti-edge-tunnel-event", data);
                            }
                        );
                    }
                );
              
                ipc.connectTo(
                    'ZitiSend',
                    ipcpaths.tunnel,
                    function() {
                        ipc.of.ZitiSend.on(
                            'data',
                            function(data) {
                                Application.onData("ziti-edge-tunnel.sock", data);
                            }
                        )
                    }
                );
              
                if (ipcpaths.monitorEvents) {
                    ipc.connectTo(
                        'Monitor',
                        ipcpaths.monitorEvents,
                        function() {
                            ipc.of.Monitor.on(
                                'data',
                                function(data) {
                                    Application.onData(".\\OpenZiti\\ziti-monitor\\events", data);
                                }
                            )
                        }
                    );
                }
              
                if (ipcpaths.monitor) {
                    ipc.connectTo(
                        'MonitorSend',
                        ipcpaths.monitor,
                        function() {
                            ipc.of.MonitorSend.on(
                                'data',
                                function(data) {
                                    Application.onData(".\\OpenZiti\\ziti-monitor\\ipc", data);
                                }
                            )
                        }
                    );
                }
            }, 40);
        });  
    },
    onData: function(from, data) {
        Log.debug("Application.onData", "Data Received from "+from);
        var message = {};
        try {
            if (data != null && data.length>0) {
                var jsonStr = Buffer.from(data.toString(), 'utf-8').toString();
                Log.debug("Application.onData", jsonStr);
                var jsons = jsonStr.split('\n');
                for (var i=0; i<jsons.length; i++) {
                    var json = jsons[i].replace(/[\u0000-\u0019]+/g,"").trim();
                    if (json.length>0) {
                        try {
                            message = JSON.parse(json);
                            Log.trace("Application.onData", i+" "+JSON.stringify(message));
                            if (message.Op!=null) {
                                if (message.Op=="status" && message.Status.LogLevel!=null) Log.initLevel(message.Status.LogLevel);
                            }
                            Application.onDataFromService(message);
                        } catch (e) { 
                            Log.debug("Application.onData", "Cant Parse JSON: "+json[i]);
                        }
                    } else {
                        // Log.debug("Application.onData", "Recieved Empty ICP Message");
                    }
                }
            } else console.log("Empty Event");
        } catch (e) {
            Log.error("Application.onData", "Error: "+e);
        }
    },
    onDataFromService(data) {
        mainWindow.webContents.send('message-to-ui', JSON.stringify(data));
    },
    SendMessage: function(data) {
        ipc.config.rawBuffer = true;
        Log.debug("Application.SendMessage", JSON.stringify(data));
        ipc.of.ZitiSend.emit(JSON.stringify(data));
        ipc.of.ZitiSend.emit("\n");
    },
    SendMonitorMessage: function(data) {
        ipc.config.rawBuffer = true;
        Log.debug("Application.SendMonitorMessage", JSON.stringify(data));
        ipc.of.MonitorSend.emit(JSON.stringify(data));
        ipc.of.MonitorSend.emit("\n");
    },
    Quit: function() {
        if (process.platform !== 'darwin') app.quit()
    },
    Activation: function() {
        if (mainWindow === null) Application.CreateWindow();
    }
}

var Log = {
    daysToMaintain: 7,
    level: "trace",
    toFile: true,
    toConsole: true,
    levels: ["error", "warn", "info", "debug", "verbose", "trace"],
    file: "logs"+path.sep+"UI"+path.sep+"ZitiDesktopEdge",
    setLevel: function(level) {
        Log.debug("Log.setLevel", "Set Internal Log Level To "+level);
        var monitorCommand = {
            Op: "SetLogLevel", 
            Action: level
        };
        Log.debug("Log.setLevel", "Sending To Monitor "+JSON.stringify(monitorCommand));
        Application.SendMonitorMessage(monitorCommand);
        var levelCommand = {
            Command: "SetLogLevel",
            Data: {
                Level: level
            }
        };
        Log.debug("Log.setLevel", "Sending To Tunnel "+JSON.stringify(levelCommand));
        Application.SendMessage(levelCommand);
        Log.level = level;
    },
    initLevel: function(level) {
        Log.trace("Log.initLevel", "Set Internal Log Level To "+level);
        Log.level = level;
    },
    error: function(from, message) {
        Log.write(Log.levels[0], from, message);
    },
    warn: function(from, message) {
        Log.write(Log.levels[1], from, message);
    },
    info: function(from, message) {
        Log.write(Log.levels[2], from, message);
    },
    debug: function(from, message) {
        Log.write(Log.levels[3], from, message);
    },
    verbose: function(from, message) {
        Log.write(Log.levels[4], from, message);
    },
    trace: function(from, message) {
        Log.write(Log.levels[5], from, message);
    },
    write: function(level, from, message) {
        if (level!=null && from!=null && message!=null) {
           // if (Log.levels.indexOf(Log.level) >= Log.levels.indexOf(level)) {

                var messageValue = "";
                if (typeof messageValue != 'string') messageValue = JSON.stringify(message);
                messageValue = messageValue.split('\n').join('');
                
                var logString = "["+moment().format("yyyy-MM-DDTHH\:mm\:ss.fffZ")+"]\t"+level.toUpperCase()+"\t"+from+"\t"+messageValue+"\n";
                if (this.toConsole) console.log(logString);
                if (this.toFile) {
        
                    let fileName = Log.file+moment().format("YYYYMMDD")+".log";
                    var fullPath = path.dirname(fileName);
        
                    if (!fs.existsSync(fullPath)){
                        console.log("Creating: "+fullPath);
                        fs.mkdirSync(fullPath, { recursive: true });
                    }
        
                    fs.appendFile(fileName, logString, (err) => {
                        if (err) console.log("Log Write Error: "+err);
                    });
        
                    fs.readdir(fullPath, (err, files) => {
                        if (files.length>Log.daysToMaintain) {
                            var toDelete = Log.daysToMaintain-files.length;
                            for (let i=0; i<toDelete; i++) {
                                console.log("Deleting: "+files[i]);
                                fs.unlink(files[i]);
                            }
                        }
                    });
                }
            //}
        }
    }
}

app.on('ready', Application.CreateWindow);
app.on('window-all-closed', Application.Quit);
app.on('activate', Application.Activation);

ipcMain.on('call', function(event, arg) {
    var params = arg.params;
});

ipcMain.on('close', () => {
    app.quit();
});

ipc.config.rawBuffer = true;
ipc.config.delimiter = "\n";
ipc.config.sync = false;
ipcMain.handle("message", (event, data) => {
    Application.SendMessage(data);
    return "";
});
ipcMain.handle("monitor-message", (event, data) => {
    if (os.platform() === "linux") {
        var command = "systemctl stop ziti-edge-tunnel";
        if (data.Op=="Start") command = "systemctl start ziti-edge-tunnel";
        console.log("Command: "+command);
        var options = {
          name: 'OpenZiti'
        };
        sudo.exec(command, options,
          function(error, stdout, stderr) {
            if (error) {
                console.log(JSON.stringify(error));
                if (error.toString().indexOf("User did not grant permission.")>=0) {
                    var command = {
                        Type: "Status",
                        Operation: "OnOff",
                        Active: !data.Op=="Start"
                    }
                    mainWindow.webContents.send('message-to-ui', JSON.stringify(command));
                }
            }
            console.log('stdout: ' + stdout);
            return "";
          }
        );
    } else {
        Application.SendMonitorMessage(data);
        return "";
    }
});
ipcMain.handle("log", (event, data) => {
    Log.write(data.level, data.from, data.message);
    return "";
});
ipcMain.handle("level", (event, data) => {
    Log.setLevel(data);
    return "";
});
ipcMain.handle("mfa-enable", (event, data) => {
    var enableMfa = {
        Command: "EnableMFA",
        Data: {
            Identifier: data
        }
    }
    app.SendMessage(enableMfa);
    return "";
});
ipcMain.handle("window", (event, data) => {
    if (data=="maximize") {
        mainWindow.maximize();
    } else if (data=="unmaximize") {
        /*
        var dimensions = electron.screen.getPrimaryDisplay().size;
        mainWindow.setResizable(true);
        mainWindow.setSize(dimensions.width-200, dimensions.height-200);
        */
        mainWindow.unmaximize();
    } else if (data=="minimize") mainWindow.minimize();
    return "";
});
ipcMain.handle("action-add", (event, data) => {
    var dialogData = {
        properties: ['openFile'],
        filters: [
            { name: 'Ziti Identities', extensions: ['jwt','ziti'] }
        ]
    }
    dialog.showOpenDialog(dialogData).then((result) => {
        if (result.canceled) return {status: "Cancelled"};
        else {
            if (result.filePaths.length>0) {
                var fullPath = result.filePaths[0];
                var name = path.basename(fullPath);
                var fileName = name;
                if (name.indexOf(".")>0) name = name.split('.')[0];

                var identityContents = fs.readFileSync(fullPath, 'utf8');

                var json = {
                    Command: "AddIdentity",
                    Data: {
                        JwtFileName: fileName,
                        JwtContent: identityContents
                    }
                };

                ipc.of.ZitiSend.emit(JSON.stringify(json)+"\n");

            } else return {status: "File Not Selected"};
        }
    }).catch((error) => {   
        return {error: error};
    });
});
ipcMain.handle("action-save", (event, data) => {
    var id = data.id;
    var codes = data.codes;
    dialog.showSaveDialog({
        title: 'Select the File Path to save',
        defaultPath: path.join(electron.app.getPath('documents'), id+'.txt'),
        buttonLabel: 'Save',
        filters: [{ name: 'Text Files', extensions: ['txt']}, ],
        properties: []
    }).then(file => {
        if (!file.canceled) {
            fs.writeFile(file.filePath.toString(), codes.join('\n'), function (err) {
                if (err)  mainWindow.webContents.send('app-status', { error: err });
                else  mainWindow.webContents.send('app-status', { status: "Codes Saved" });
            });
        }
    }).catch(err => {
        mainWindow.webContents.send('app-status', { error: err });
    });
});
