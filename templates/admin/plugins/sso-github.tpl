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
				<label for="id">Client ID</label>
				<input type="text" name="id" title="Client ID" class="form-control" placeholder="Client ID">
			</div>
			<div class="form-group">
				<label for="secret">Client Secret</label>
				<input type="text" name="secret" title="Client Secret" class="form-control"
					placeholder="Client Secret"/>
			</div>
			<div class="form-group alert alert-warning">
				<label for="callback">Your NodeBB&apos;s "Authorization callback URL"</label>
				<input type="text" id="callback" title="Authorization callback URL" class="form-control"
					value="{callbackURL}" readonly/>
				<p class="help-block">
					Ensure that this value is set in your Auth0 application&apos;s settings
				</p>
			</div>
		</form>
	</div>
</div>

<button id="save"
	class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>