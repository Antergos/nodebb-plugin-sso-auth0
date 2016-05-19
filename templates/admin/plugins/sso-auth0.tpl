<!--
  ~ sso-auth0.tpl
  ~
  ~ Copyright © 2015-2016 Antergos
  ~
  ~ This file is part of nodebb-plugin-sso-auth0.
  ~
  ~ nodebb-plugin-sso-auth0 is free software; you can redistribute it and/or modify
  ~ it under the terms of the GNU General Public License as published by
  ~ the Free Software Foundation; either version 3 of the License, or
  ~ (at your option) any later version.
  ~
  ~ nodebb-plugin-sso-auth0 is distributed in the hope that it will be useful,
  ~ but WITHOUT ANY WARRANTY; without even the implied warranty of
  ~ MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  ~ GNU General Public License for more details.
  ~
  ~ The following additional terms are in effect as per Section 7 of the license:
  ~
  ~ The preservation of all legal notices and author attributions in
  ~ the material or in the Appropriate Legal Notices displayed
  ~ by works containing it is required.
  ~
  ~ You should have received a copy of the GNU General Public License
  ~ along with nodebb-plugin-sso-auth0; If not, see <http://www.gnu.org/licenses/>.
  ~
  -->

<div class="row">
	<div class="col-sm-2 col-xs-12 settings-header">Auth0 SSO</div>
	<div class="col-sm-10 col-xs-12">
		<div class="alert alert-info">
			<p>
				Register a new <strong>Application</strong> via your Auth0 Dashboard and then paste
				your application details here.
			</p>
		</div>
		<form class="sso-auth0-settings">
			<div class="form-group">
				<label for="domain">Domain</label>
				<input type="text" name="domain" title="Domain" class="form-control" placeholder="Domain">
			</div>
			<div class="form-group">
				<label for="id">Client ID</label>
				<input type="text" name="id" title="Client ID" class="form-control" placeholder="Client ID">
			</div>
			<div class="form-group">
				<label for="secret">Client Secret</label>
				<input type="text" name="secret" title="Client Secret" class="form-control" placeholder="Client Secret">
			</div>
			<div class="form-group alert alert-warning">
				<label for="callback">Your NodeBB&apos;s "Authorization callback URL"</label>
				<input type="text" id="callback" title="Authorization callback URL" class="form-control" value="{callbackURL}" readonly style="color: #222">
				<p class="help-block" style="color: #ffffff, font-weight:700">
					Ensure that this value is set in your Auth0 application&apos;s settings
				</p>
			</div>
		</form>
	</div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>