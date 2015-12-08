(function(module) {
	"use strict";

	var User = module.parent.require('./user'),
		db = module.parent.require('./database'),
		meta = module.parent.require('./meta'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async'),
		passport = module.parent.require('passport'),
		Auth0Strategy = require('passport-auth0').Strategy;

	var constants = Object.freeze({
		'name': "Auth0",
		'admin': {
			'icon': 'fa-star',
			'route': '/plugins/sso-auth0'
		}
	});

	var Auth0 = {};

	Auth0.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-auth0', function(err, settings) {
			if (!err && settings.id && settings.secret && settings.domain) {
				passport.use(new Auth0Strategy({
					domain: settings.domain,
					clientID: settings.id,
					clientSecret: settings.secret,
					callbackURL: nconf.get('url') + '/auth/auth0/callback',
					passReqToCallback: true
				}, function(req, token, tokenSecret, extraParams, profile, done) {
					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save Auth0-specific information to the user
						User.setUserField(req.user.uid, 'auth0id', profile.id);
						db.setObjectField('auth0id:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					var email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
					Auth0.login(profile.id, profile.username, email, function(err, user) {
						if (err) {
							return done(err);
						}
						done(null, user);
					});
				}));

				strategies.push({
					name: 'auth0',
					url: '/auth/auth0',
					callbackURL: '/auth/auth0/callback',
					icon: constants.admin.icon,
					scope: 'user:email'
				});
			}

			callback(null, strategies);
		});
	};

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
			email = username + '@users.noreply.auth0.com';
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

		data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);

		callback();
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
