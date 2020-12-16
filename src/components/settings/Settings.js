import React from "react";
import Sites from "./Sites";
import OAuthSettings from "./OAuthSettings";
import {Action, Checkbox, Confirm, LabelledField} from "elv-components-js";
import {inject, observer} from "mobx-react";

@inject("rootStore")
@observer
class Tenancy extends React.Component {
  render() {
    return (
      <div className="page-container">
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
    let title = `Update policy to version ${this.props.rootStore.latestPolicyVersion}`;

    let confirmation = [
      <div>Are you sure you want to update the policy to version {this.props.rootStore.latestPolicyVersion}?</div>
    ];

    if(this.props.rootStore.currentPolicyVersion) {
      confirmation.push(
        <div>(current version: {this.props.rootStore.currentPolicyVersion})</div>
      );

      title = this.props.rootStore.currentPolicyVersion < this.props.rootStore.latestPolicyVersion ? title :
        `Policy already at latest version (${this.props.rootStore.currentPolicyVersion})`;
    }

    if(!this.props.rootStore.isPolicySigner) {
      title = "Only the signer of the policy may update it";
    }

    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Policy Settings</h1>
        </div>

        <Checkbox
          label="Require Permissions for Public Metadata"
          value={this.props.rootStore.policySettings.require_perm_for_public_area}
          onChange={value => this.props.rootStore.SetPolicySetting("require_perm_for_public_area", value)}
        />

        <LabelledField label="Update Policy">
          <Action
            disabled={
              !this.props.rootStore.isPolicySigner ||
              (this.props.rootStore.currentPolicyVersion >= this.props.rootStore.latestPolicyVersion)
            }
            title={title}
            onClick={async () => await Confirm({
              message: confirmation,
              onConfirm: () => this.props.rootStore.UpdatePolicy(true)
            })}
          >
            Update Policy
          </Action>
        </LabelledField>
      </div>
    );
  }
}

const Settings = () => {
  return (
    <div className="page-container settings-page">
      <Tenancy />
      <PolicySettings />
      <OAuthSettings />
      <Sites />
    </div>
  );
};

export default Settings;
