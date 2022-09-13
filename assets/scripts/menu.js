
var menu = {
    init: function() {
        menu.events();
    },
    events: function() {
        $("#FeedbackButton").click(menu.Feedback);
        $("#GenerateButton").click(menu.GetLogPackage);
        $("#AppLogButton").click(menu.OpenAppLogs);
    },
    Feedback: function() {
        shell.openExternal("mailto:support@openziti.org?subject=Desktop%20Edge%20Feedback");
    },
    GetLogPackage: function() {
        app.action = "CaptureLogs";
        var action = {
            Op: app.action,
            Action: "Normal"
        };
        app.startAction(app.action);
        app.sendMonitorMessage(action);
    },
    OpenAppLogs: function(e) {
        shell.showItemInFolder(rootPath+path.sep+"logs"+path.sep+"UI"+path.sep+"ZitiDesktopEdge"+moment().format("YYYYMMDD")+".log");
    }
}