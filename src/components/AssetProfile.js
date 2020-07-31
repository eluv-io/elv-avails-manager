import React from "react";
import {inject, observer} from "mobx-react";
import {Action, Confirm, DateSelection, Modal, Selection} from "elv-components-js";
import PropTypes from "prop-types";
import AssetList from "./AssetList";
import {toJS} from "mobx";
import {withRouter} from "react-router";

@inject("rootStore")
@observer
class AssetSelectionModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      selectedAssets: [],
      permission: "full-access",
      startTime: undefined,
      endTime: undefined
    };
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.objectId];
  }

  render() {
    return (
      <div className="asset-selection-modal">
        <h3>Asset Permissions</h3>
        <Selection
          label="Asset Permission"
          value={this.state.permission}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={permission => this.setState({permission})}
        />
        <DateSelection label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <Action
          onClick={() =>
            this.props.onSubmit({
              permission: this.state.permission,
              startTime: this.state.startTime,
              endTime: this.state.endTime,
              selectedAssets: this.state.selectedAssets
            })
          }
        >
          Add Asset Permissions
        </Action>
        <AssetList assets={this.Title().assets} baseUrl={this.Title().baseUrl} selectable onSelect={selectedAssets => this.setState({selectedAssets})} />
      </div>
    );
  }
}

AssetSelectionModal.propTypes = {
  objectId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired
};

@inject("rootStore")
@observer
@withRouter
class AssetProfile extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: null,
      show: false,
      selectedAssets: [],
      startTime: undefined,
      endTime: undefined,
      permission: "full-access",
      version: 0
    };

    this.SetAssetPermissions = this.SetAssetPermissions.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.objectId];
  }

  ProfileInfo() {
    return this.props.rootStore.titleProfiles[this.props.objectId][this.props.profile];
  }

  SelectedAssetForm() {
    if(this.state.selectedAssets.length === 0) { return null; }

    return (
      <div className="asset-profile-selected-asset-form">
        <h3>Modify Selected Asset Permissions</h3>
        <Selection
          label="Asset Permission"
          value={this.state.permission}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={permission => this.setState({permission})}
        />
        <DateSelection label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <Action
          onClick={async () =>
            await Confirm({
              message: "Are you sure you want to update these assets?",
              onConfirm: () => {
                this.SetAssetPermissions({
                  permission: this.state.permission,
                  startTime: this.state.startTime,
                  endTime: this.state.endTime,
                  selectedAssets: this.state.selectedAssets
                });

                this.setState({
                  selectedAssets: [],
                  startTime: undefined,
                  endTime: undefined,
                  permission: "full-access",
                  version: this.state.version + 1
                });
              }
            })
          }
        >
          Update Selected Assets
        </Action>
      </div>
    );
  }

  render() {
    let toggleButton = (
      <Action onClick={() => this.setState({show: !this.state.show})} className="secondary">
        { this.state.show ? "Hide Asset Permissions" : "Show Asset Permissions"}
      </Action>
    );

    if(!this.state.show) {
      return (
        <div className="permission-profile asset-profile">
          { toggleButton }
        </div>
      );
    }

    return (
      <div className="permission-profile asset-profile">
        { this.state.modal }
        { toggleButton }
        <Selection
          className="asset-default-permission"
          label="Default Asset Permission"
          value={this.ProfileInfo().assetsDefault}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={value => this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, "assetsDefault", value)}
        />

        <div className="actions">
          <Action onClick={this.ActivateModal}>Add Asset Permissions</Action>
          <Action
            hidden={this.state.selectedAssets.length === 0}
            className="danger"
            onClick={async () =>
              await Confirm({
                message: "Are you sure you want to remove these assets?",
                onConfirm: () => {
                  this.RemoveAssetPermissions(this.state.selectedAssets);

                  this.setState({
                    selectedAssets: [],
                    startTime: undefined,
                    endTime: undefined,
                    permission: "full-access",
                    version: this.state.version + 1
                  });
                }
              })
            }
          >
            Remove Selected Assets
          </Action>
        </div>

        <AssetList
          key={`asset-list-version-${this.state.version}`}
          assets={this.ProfileInfo().assetPermissions}
          baseUrl={this.Title().baseUrl}
          withPermissions
          selectable
          onSelect={selectedAssets => this.setState({selectedAssets})}
        />
        { this.SelectedAssetForm() }
      </div>
    );
  }

  SetAssetPermissions({permission, startTime, endTime, selectedAssets}) {
    // Override any existing permissions with new ones
    const currentPermissions = this.ProfileInfo().assetPermissions
      .filter(asset => !selectedAssets.find(entry => asset.assetKey === entry.assetKey));

    // Make a copy of the assets to decouple them from the store and inject the permissions
    selectedAssets =
      currentPermissions.concat(
        selectedAssets.map(asset => ({
          ...toJS(asset),
          startTime,
          endTime,
          permission
        }))
      );

    this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, "assetPermissions", selectedAssets);

    this.CloseModal();
  }

  RemoveAssetPermissions(selectedAssets) {
    // Override any existing permissions with new ones
    const filteredAssets = this.ProfileInfo().assetPermissions
      .filter(asset => !selectedAssets.find(entry => asset.assetKey === entry.assetKey));

    this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, "assetPermissions", filteredAssets);

    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <AssetSelectionModal objectId={this.props.objectId} onSubmit={this.SetAssetPermissions} />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

AssetProfile.propTypes = {
  objectId: PropTypes.string.isRequired,
  profile: PropTypes.string.isRequired
};

export default AssetProfile;
