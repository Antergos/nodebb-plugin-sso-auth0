/*
 * main.js
 *
 * Copyright © 2015-2016 Antergos
 *
 * This file is part of nodebb-plugin-sso-auth0.
 *
 * nodebb-plugin-sso-auth0 is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * nodebb-plugin-sso-auth0 is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * The following additional terms are in effect as per Section 7 of the license:
 *
 * The preservation of all legal notices and author attributions in
 * the material or in the Appropriate Legal Notices displayed
 * by works containing it is required.
 *
 * You should have received a copy of the GNU General Public License
 * along with nodebb-plugin-sso-auth0; If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function($) {
	$(document).ready(function() {
		require(['settings'], function(settings) {
			var logout_in_progress = localStorage.getItem('logging_out'),
				domain = (settings.hasOwnProperty('domain') && '' !== settings.domain) ? settings.domain : false,
				redirect = window.location.hostname;

			$(window).on('action:ajaxify.contentLoaded', function(data) {
					window.app.logout = function() {
						require(['csrf'], function(csrf) {
							$.ajax(config.relative_path + '/logout', {
								type: 'POST',
								headers: {
									'x-csrf-token': csrf.get()
								},
								success: function() {
									window.location.href = config.relative_path + '/';
								}
							});
						});
					};
				}
			);

			if (false !== domain) {
				$('li[component="user/logout"]').on('click', function() {
					var logout_in_progress = localStorage.getItem('logging_out'),
						loc, goto;
					if ('true' !== logout_in_progress) {
						localStorage.setItem('logging_out', 'true');
						loc = window.location;
						goto = loc.protocol + '//' + domain + '/v2/logout?federated&redirectTo=' + loc.protocol + '//' + loc.hostname + '/logout';
						window.location = goto;
					} else {
						localStorage.setItem('logging_out', 'false');
					}
				});
			}
		})
	});
})(jQuery);
