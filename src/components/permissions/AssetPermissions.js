import React from "react";
import {inject, observer} from "mobx-react";
import {Action, Confirm, DateSelection, Modal, Selection} from "elv-components-js";
import PropTypes from "prop-types";
import AssetList from "../AssetList";
import {toJS} from "mobx";
import {withRouter} from "react-router";
import AsyncComponent from "../AsyncComponent";
import Path from "path";
import {BackButton} from "../Misc";

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
        <DateSelection readOnly label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection readOnly label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <div className="controls no-margin">

        </div>
        <AssetList
          assets={this.Title().assets}
          baseUrl={this.Title().baseUrl}
          selectable
          onSelect={selectedAssets => this.setState({selectedAssets})}
          actions={
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
          }
        />
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
class AssetPermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: null,
      selectedAssets: [],
      startTime: undefined,
      endTime: undefined,
      permission: "full-access",
      version: 0
    };

    this.Content = this.Content.bind(this);
    this.SetAssetPermissions = this.SetAssetPermissions.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  PermissionInfo() {
    return this.props.rootStore.titleProfiles[this.props.match.params.objectId][this.props.match.params.profile];
  }

  Update(key, value) {
    this.props.rootStore.SetTitleProfileAccess(this.props.match.params.objectId, this.props.match.params.profile, key, value);

    this.setState({version: this.state.version + 1});
  }

  SelectedAssetForm() {
    if(this.state.selectedAssets.length === 0) { return null; }

    return (
      <div className="selected-form asset-profile-selected-asset-form">
        <h3>Modify Selected Asset Permissions</h3>
        <Selection
          label="Asset Permission"
          value={this.state.permission}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={permission => this.setState({permission})}
        />
        <DateSelection readOnly label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection readOnly label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <div className="controls">
          <Action
            onClick={async () =>
              await Confirm({
                message: "Are you sure you want to update these asset permissions?",
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
          <Action
            hidden={this.state.selectedAssets.length === 0}
            className="danger"
            onClick={async () =>
              await Confirm({
                message: "Are you sure you want to remove these asset permissions?",
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
      </div>
    );
  }

  Content() {
    let backPath = Path.dirname(Path.dirname(Path.dirname(Path.dirname(this.props.location.pathname)))).split("?")[0] + "?tab=profiles";

    return (
      <div className="page-container">
        <div className="permission-profile asset-profile">
          { this.state.modal }

          <div className="page-header">
            <BackButton to={backPath} />
            <h1>{ this.Title().display_title } | Asset Permissions | { this.props.match.params.profile }</h1>
          </div>

          <Selection
            className="asset-default-permission"
            label="Default Asset Permission"
            value={this.PermissionInfo().assetsDefault}
            options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
            onChange={value => this.Update("assetsDefault", value)}
          />

          { this.SelectedAssetForm() }

          <AssetList
            key={`asset-list-version-${this.state.version}`}
            assets={this.PermissionInfo().assetPermissions}
            baseUrl={this.Title().baseUrl}
            withPermissions
            selectable
            onSelect={selectedAssets => this.setState({selectedAssets})}
            actions={
              <Action onClick={this.ActivateModal}>Add Asset Permissions</Action>
            }
          />
        </div>
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={async () => {
          if(this.Title() && this.Title().metadata.assets) { return; }

          await this.props.rootStore.LoadFullTitle({objectId: this.props.match.params.objectId});
        }}
        render={this.Content}
      />
    );
  }



  SetAssetPermissions({permission, startTime, endTime, selectedAssets}) {
    // Override any existing permissions with new ones
    const currentPermissions = this.PermissionInfo().assetPermissions
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

    this.Update("assetPermissions", selectedAssets);

    this.CloseModal();
  }

  RemoveAssetPermissions(selectedAssets) {
    // Override any existing permissions with new ones
    const filteredAssets = this.PermissionInfo().assetPermissions
      .filter(asset => !selectedAssets.find(entry => asset.assetKey === entry.assetKey));

    this.Update("assetPermissions", filteredAssets);

    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <AssetSelectionModal objectId={this.props.match.params.objectId} onSubmit={this.SetAssetPermissions} />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

AssetPermissions.propTypes = {
  objectId: PropTypes.string.isRequired
};

export default AssetPermissions;
