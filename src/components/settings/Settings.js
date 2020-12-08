import React from "react";
import Sites from "./Sites";
import OAuthSettings from "./OAuthSettings";
import {Checkbox, LabelledField} from "elv-components-js";
import {inject, observer} from "mobx-react";

@inject("rootStore")
@observer
class Tenancy extends React.Component {
  render() {
    return (
      <div className="page-container titles">
        <div className="page-header">
          <h1>Tenancy</h1>
        </div>

        <form>
          <LabelledField label="Tenant ID">
            <input
              value={this.props.rootStore.tenantId}
              onChange={event => this.props.rootStore.SetTenantId(event.target.value)}
            />
          </LabelledField>
        </form>
      </div>
    );
  }
}

@inject("rootStore")
@observer
class PolicySettings extends React.Component {
  render() {
    return (
      <div className="page-container titles">
        <div className="page-header">
          <h1>Policy Settings</h1>
        </div>

        <Checkbox
          label="Require Permissions for Public Metadata"
          value={this.props.rootStore.policySettings.require_perm_for_public_area}
          onChange={value => this.props.rootStore.SetPolicySetting("require_perm_for_public_area", value)}
        />
      </div>
    );
  }
}

const Settings = () => {
  return (
    <div className="page-container">
      <Tenancy />
      <PolicySettings />
      <OAuthSettings />
      <div className="settings-spacer" />
      <Sites />
    </div>
  );
};

export default Settings;
