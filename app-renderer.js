const remote = require('electron').remote;
const shell = require('electron').shell;
const child = require("child_process");
const fs = require('fs');
const ipcRenderer = require('electron').ipcRenderer;
const path = require("path");
const { threadId } = require('worker_threads');
const rootPath = require('electron-root-path').rootPath;
window.$ = window.jQuery = require("./assets/scripts/jquery.js"); 
var Highcharts = require('highcharts');  
require('highcharts/modules/exporting')(Highcharts);  

var app = {
    screenId: "MissionControl",
    filterId: null,
    actionId: null,
    keys: null,
    upMetricsArray: [],
    downMetricsArray: [],
    downChart: null,
    upChart: null,
    init: function() {
        app.language();

        app.events();
        modal.init();
        menu.init();
        growler.init();
        ui.init();
        mfa.init();
        ZitiIdentity.init();
        ZitiService.init();

        $(".loader").hide();
    },
    language: function() {
        app.keys = JSON.parse(fs.readFileSync("assets/languages/en-us.json"));
        $("[data-i18n]").each((i, e) => {
            var id = $(e).attr("id");
            $("#"+id).html(app.keys[id]);
        });
    },
    events: function() {
        ipcRenderer.on('message-to-ui', app.onData);
        ipcRenderer.on('app-status', app.onStatus);
        $("#CloseButton").click(app.close);
        $("[data-screen]").click(app.screen);
        $("[data-action]").click(app.action);
        $(".fullNav").click(app.sub);
        $(".supportNav").click(app.support);
        $("#EditButton").click(app.showForm);
        $("#CloseForm").click(app.hideForm);
        $(".levelSelect").click(app.levelSelect);
        $(".toggle").click(app.toggle);
        $('[data-url]').click(app.open);
        $(".search").keyup(app.search);
        $("#FilterId").keyup(app.filterIdServices);
        $("#FilterServices").keyup(app.filterServices);
		$("input").on("keyup", app.enter);
		$("select").on("keyup", app.enter);
        $(".sort").click((e) => {
            var options = $(e.currentTarget).find(".options");
            if (options) {
                if (options.hasClass("open")) options.removeClass("open");
                else options.addClass("open");
            }
        });
        $(".option").click((e) => {
            var sortWhat = $(e.currentTarget).data("what");
            var sort = $(e.currentTarget).data("sort");
            if (sortWhat=="identity") {
                ZitiIdentity.setSort(sort);
            } else if (sortWhat=="service") {
                ZitiService.setSort(sort);
            }
        });
        $("#ClearSearch").click((e) => {
            $(".search").val("");
            $("#ClearSearch").removeClass("active");
            $("#GlobalResults").html("");
            $("#GlobalResults").removeClass("open");
        });
        $("main").click((e) => {
            if ($("#GlobalResults").hasClass("open")) $("#GlobalResults").removeClass("open");
        });
        $("#MaxButton").click((e) => {
            if ($("body").hasClass("max")) {
                $("body").removeClass("max");
                ipcRenderer.invoke("window", "unmaximize");
            } else {
                $("body").addClass("max");
                ipcRenderer.invoke("window", "maximize");
            }
        });
        $("#MinButton").click((e) => {
            ipcRenderer.invoke("window", "minimize");
        });
    },
    enter: function(e) {
		if (e.keyCode == 13) {
			var id = $(e.currentTarget).data("enter");
			if ($("#"+id).length>0) $("#"+id).click();
		}
    },
    onStatus: function(e, data) {
        if (data.error) growler.error(data.error);
        else growler.success(data.status);
    },
    search: function(e) {
        var filter = $(e.currentTarget).val().trim();
        if (filter.length>0) {
            var identities = ZitiIdentity.search(filter);
            var services = ZitiService.search(filter);
            var html = "";
            if (identities.length>0) {
                html += '<div class="title">'+identities.length+' '+((identities.length>1)?'identities':'identity')+'</div>';
                for (var i=0; i<identities.length; i++) {
                    html += '<div class="result" data-type="identity" data-id="'+identities[i].FingerPrint+'">'+identities[i].Name+'</div>';
                }
            }
            if (services.length>0) {
                html += '<div class="title">'+services.length+' '+((services.length>1)?'services':'service')+'</div>';
                for (var i=0; i<services.length; i++) {
                    html += '<div class="result" data-service="identity" data-id="'+services[i].Id+'">'+services[i].Address+'</div>';
                }
            }
            $("#GlobalResults").html(html);
            $("#GlobalResults").addClass("open");
            $(".result").click((e) => {
                var id = $(e.currentTarget).data("id");
                var type = $(e.currentTarget).data("type");
                if (type=="identity") {
                    app.showScreen("IdentityScreen");
                    ZitiIdentity.select(id);
                } else {
                    app.showScreen("ServiceScreen");
                    $(".fullservices").removeClass("selected");
                    $(".fullservices[data-id='"+id+"']").addClass("selected");
                    ZitiService.showDetails();
                }
                $("#GlobalResults").html("");
                $("#GlobalResults").removeClass("open");
            });
            $("#ClearSearch").addClass("active");
        } else {
            $("#ClearSearch").removeClass("active");
            $("#GlobalResults").html("");
            $("#GlobalResults").removeClass("open");
        }
    },
    filterIdServices: function (e) {
        ZitiService.refresh();
    },
    filterServices: function (e) {
        ZitiService.refresh();
    },
    open: function(e) {
        var url = $(e.currentTarget).data("url");
        app.openUrl(url);
    },
    openUrl: function(url) {
        shell.openExternal(url);
    },
    openPath: function(path) {
        shell.openPath(path);
    },
    toggle: function(e) {
        if ($(e.currentTarget).hasClass("on")) $(e.currentTarget).removeClass("on");
        else $(e.currentTarget).addClass("on");
        var callAfter = $(e.currentTarget).data("call");
        if (callAfter=="mfa") mfa.toggle(); 
    },
    levelSelect: function(e) {
        $(".levelSelect.selected").removeClass("selected");
        $(e.currentTarget).addClass("selected");
        var level = $(e.currentTarget).data("level");
        ipcRenderer.invoke("level", level);
    },
    close: function(e) {
        ipcRenderer.send('close');
    },
    showForm: function(e) {
        $("#EditForm").addClass("open");
    },
    hideForm: function(e) {
        $("#EditForm").removeClass("open");
    },
    screen: function(e) {
        var screen = $(e.currentTarget).data("screen");
        app.showScreen(screen);
    },
    showScreen: function(screen) {
        $("#FilterServices").val("");
        $("#FilterId").val("");
        modal.close();
        $("#"+app.screenId).removeClass("open");
        $("#"+screen).addClass("open");
        app.screenId = screen;
        $(".navItem").removeClass("selected");
        $(".missionBg").attr('class','missionBg');
        $(".missionBg").addClass(app.screenId);
        $("#OnOffButton").attr('class', '');
        if (ui.isOn) $("#OnOffButton").addClass("on");
        $("#OnOffButton").addClass(app.screenId);
        $("div.navItem[data-screen='"+screen+"']").addClass("selected");
        ZitiService.refresh();
    },
    sub: function(e) {
        var sub = $(e.currentTarget).data("sub");
        $("#AdvancedScreen").find(".sub").removeClass("open");
        $("#"+sub).addClass("open");
        $(".fullNav").removeClass("selected");
        $(e.currentTarget).addClass("selected");
    },
    support: function(e) {
        var sub = $(e.currentTarget).data("sub");
        $("#SupportScreen").find(".sub").removeClass("open");
        $("#"+sub).addClass("open");
        $(".supportNav").removeClass("selected");
        $(e.currentTarget).addClass("selected");
    },
    onData: function(event, data) {
        try {
            var message = JSON.parse(data);
            console.log(message);
            if (message.Op) {
                if (message.Op=="status") {
                    Log.debug("onData", "IPC In: "+message.Op);
                    Log.debug("onData", JSON.stringify(message));
                    for (var i=0; i<message.Status.Identities.length; i++) {
                        message.Status.Identities[i].Status = ((message.Status.Identities[i].Active)?"Active":"Inactive");
                        if (!message.Status.Identities[i].Services) message.Status.Identities[i].Services = [];
    
                        message.Status.Identities[i].TotalServices = message.Status.Identities[i].Services.length;
                    }
                    ZitiIdentity.set(message.Status.Identities);
                    for (var i=0; i<message.Status.Identities.length; i++) {
                        if (message.Status.Identities[i].Services) {
                            ZitiService.set(message.Status.Identities[i].FingerPrint, message.Status.Identities[i].Services);
                        }
                    }
                    ZitiSettings.init(message.Status);
                    ZitiService.refresh();
                    ui.state(message.Status);
                } else if (message.Op=="metrics") {
                    app.metrics(message.Identities);
                } else if (message.Op=="identity") {
                    var id = message.Id;

                    var idSelected = ZitiIdentity.selected();
                    if (id.FingerPrint==idSelected.FingerPrint) modal.close();

                    if (!id.Services) id.Services = [];
                    id.TotalServices = id.Services.length;
                    id.Status = ((id.Active)?"Active":"Inactive");

                    if (message.Action=="added") {
                        ZitiIdentity.add(id);
                    } else if (message.Action=="updated") {
                        ZitiIdentity.update(id);
                    }
                } else if (message.Op=="mfa") {
                    console.log(message);
                    if (message.Action=="enrollment_challenge") {

                        // An enrollment request was made to the controller
                        var identity = ZitiIdentity.getByIdentifier(message.Identifier);
                        mfa.setup(message, identity);
                    } else if (message.Action=="enrollment_verification") {

                        // The Enrollment verification event
                        if (message.Successful) {
                            modal.hide();
                            mfa.recoveryCodes();
                        } else {
                            growler.error(app.keys.InvalidMFACode)
                        }
                    }
                }
            } else {
                if (message.Type=="Status") {

                } else {
                    if (message.Success != null) {
                        if (!message.Success) growler.error(message.Error);    
                        
                        // Remove Identity Success Event
                        if (message.Data !=null) {
                            if (message.Data.Command !=null) {
                                if (message.Data.Command=="RemoveIdentity") {
                                    $(".loader").hide();
                                    ZitiIdentity.forgotten(message.Data.Data.Identifier);
                                    growler.success("Identity Forgotten");
                                } 
                            } else {
                                if (message.Data.RecoveryCodes!=null && message.Data.RecoveryCodes.length>0) {
                                    let identity = ZitiIdentity.selected();
                                    mfa.MfaCodes[identity.FingerPrint] = message.Data.RecoveryCodes;
                                    //mfa.recoveryCodes();
                                }
                            }
                        }
                    } else {

                        if (app.actionId!=null) {
                            if (message.Error!=null && message.Error.trim().length>0) {
                                growler.error(message.Error);
                                $(".loader").hide();
                                $(".actionPending").removeClass("disabled");
                            } else if (message.Message!=null && message.Message.trim().length>0) {
                                $(".loader").hide();
                                $(".actionPending").removeClass("disabled");
                                if (app.actionId=="CaptureLogs") {
                                    shell.showItemInFolder(message.Message);
                                    growler.success("Package Generated");
                                }
                                app.actionId = null;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            Log.error("app.onData", e);
            console.log(data);
        }
    },
    metrics: function(identities) {
        var totalUp = 0;
        var totalDown = 0;
        for (var i=0; i<identities.length; i++) {
            totalUp += identities[i].Metrics.Up;
            totalDown += identities[i].Metrics.Down;
            ZitiIdentity.metrics(identities[i].FingerPrint, identities[i].Metrics.Up, identities[i].Metrics.Down);
        }
        if (app.upMetricsArray.length>20) app.upMetricsArray.shift();
        if (app.downMetricsArray.length>20) app.downMetricsArray.shift();
        app.upMetricsArray.push(totalUp);
        app.downMetricsArray.push(totalDown);
        console.log(app.upMetricsArray);
        console.log(app.downMetricsArray);

        if (!app.downChart) {
            app.downChart = Highcharts.chart('DownloadServiceGraph', {
                chart: { type: 'spline' },
                credits: { enabled: false },
                title: { text: ' '},
                subtitle: { text: ' ' },
                legend:{ enabled:false },
                yAxis: {
                    labels: { enabled: false },
                    title: { text: ' ' },
                    lineWidth: 0,
                    min: 0,
                    tickInterval: 100,
                    gridLineWidth: 0,
                },
                xAxis: {
                    labels: { enabled: false },
                    title: { text: ' ' },
                    lineWidth: 0,
                    min: 0,
                    tickInterval: 100,
                    gridLineWidth: 0,
                },
                tooltip: { enabled: false },
                plotOptions: {
                    series: {
                          lineColor: '#00DC5A',
                        states: {
                            hover: {
                                enabled: false
                            }
                        }
                    }
                },
                series: [ {
                    marker: {
                      enabled: false
                  },
                    name: '',
                  data: app.downMetricsArray
                }]
            });
        } else {
            app.downChart.series[0].update({
                data: app.downMetricsArray
            }, true);
        }
        if (!app.upChart) {
            app.upChart = Highcharts.chart('UploadServiceGraph', {
                chart: { type: 'spline' },
                credits: { enabled: false },
                title: { text: ' '},
                subtitle: { text: ' ' },
                legend:{ enabled:false },
                yAxis: {
                    labels: { enabled: false },
                    title: { text: ' ' },
                    lineWidth: 0,
                    min: 0,
                    tickInterval: 100,
                    gridLineWidth: 0,
                },
                xAxis: {
                    labels: { enabled: false },
                    title: { text: ' ' },
                    lineWidth: 0,
                    min: 0,
                    tickInterval: 100,
                    gridLineWidth: 0,
                },
                tooltip: { enabled: false },
                plotOptions: {
                    series: {
                        lineColor: '#FFC400',
                        states: {
                            hover: {
                                enabled: false
                            }
                        }
                    }
                },
                series: [ {
                    marker: {
                    enabled: false
                },
                    name: '',
                data: app.downMetricsArray
                }]
            });
        } else {
            app.upChart.series[0].update({
                data: app.upMetricsArray
            }, true);
        }
    },
    action: function(e) {
        var id = $(e.currentTarget).data("action");
        Log.debug("app.action", id);
        ipcRenderer.invoke("action-"+id, "");
    },
    sendMessage: function(e) {
        Log.debug("app.sendMessage", e);
        ipcRenderer.invoke("message", e);
    },
    sendMonitorMessage: function(e) {
        Log.debug("app.sendMonitorMessage", e);
        ipcRenderer.invoke("monitor-message", e);
    },
    startAction: function(name) {
        app.actionId = name;
        $(".actionPending").addClass("disabled");
        $(".loader").show();
    }
}

$(document).ready(app.init);