

var ui = {
    hello: null,
    timerInterval: null,
    seconds: 0,
    isOn: false,
    init: function() {
        ui.events();
        ui.animate();
    },
    events: function() {
        $("#OnOffButton").click(ui.power);
    },
    state: function(data) {
        ui.isOn = data.Active;
        if (ui.isOn) {
            if (!$("#OnOffButton").hasClass("on")) {
                if (ui.timerInterval) clearInterval(ui.timerInterval);
                ui.seconds = Math.ceil(data.Duration/1000);
                
                ui.timerInterval = setInterval(ui.tick, 1000);
                $("#OnOffButton").addClass("on");
                $("#CircleArea").show();
                $("#WelcomeBadge").hide();
            }
        } else {
            ui.seconds = 0;
            $("#UploadSpeed").html("0.0");
            $("#DownloadSpeed").html("0.0");
            $("#OnOffButton").removeClass("on");
            $("#CircleArea").hide();
            $("#WelcomeBadge").show();
        }
    },
    power: function(e) {
        if ($("#OnOffButton").hasClass("on")) {
            if (ui.timerInterval) clearInterval(ui.timerInterval);
            ui.seconds = 0;
            ui.isOn = false;
            $("#UploadSpeed").html("0.0");
            $("#DownloadSpeed").html("0.0");
            // Show Loader Turn off Service
            app.sendMonitorMessage({ Op:"Stop", Action:"Normal" });
            $("#OnOffButton").removeClass("on");
            ui.state({Active: false});
            ZitiIdentity.data = [];
            ZitiService.data = [];
            $("#NavServiceCount").html("0");
            $("#NavIdentityCount").html("0");
            $("#CircleArea").hide();
            $("#WelcomeBadge").show();
        } else {
            // Show Loader Turn On Service
            app.sendMonitorMessage({ Op:"Start", Action:"Normal" });
            ui.timerInterval = setInterval(ui.tick, 1000);
            ui.isOn = true;
            $("#OnOffButton").addClass("on");
            $("#CircleArea").show();
            $("#WelcomeBadge").hide();
        }
    },
    tick: function() {
        ui.seconds++;
            
        var day = 86400;
        var hour = 3600;
        var minute = 60;
            
        var totalseconds = ui.seconds;

        var daysout = Math.floor(totalseconds / day);
        var hoursout = Math.floor((totalseconds - daysout * day)/hour);
        var minutesout = Math.floor((totalseconds - daysout * day - hoursout * hour)/minute);
        var secondsout = totalseconds - daysout * day - hoursout * hour - minutesout * minute;

        var label = "";
        if (daysout>0) label += daysout+":";
        if (hoursout<10) label += "0";
        label += hoursout+":";
        if (minutesout<10) label += "0";
        label += minutesout+":";
        if (secondsout<10) label += "0";
        label += secondsout;

        $("#Timer").html(label);
    },
    animate: function() {
        ui.hello = bodymovin.loadAnimation({
            container: document.getElementById('HelloZiggy'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: './assets/animations/helloziggy.json'
        });
    }
}