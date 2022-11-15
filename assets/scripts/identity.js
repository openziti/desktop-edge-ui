
var ZitiIdentity = {
    data: [],
    notified: [],
    timerNotified: [],
    notifiable: [],
    sort: "Name",
    mfaInterval: null,
    init: function() {
        ZitiIdentity.data = [];
        ZitiIdentity.events();
    },
    setSort: function(sort) {
        ZitiIdentity.sort = sort;
        $("#IdServiceSort").html(sort); 
        ZitiIdentity.refresh();
    },
    events: function() {
        $("#ForgetButton").click(ZitiIdentity.forget);
    },
    timer: function() {
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            var id = ZitiIdentity.data[i];
            if (id.MfaMaxTimeoutRem>0 && !ZitiIdentity.notifiable.includes(id.FingerPrint)) ZitiIdentity.notifiable.push(id.FingerPrint);
            if (id.MfaEnabled&&id.Status=="Active") {
                var passed = moment.utc().diff(moment.utc(id.MfaLastUpdatedTime), "seconds");
                if ((id.MfaMaxTimeoutRem-passed) <= 0) {
                    if (!ZitiIdentity.notified.includes(id.FingerPrint) && ZitiIdentity.notifiable.includes(id.FingerPrint)) {
                        var message = "Some or all of the services for "+id.Name+" have timed out";
                        var notify = new Notification("Timed Out", { appID: "Ziti Desktop Edge", body: message, tag: id.FingerPrint, icon: path.join(__dirname, '/assets/images/ziti-white.png') });
                        notify.onclick = function(e) {
                            ZitiIdentity.select(e.target.tag);
                            app.showScreen("IdentityScreen");
                        }
                        ZitiIdentity.notified.push(id.FingerPrint);
                    }
                } else {
                    if ((id.MfaMinTimeoutRem-passed) <= 1200) {
                        if (!ZitiIdentity.timerNotified.includes(id.FingerPrint) && ZitiIdentity.notifiable.includes(id.FingerPrint)) {
                            var message = "The services for "+id.Name+" will start to timeout "+moment().add(passed, 'seconds').fromNow();
                            var notify = new Notification("Timeout Warning", { appID: "Ziti Desktop Edge", body: message, tag: id.FingerPrint, icon: path.join(__dirname, '/assets/images/ziti-white.png') });
                            notify.onclick = function(e) {
                                ZitiIdentity.select(e.target.tag);
                                app.showScreen("IdentityScreen");
                            }
                            ZitiIdentity.timerNotified.push(id.FingerPrint);
                        }
                    }
                }
            }
        }
        
        // Check each service for timeouts
        var identity = ZitiIdentity.selected();
        if (identity) {
            if (identity.MfaLastUpdatedTime!=null && identity.MfaMinTimeoutRem>=0) {
                var passed = moment.utc().diff(moment.utc(identity.MfaLastUpdatedTime),"seconds");
                var available = 0;
                for (var i=0; i<identity.Services.length; i++) {
                    var service = identity.Services[i];
                    if (service.TimeoutRemaining==-1) available++;
                    else {
                        if (service.TimeoutRemaining>passed) available++;
                    }
                }
                $("#MfaTimeout").find(".label").html(available+"/"+identity.TotalServices);
                $("#MfaTimeout").addClass("open");
            }
        }
    },
    isInIdentity: function(id, vals) {
        for (var i=0; i<vals.length; i++) {
            if (id.Name.toLowerCase().indexOf(vals[i])>=0) return true;
            else {
                for (var j=0; j<id.Services.length; j++) {
                    var service = id.Services[j];
                    if (service.Address!=null && service.Address.toLowerCase().indexOf(vals[i])>=0) return true;
                    else if (service.Port.toLowerCase().indexOf(vals[i])>=0) return true;
                    else if (service.Protocol.toLowerCase().indexOf(vals[i])>=0) return true;
                }
            }
        }
    },
    forget: function(e) {
        var identity = ZitiIdentity.selected();
        modal.confirm(ZitiIdentity.doForget, null, "If you delete the identity "+identity.name+" you will no longer have access to the resources that it grants you.", "Confirm Forget");
    },
    doForget: function() {
        $(".loader").show();
        let identity = ZitiIdentity.selected();
        let command = {
            Command: "RemoveIdentity",
            Data: {
                Identifier: identity.Identifier
            }
        };
        app.sendMessage(command);
    },
    forgotten: function(id) {
        var data = [];
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            if (ZitiIdentity.data[i].Identifier!=id) data.push(ZitiIdentity.data[i]);
        }
        ZitiIdentity.data = data;
        ZitiIdentity.refresh();
    },
    search: function(filter) {
        var results = [];
        var searchItems = filter.split(' ');
        for (var i=0; i<searchItems.length; i++) searchItems[i] = searchItems[i].toLowerCase();
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            if (ZitiIdentity.isInIdentity(ZitiIdentity.data[i], searchItems)) results.push(ZitiIdentity.data[i]);
        }
        return results;
    },
    refresh: function() {
        var idSelected = ZitiIdentity.selected();
        // Do any ui updates needed
        $("#IdentityCount").html(ZitiIdentity.data.length);
        $("#NavIdentityCount").html(ZitiIdentity.data.length);
        $("#IdentityList").html("");

        ZitiIdentity.data = ZitiIdentity.data.sort((a, b) => {
            var prop = ZitiIdentity.sort.split(' ').join('');
            if (a[prop] < b[prop]) return -1;
            if (a[prop] > b[prop]) return 1;
            return 0;
        });

        if (ZitiIdentity.data.length==0) {
            $("#IdentityScreenArea").addClass("forceHide");
            $("#ServiceScreenArea").addClass("forceHide");
            $("#NoDataIdentityScreen").removeClass("forceHide");
            $("#NoDataServiceScreen").removeClass("forceHide");
        } else {
            $("#IdentityScreenArea").removeClass("forceHide");
            $("#ServiceScreenArea").removeClass("forceHide");
            $("#NoDataIdentityScreen").addClass("forceHide");
            $("#NoDataServiceScreen").addClass("forceHide");
        }

        for (var i=0; i<ZitiIdentity.data.length; i++) {
            var item = ZitiIdentity.data[i];
            ZitiService.set(item.FingerPrint, item.Services);

            var element = $("#IdentityItem").clone();
            element.removeClass("template");
            element.attr("id", "IdentityRow" + i);
            element.attr("data-id", item.FingerPrint);

            if (idSelected!=null) {
                if (idSelected.Identifier==item.Identifier) {
                    element.addClass("selected");
                }
            } else {
                if (i==0) {
                    element.addClass("selected");
                }
            }

            if (item.MfaMinTimeoutRem>=0) {
                if (ZitiIdentity.mfaInterval != null) clearInterval(ZitiIdentity.mfaInterval);
                ZitiIdentity.mfaInterval = setInterval(ZitiIdentity.timer, 1000);
            }

            var status = "";
            // Check if timing out and set to warn or if timed out and set to error

            element.html(element.html().split("{{count}}").join(item.Services.length));
            element.html(element.html().split("{{toggled}}").join(item.Active?"on":""));
            element.html(element.html().split("{{status}}").join(status));

            for (var prop in item) {
                element.html(element.html().split("{{"+prop+"}}").join(ZitiIdentity.getValue(item[prop])));
            }
            $("#IdentityList").append(element);
        }
        ZitiService.refresh();
        $(".identities").find(".toggle").off("click");
        $(".identities").find(".toggle").on("click", (e) => {
            if ($(e.currentTarget).hasClass("on")) $(e.currentTarget).removeClass("on");
            else $(e.currentTarget).addClass("on");

            var isOn = $(e.currentTarget).hasClass("on");
            var command = {
                Command: "IdentityOnOff", 
                Data: {
                    Identifier: $(e.currentTarget).data("id"),
                    OnOff: isOn
                }
            };
            app.sendMessage(command);

            e.stopPropagation();
            // Toggle State
        });
        $(".identities").click((e) => {
            $(".identities").removeClass("selected");
            $(e.currentTarget).addClass("selected");
            let identity = ZitiIdentity.selected();
            ZitiIdentity.select(identity.FingerPrint);
        });
        if (ZitiIdentity.data.length>0) {
            let identity = ZitiIdentity.selected();
            ZitiIdentity.select(identity.FingerPrint);
        }
    },
    select: function(id) {
        var elem = $(".identities[data-id='"+id+"']");
        var item = ZitiIdentity.getById(id);
        $(".identities").removeClass("selected");
        elem.addClass("selected");
        $("#IdName").html(item.Name);
        if (item.Config) {
            $("#IdNetwork").html(item.Config.ztAPI);
            $("#IdControllerVersion").html(item.ControllerVersion);
        }
        $("#MfaStatus").removeClass("open");
        $("#MfaStatus").find(".icon").removeClass("connected");
        $("#MfaStatus").find(".icon").removeClass("authorize");
        $("#MfaTimeout").removeClass("open");
        $("#MfaToggle").removeClass("disabled");
        if (item.MfaEnabled) {
            $("#MfaToggle").addClass("on");
            if (item.MfaNeeded) {
                $("#MfaStatus").find(".icon").addClass("authorize");
                $("#MfaStatus").find(".label").html("Authorize");
                $("#MfaToggle").addClass("disabled");
            } else {
                $("#MfaStatus").find(".icon").addClass("connected");
                $("#MfaStatus").find(".label").html("Connected");
            }
            $("#MfaStatus").addClass("open");
            // Calc Time since
            if (item.MfaLastUpdatedTime!=null && item.MfaMinTimeoutRem>=0) {
                $("#MfaTimeout").addClass("open");
            }
        } else $("#MfaToggle").removeClass("on");
        ZitiService.refresh();
    },
    selected: function() {
        return ZitiIdentity.getById($(".identities.selected").data("id"));
    },
    add: function(identity) {
        var id = identity.FingerPrint;
        var found = false;
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            var item = ZitiIdentity.data[i];
            if (item.FingerPrint==id) {
                ZitiIdentity.data[i] = identity;
                found = true;
                break;
            }
        }
        if (!found) ZitiIdentity.data.push(identity);
        ZitiIdentity.refresh();
    },
    update: function(identity) {
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            if (ZitiIdentity.data[i].Identifier == identity.Identifier) {
                ZitiIdentity.data[i] = identity;
                break;
            }
        }
        ZitiIdentity.refresh();
    },
    set: function(identities) {
        ZitiIdentity.data = identities;
        ZitiIdentity.refresh();
    },
    getById: function(id) {
        if (id!=null) {
            for (var i=0; i<ZitiIdentity.data.length; i++) {
                var item = ZitiIdentity.data[i];
                if (item.FingerPrint==id) return item;
            }
        }
        return null;
    },
    getByIdentifier: function(id) {
        for (var i=0; i<ZitiIdentity.data.length; i++) {
            var item = ZitiIdentity.data[i];
            if (item.Identifier==id) return item;
        }
        return null;
    },
    getValue: function (item) {
        if (item!=null) return item;
        else return "";
    },
    metrics: function(fingerprint, up, down) {
        var upscale = app.keys.kbps;
        var downscale = app.keys.kbps;
        var upsize = 0;
        var downsize = 0;
        for (var i=0; i<this.data.length; i++) {
            if (this.data[i].FingerPrint==fingerprint) {
                this.data[i].Metrics.Up = up;
                this.data[i].Metrics.Down = down;

                upsize += up;
                downsize += down;

                break;
            }
        }

        if (upsize>1024) {
            upsize = upsize/1024;
            upscale = app.keys.mbps;
        }
        if (upsize>1024) {
            upsize = upsize/1024;
            upscale = app.keys.gbps;
        }
        if (upsize>1024) {
            upsize = upsize/1024;
            upscale = app.keys.tbps;
        }
        //$("#UploadSpeed").html(upsize.toFixed(1));
        //$("#UploadMeasure").html(upscale);
        
        if (downsize>1024) {
            downsize = downsize/1024;
            downscale = app.keys.mbps;
        }
        if (downsize>1024) {
            downsize = downsize/1024;
            downscale = app.keys.gbps;
        }
        if (downsize>1024) {
            downsize = downsize/1024;
            downscale = app.keys.tbps;
        }
        //$("#DownloadSpeed").html(downsize.toFixed(1));
        //$("#DownloadMeasure").html(downscale);
    }
}