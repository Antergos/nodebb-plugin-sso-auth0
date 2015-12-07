define('admin/plugins/sso-auth0', ['settings'], function(Settings) {
	'use strict';
	/* globals $, app, socket, require */

	var ACP = {};

	ACP.init = function() {
		Settings.load('sso-auth0', $('.sso-auth0-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-auth0', $('.sso-auth0-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-auth0-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});