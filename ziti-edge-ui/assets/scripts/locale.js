var locale = {
    key: 'en-us',
    keys: {},
    init: function(language) {
        locale.key = language;
        var defaultFile = path.join(__dirname, '../languages/en-us.json');
        let obj = JSON.parse(fs.readFileSync(defaultFile));

		for (var item in obj) {
			locale.keys[item] = obj[item];
		}
        
        var userFile = path.join(__dirname, '../languages/'+language+'.json');
        if (fs.existsSync(userFile)) {
            let userObj = JSON.parse(fs.readFileSync(userFile));
    
            for (var item in userObj) {
                locale.keys[item] = userObj[item];
            }
        }
        locale.loaded();
    },
    switch: function(language) {
        locale.keys = {};
        locale.init(language);
    },
    get: function(key) {
        if (!locale.keys[key]) return "";
        else return locale.keys[key];
    },
    getLower: function(key) {
        if (!locale.keys[key]) return "";
        else return locale.keys[key].toLowerCase();
    },
	loaded: function() {
		$("[data-i18n]").each((i, e) => {
			var key = $(e).data("i18n");
            var tag = $(e).prop("tagName").toLowerCase();
			if (key && key.trim().length>0) {
                if (tag=="input"||tag=="textarea") $(e).prop("placeholder", locale.keys[key]);
                else $(e).html(locale.keys[key]);
			} else {
				var id = $(e).attr("id");
                if (tag=="input"||tag=="textarea") $("#"+id).prop("placeholder", locale.keys[id]);
                else $("#"+id).html(locale.keys[id]);
			}
		});
	},
    getReplace(key, props) {
        let value = "";
        if (Object.keys(locale.keys).length==0) {
            locale.init(locale.key);
        }
        if (locale.keys[key]) {
            value = locale.keys[key];
            for (let prop in props) {
                if (!props[prop]) props[prop] = "";
                value = value.split("{{"+prop+"}}").join(props[prop]);
            }
        }
        return value;
    }
}