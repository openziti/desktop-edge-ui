

var modal = {
	init: function() {
		// $("body").append('<div class="modal background"></div>');
		$("#ConfirmCancel").click(modal.close);
		modal.events();
	},
	events: function() {
		$(".modal .close").click(modal.close);
	},
	show: function(id) {
		$(".modal.background").addClass("open");
		$("#"+id).addClass("open");
		$("body").addClass("hideScroll");
	},
	hide: function(e) {
		$(".modal.open").removeClass("open");
		$("body").removeClass("hideScroll");
	},
	close: function(e) {
		$(".modal.open").removeClass("open");
		$("body").removeClass("hideScroll");
		if (e && e.currentTarget) {
			var action = $(e.currentTarget).data("action");
			if (action!=null) {
				if (action=="mfasetup") $("#MfaToggle").removeClass("on");
				if (action=="mfaremove") $("#MfaToggle").addClass("on");
			}
		}
	},
	confirm: function(onConfirm, onCancel, message, title, yesLabel, noLabel) {
		var cTitle = "Delete Confirmation";
		var cText = "Are you sure you want to continue?<br/><br/>Once this is deleted it will be gone forever.";
		var cYes = "yes";
		var cNo = "no";
		if (title) cTitle = title;
		if (message) cText = message;
		if (yesLabel) cYes = yesLabel;
		if (noLabel) cNo = noLabel;

		$("#ConfirmTitle").html(cTitle);
		$("#ConfirmMessage").html(cText);
		$("#YesButton").html(cYes);
		$("#NoButton").html(cNo);

		modal.show("ConfirmModal");

		$("#YesButton").off("click");
		$("#YesButton").click(function(e) {
			if (onConfirm) onConfirm();
			modal.close();
		});
		
		$("#NoButton").off("click");
		$("#NoButton").click(function(e) {
			if (onCancel) onCancel();
			modal.close();
		});
	}
}