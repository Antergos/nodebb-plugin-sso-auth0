/*
 * library.js
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

(function(module) {
	"use strict";

	var User = module.parent.require('./user'),
		db = module.parent.require('./database'),
		meta = module.parent.require('./meta'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async'),
		passport = module.parent.require('passport'),
		request = module.parent.require('request'),
		Auth0Strategy = require('passport-auth0').Strategy,
		Auth0 = {},
		constants;

	constants = Object.freeze({
		'name': "Auth0",
		'admin': {
			'icon': 'fa-star',
			'route': '/plugins/sso-auth0'
		}
	});


	Auth0.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-auth0', function(err, settings) {
			if (err || !settings.id || !settings.secret || !settings.domain) {
				var msg = err ? err : 'AUTH0 ERROR: id, secret, and domain are required.';
				return callback(msg);
			}

			passport.use(new Auth0Strategy({
				domain: settings.domain,
				clientID: settings.id,
				clientSecret: settings.secret,
				callbackURL: nconf.get('url') + '/auth/auth0/callback',
				passReqToCallback: true
			}, function(req, accessToken, refreshToken, params, profile, done) {
				console.log(profile);
				if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && parseInt(req.user.uid) > 0) {
					// Save Auth0-specific information to the user
					User.setUserField(req.user.uid, 'auth0id', profile.id);
					db.setObjectField('auth0id:uid', profile.id, req.user.uid);
					return done(null, req.user);
				}

				var email, email_obj = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0] : profile.emails;

				if (typeof email_obj === 'object' && email_obj.hasOwnProperty('value')) {
						email = email_obj.value;
				}
				if (typeof email !== 'string') {
					console.log('AUTH0 ERROR - ENO-010: ' + JSON.stringify({user: req.user, profile: profile}));
					return done('An error has occurred. Please report this error to us and include the following error code in your report: ENO-010.')
				}

				Auth0.login(profile.id, profile.nickname, email, function(err, user) {
					if (err) {
						return done(err);
					}
					done(null, user);
				});
			})); // END passport.use(new Auth0Strategy( function() {

			strategies.push({
				name: 'auth0',
				url: '/auth/auth0',
				callbackURL: '/auth/auth0/callback',
				icon: constants.admin.icon,
				scope: 'user:email'
			});

			callback(null, strategies);

		}); // END meta.settings.get('sso-auth0', function(err, settings) {
	}; // END Auth0.getStrategy()

	Auth0.getAssociation = function(data, callback) {
		User.getUserField(data.uid, 'auth0id', function(err, auth0id) {
			if (err) {
				return callback(err, data);
			}

			if (auth0id) {
				data.associations.push({
					associated: true,
					name: constants.name,
					icon: constants.admin.icon
				});
			} else {
				data.associations.push({
					associated: false,
					url: nconf.get('url') + '/auth/auth0',
					name: constants.name,
					icon: constants.admin.icon
				});
			}

			callback(null, data);
		})
	};

	Auth0.login = function(auth0ID, username, email, callback) {
		if (!email) {
			return callback('AUTH0 ERROR: An unknown error has occurred. ENO-33')
		}

		Auth0.getUidByAuth0ID(auth0ID, function(err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					User.setUserField(uid, 'auth0id', auth0ID);
					db.setObjectField('auth0id:uid', auth0ID, uid);
					callback(null, {
						uid: uid
					});
				};

				User.getUidByEmail(email, function(err, uid) {
					if (!uid) {
						User.create({username: username, email: email}, function(err, uid) {
							if (err !== null) {
								callback(err);
							} else {
								success(uid);
							}
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	Auth0.getUidByAuth0ID = function(auth0ID, callback) {
		db.getObjectField('auth0id:uid', auth0ID, function(err, uid) {
			if (err) {
				callback(err);
			} else {
				callback(null, uid);
			}
		});
	};

	Auth0.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	Auth0.init = function(data, callback) {
		function renderAdmin(req, res) {
			res.render('admin/plugins/sso-auth0', {
				callbackURL: nconf.get('url') + '/auth/auth0/callback'
			});
		}

		function logoutCallback(req, res) {
			res.render('/', {logoutFlag: true});
		}

		data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);
		data.router.get('/auth/auth0/logout/callback', logoutCallback);

		callback();
	};

	Auth0.noLoginAfterRegister = function(params, callback) {
		params.res.locals.processLogin = false;
		setTimeout(function() {
			callback(null, params);
		}, 1500);
	};

	Auth0.deleteUserData = function(uid, callback) {
		async.waterfall([
			async.apply(User.getUserField, uid, 'auth0id'),
			function(oAuthIdToDelete, next) {
				db.deleteObjectField('auth0id:uid', oAuthIdToDelete, next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-auth0] Could not remove OAuthId data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, uid);
		});
	};

	module.exports = Auth0;
}(module));
