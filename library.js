/*
 * library.js
 *
 * Copyright © 2015-2017 Antergos
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
 */

const
	NODEBB          = module.parent,
	USER            = NODEBB.require( './user' ),
	DB              = NODEBB.require( './database' ),
	META            = NODEBB.require( './meta' ),
	NCONF           = NODEBB.require( 'nconf' ),
	PASSPORT        = NODEBB.require( 'passport' ),
	AUTH_CONTROLLER = NODEBB.require( './controllers/authentication' ),
	AUTH0_STRATEGY  = require( 'passport-auth0' ).Strategy;

const
	ADMIN_ICON   = 'fa-star',
	ADMIN_ROUTE  = '/plugins/sso-auth0',
	CALLBACK_URL = NCONF.get('url') + '/auth/auth0/callback';

const STRATEGY_INFO = {
	name: 'auth0',
	url: '/auth/auth0',
	callbackURL: '/auth/auth0/callback',
	icon: ADMIN_ICON,
	scope: 'user:email'
};


class Auth0 {

	constructor() {
		this.settings = null;

		this._initialize();
	}

	/**
	 * Wrapper for callback-based async functions.
	 *
	 * @param func
	 * @param args
	 *
	 * @return Array
	 */
	async _do_async( func, ...args ) {
		return new Promise( (resolve, reject) => {
			const done = (err, ...args) => err ? reject( [err, ...args] ) : resolve( [err, ...args] );

			return func( ...args, done );
		} );
	}

	async _initialize() {
		[err, this.settings] = await this._do_async( META.settings.get, 'sso-auth0' );
	}

	static _error( error, data = {} ) {
		console.error( `AUTH0 ERROR - ENO-${error}: ` + JSON.stringify( data ) );
		return `An error has occurred. Please report this error to us and include the 
				following error code in your report: ENO-${error}.`;
	}

	addMenuItem( custom_header, callback ) {
		custom_header.authentication.push({
			'route': ADMIN_ROUTE,
			'icon': ADMIN_ICON,
			'name': this.constructor.name,
		});

		return callback( null, custom_header );
	}

	async deleteUserData( data, callback ) {
		const uid      = data.uid;
		const do_error = error => winston.error( `[sso-auth0] Could not remove OAuthId data for uid ${uid}. Error: ${error}` );

		let [err, auth0id] = await this._do_async( USER.getUserField, uid, 'auth0id' );

		if ( err ) {
			do_error( err );
			return callback( err );
		}

		[err, res] = await this._do_async( DB.deleteObjectField, 'auth0id:uid', auth0id );

		if ( err ) {
			do_error( err );
			return callback( err );
		}

		return callback( null, uid );
	}

	static getEmailFromProfile( profile ) {
		let email = profile.emails;

		if ( Array.isArray( email ) && email.length ) {
			email = email[0];
		}

		if ( 'object' === typeof email && 'value' in email ) {
			email = email.value;
		}

		return email;
	}

	async handleAuthRequest( request, accessToken, refreshToken, params, profile, done ) {
		if ( this.isUserLoggedIn( request ) ) {
			this.onUserLoggedIn( request.user.uid, profile.id, request );

			return done( null, request.user );
		}

		const email = this.getEmailFromProfile( profile );

		if ( 'string' !== typeof email || ! email ) {
			return done( this._error( '010', {user: request.user, profile: profile} ) );
		}

		const [err, user] = await this.login( profile.id, profile.nickname, email );

		if ( err ) {
			return done( err );
		}

		return done( null, user );
	}

	static isUserLoggedIn( request ) {
		return ( 'user' in request && 'uid' in request.user && parseInt( request.user.uid ) > 0 );
	}

	async getAssociation( data, callback ) {
		const [err, auth0id] = await this._do_async( USER.getUserField, data.uid, 'auth0id' );

		if ( err ) {
			return callback( err, data );
		}

		const association = {
			associated: false,
			name: this.constructor.name,
			icon: ADMIN_ICON,
			url: NCONF.get('url') + '/auth/auth0',
		};

		if ( auth0id ) {
			association.associated = true;
		}

		data.associations.push( association );

		callback( null, data );
	}

	getStrategy( strategies, callback ) {
		if ( ! ['id', 'secret', 'domain'].every( key => key && key in this.settings ) ) {
			return callback( null, strategies );
		}

		const options = {
			domain: this.settings.domain,
			clientID: this.settings.id,
			clientSecret: this.settings.secret,
			callbackURL: NCONF.get('url') + '/auth/auth0/callback',
			passReqToCallback: true,
		};

		PASSPORT.use( new AUTH0_STRATEGY( options, this.handleAuthRequest ) );

		strategies.push( STRATEGY_INFO );

		callback( null, strategies );
	}

	async getUidByAuth0Id( auth0id ) {
		return this._do_async( DB.getObjectField, 'auth0id:uid', auth0id );
	}

	init( data, callback ) {
		const renderAdmin = ( request, response ) => {
			response.render( 'admin/plugins/sso-auth0', {callbackURL: CALLBACK_URL} );
		};

		const logoutCallback = ( request, response ) => response.render( '/', {logoutFlag: true} );

		data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);
		data.router.get('/auth/auth0/logout/callback', logoutCallback);

		return callback();
	}

	async login( auth0id, username, email ) {
		let [err, uid] = await this.getUidByAuth0Id( auth0id );

		if ( err ) {
			return [err, {}];
		}

		if ( uid ) {
			// Existing User
			return [null, {uid: uid}];
		}

		[err, uid] = await this._do_async( USER.getUidByEmail, email );

		if ( err ) {
			return [err, {}];
		}

		if ( ! uid ) {
			// New account -- create
			[err, uid] = await this._do_async( USER.create, {username: username, email: email} );

			if ( err ) {
				return [err, {}];
			}
		}

		this.onUserLoggedIn( uid, auth0id );

		return [null, {uid: uid}];
	}

	noLoginAfterRegister( params, callback ) {
		params.res.locals.processLogin = false;

		setTimeout( () => callback( null, params ), 1000 );
	}

	static onUserLoggedIn( uid, profile_id, request = null ) {
		// Save Auth0-specific information to the user profile
		USER.setUserField( uid, 'auth0id', profile_id );
		DB.setObjectField( 'auth0id:uid', profile_id, uid );

		if ( null !== request ) {
			// NodeBB onSuccessfulLogin hook
			AUTH_CONTROLLER.onSuccessfulLogin( request, request.user.uid );
		}
	}
}



module.exports = new Auth0();

