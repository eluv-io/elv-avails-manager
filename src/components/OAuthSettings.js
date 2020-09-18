import React from "react";
import {inject, observer} from "mobx-react";
import {Action, LabelledField, LoadingElement} from "elv-components-js";

@inject("rootStore")
@observer
class OAuthSettings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      syncing: false
    };
  }

  render() {
    return (
      <form
        onSubmit={async event => {
          event.preventDefault();

          try {
            this.setState({syncing: true});

            await this.props.rootStore.SyncOAuth();
          } finally {
            this.setState({syncing: false});
          }
        }}
      >
        <h1>Link to Okta OAuth Provider</h1>
        <LabelledField label="Okta Domain">
          <input
            required
            placeholder="https://<OktaDomain>"
            value={this.props.rootStore.oauthSettings.domain}
            onChange={event => this.props.rootStore.SetOAuthSetting("domain", event.target.value)}
          />
        </LabelledField>
        <LabelledField label="Admin Token">
          <input
            required
            type="password"
            value={this.props.rootStore.oauthSettings.adminToken}
            onChange={event => this.props.rootStore.SetOAuthSetting("adminToken", event.target.value)}
          />
        </LabelledField>

        <div className="form-actions">
          <LoadingElement loading={this.state.syncing}>
            <Action type="submit">Sync</Action>
          </LoadingElement>
        </div>
      </form>
    );
  }
}

export default OAuthSettings;
