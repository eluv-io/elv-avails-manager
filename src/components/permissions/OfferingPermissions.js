import React from "react";
import {inject, observer} from "mobx-react";
import {Action, Confirm, DateSelection, Modal, Selection} from "elv-components-js";
import PropTypes from "prop-types";
import {toJS} from "mobx";
import {withRouter} from "react-router";
import OfferingList from "../OfferingList";
import AsyncComponent from "../AsyncComponent";
import {BackButton} from "../Misc";
import Path from "path";

@inject("rootStore")
@observer
class OfferingSelectionModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      selectedOfferings: [],
      geoRestriction: "unrestricted",
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
      <div className="offering-selection-modal">
        <h3>Offering Permissions</h3>
        <Selection
          label="Offering Permission"
          value={this.state.permission}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={permission => this.setState({permission})}
        />
        <DateSelection dateOnly readOnly label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection dateOnly readOnly label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <Selection
          label="Geo Restriction"
          value={this.state.geoRestriction}
          options={[["Unrestricted", "unrestricted"], ["United States", "us"]]}
          onChange={geoRestriction => this.setState({geoRestriction})}
        />
        <OfferingList
          offerings={this.Title().offerings}
          selectable
          onSelect={selectedOfferings => this.setState({selectedOfferings})}
          actions={
            <Action
              className={this.state.selectedOfferings.length === 0 ? "secondary" : ""}
              disabled={this.state.selectedOfferings.length === 0}
              onClick={() =>
                this.props.onSubmit({
                  permission: this.state.permission,
                  startTime: this.state.startTime,
                  endTime: this.state.endTime,
                  geoRestriction: this.state.geoRestriction,
                  selectedOfferings: this.state.selectedOfferings
                })
              }
            >
              Add Offering Permissions
            </Action>
          }
        />
      </div>
    );
  }
}

OfferingSelectionModal.propTypes = {
  objectId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired
};

@inject("rootStore")
@observer
@withRouter
class OfferingPermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: null,
      selectedOfferings: [],
      startTime: undefined,
      endTime: undefined,
      permission: "full-access",
      version: 0
    };

    this.Content = this.Content.bind(this);
    this.SetOfferingPermissions = this.SetOfferingPermissions.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  PermissionInfo() {
    return this.props.rootStore.titleProfiles[this.props.match.params.objectId][this.props.match.params.profile] || [];
  }

  Update(key, value) {
    this.props.rootStore.SetTitleProfileAccess(this.props.match.params.objectId, this.props.match.params.profile, key, value);

    this.setState({version: this.state.version + 1});
  }

  SelectedOfferingForm() {
    if(this.state.selectedOfferings.length === 0) { return null; }

    return (
      <div className="selected-form offering-profile-selected-offering-form">
        <h3>Modify Selected Offering Permissions</h3>
        <Selection
          label="Offering Permission"
          value={this.state.permission}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={permission => this.setState({permission})}
        />
        <DateSelection dateOnly readOnly label="Start Time" value={this.state.startTime} name="startTime" onChange={startTime => this.setState({startTime})} />
        <DateSelection dateOnly readOnly label="End Time" value={this.state.endTime} name="endTime" onChange={endTime => this.setState({endTime})} />
        <Selection
          label="Geo Restriction"
          value={this.state.geoRestriction}
          options={[["Unrestricted", "unrestricted"], ["United States", "us"]]}
          onChange={geoRestriction => this.setState({geoRestriction})}
        />
        <div className="controls">
          <Action
            onClick={async () =>
              await Confirm({
                message: "Are you sure you want to update these offering permissions?",
                onConfirm: () => {
                  this.SetOfferingPermissions({
                    permission: this.state.permission,
                    startTime: this.state.startTime,
                    endTime: this.state.endTime,
                    geoRestriction: this.state.geoRestriction,
                    selectedOfferings: this.state.selectedOfferings
                  });

                  this.setState({
                    selectedOfferings: [],
                    startTime: undefined,
                    endTime: undefined,
                    permission: "full-access",
                    geoRestriction: "unrestricted",
                    version: this.state.version + 1
                  });
                }
              })
            }
          >
            Update Selected Offerings
          </Action>
          <Action
            hidden={this.state.selectedOfferings.length === 0}
            className="danger"
            onClick={async () =>
              await Confirm({
                message: "Are you sure you want to remove these offering permissions?",
                onConfirm: () => {
                  this.RemoveOfferingPermissions(this.state.selectedOfferings);

                  this.setState({
                    selectedOfferings: [],
                    startTime: undefined,
                    endTime: undefined,
                    permission: "full-access",
                    version: this.state.version + 1
                  });
                }
              })
            }
          >
            Remove Selected Offerings
          </Action>
        </div>
      </div>
    );
  }

  Content() {
    let backPath = Path.dirname(Path.dirname(Path.dirname(Path.dirname(this.props.location.pathname)))).split("?")[0] + "?tab=profiles";

    return (
      <div className="permission-profile offering-profile">
        { this.state.modal }

        <div className="page-header">
          <BackButton to={backPath} />
          <h1>{ this.Title().title } | Offering Permissions | { this.props.match.params.profile }</h1>
        </div>

        <Selection
          className="offering-default-permission"
          label="Default Offering Permission"
          value={this.PermissionInfo().offeringsDefault}
          options={[["No Access", "no-access"], ["Full Access", "full-access"]]}
          onChange={value => this.Update("offeringsDefault", value)}
        />

        { this.SelectedOfferingForm() }

        <OfferingList
          key={`offering-list-version-${this.state.version}`}
          offerings={this.PermissionInfo().offeringPermissions}
          withPermissions
          selectable
          onSelect={selectedOfferings => this.setState({selectedOfferings})}
          actions={
            <Action onClick={this.ActivateModal}>Add Offering Permissions</Action>
          }
        />
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

  SetOfferingPermissions({permission, geoRestriction, startTime, endTime, selectedOfferings}) {
    // Override any existing permissions with new ones
    const currentPermissions = this.PermissionInfo().offeringPermissions
      .filter(offering => !selectedOfferings.find(entry => offering.offeringKey === entry.offeringKey));

    // Make a copy of the offerings to decouple them from the store and inject the permissions
    selectedOfferings =
      currentPermissions.concat(
        selectedOfferings.map(offering => ({
          ...toJS(offering),
          startTime,
          endTime,
          permission,
          geoRestriction
        }))
      );

    this.Update("offeringPermissions", selectedOfferings);

    this.setState({version: this.state.version + 1});

    this.CloseModal();
  }

  RemoveOfferingPermissions(selectedOfferings) {
    // Override any existing permissions with new ones
    const filteredOfferings = this.PermissionInfo().offeringPermissions
      .filter(offering => !selectedOfferings.find(entry => offering.offeringKey === entry.offeringKey));

    this.Update("offeringPermissions", filteredOfferings);

    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="offering-form-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <OfferingSelectionModal objectId={this.props.match.params.objectId} onSubmit={this.SetOfferingPermissions} />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

export default OfferingPermissions;
