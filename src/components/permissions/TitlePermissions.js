import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";

import {DeleteButton, EffectiveAvailability, InitPSF, PermissionDetailsButton} from "../Misc";
import {Action, DateSelection, ImageIcon, Modal, ToolTip} from "elv-components-js";
import {withRouter} from "react-router";

import Groups from "../Groups";
import Users from "../Users";
import NTPInstances from "../NTPInstances";
import UrlJoin from "url-join";
import LinkIcon from "../../static/icons/link.svg";
import {Link} from "react-router-dom";

@inject("rootStore")
@observer
@withRouter
class TitlePermissions extends React.Component {
  constructor(props) {
    super(props);

    this.AddPermission = this.AddPermission.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", perPage: 10, additionalState: { version: 1 }});
  }

  render() {
    const titlePermissions = this.props.rootStore.titlePermissions[this.props.objectId] || {};
    const titlePermissionAddresses = Object.keys(titlePermissions)
      .sort((addrA, addrB) => titlePermissions[addrA][this.state.sortKey] < titlePermissions[addrB][this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
      .filter(address =>
        !this.state.activeFilter ||
        ((
          this.props.rootStore.allGroups[address] ||
          this.props.rootStore.allUsers[address] ||
          this.props.rootStore.allNTPInstances[address] ||
          {}
        ).name || address)
          .toLowerCase()
          .includes(this.state.activeFilter.toLowerCase())
      );

    return (
      <React.Fragment>
        <div className="controls">
          <Action onClick={() => this.ActivateModal("user")}>Add User Permission</Action>
          <Action onClick={() => this.ActivateModal("group")}>Add Group Permission</Action>
          <Action onClick={() => this.ActivateModal("ntp")}>Add NTP Permission</Action>
          { this.Filter("Filter Permissions") }
        </div>
        { this.PageControls(titlePermissionAddresses.length) }
        <div className="list title-profile-list" key={`title-profile-list-${this.state.version}`}>
          { this.state.modal }
          <div className="list-entry list-header title-permission-list-entry title-permission-list-header">
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("profile", "Availability Profile") }
            { this.SortableHeader("startTime", "Start Time") }
            { this.SortableHeader("endTime", "End Time") }
            <div>Availability</div>
            <div />
          </div>
          {
            this.Paged(titlePermissionAddresses)
              .map((address, index) => {
                const target =
                  this.props.rootStore.allGroups[address] ||
                  this.props.rootStore.allUsers[address] ||
                  this.props.rootStore.allNTPInstances[address];

                if(!target) { return; }

                const permissions = titlePermissions[address];
                const Update = (key, value) => {
                  this.props.rootStore.SetTitlePermissionAccess(this.props.objectId, address, key, value);
                  this.setState({version: this.state.version + 1});
                };

                const profile = this.props.rootStore.titleProfiles[this.props.objectId][permissions.profile];

                if(!profile) { return null; }

                let linkPath;
                if(target.type === "fabricGroup" || target.type === "oauthGroup") {
                  linkPath = UrlJoin("/groups", target.address);
                } else if(target.type === "fabricUser" || target.type === "oauthUser") {
                  linkPath = UrlJoin("/users", target.address);
                } else {
                  linkPath = UrlJoin("/ntps", target.address);
                }

                return (
                  <div
                    className={`list-entry title-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
                    key={`title-permission-${JSON.stringify(permissions)}`}
                  >
                    <div title={target.name} className="small-font">
                      <ToolTip content={`Go to ${target.name}`}>
                        <Link to={linkPath} className="title-link">
                          <ImageIcon icon={LinkIcon} />
                        </Link>
                      </ToolTip>
                      { target.name }
                    </div>
                    <div>
                      <select
                        value={permissions.profile}
                        onChange={event => Update("profile", event.target.value)}
                      >
                        {
                          Object.keys(this.props.rootStore.titleProfiles[this.props.objectId]).map(profile =>
                            <option key={`profile-${profile}`} value={profile}>{ profile }</option>
                          )
                        }
                      </select>
                    </div>
                    <div>
                      <DateSelection readOnly noLabel value={permissions.startTime} onChange={dateTime => Update("startTime", dateTime)} />
                    </div>
                    <div>
                      <DateSelection readOnly noLabel value={permissions.endTime} onChange={dateTime => Update("endTime", dateTime)} />
                    </div>
                    <div className="small-font">
                      { EffectiveAvailability([profile.startTime, permissions.startTime], [profile.endTime, permissions.endTime])}
                    </div>
                    <div className="actions-cell">
                      <PermissionDetailsButton to={UrlJoin(this.props.location.pathname, target.address)} />
                      <DeleteButton
                        confirm="Are you sure you want to remove this permission?"
                        title={`Remove ${permissions.name}`}
                        Delete={() => {
                          this.props.rootStore.RemoveTitlePermission(this.props.objectId, address);
                          this.setState({version: this.state.version + 1});
                        }}
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>
      </React.Fragment>
    );
  }

  /* Target Selection */

  AddPermission(address, type, name) {
    this.props.rootStore.InitializeTitlePermission(address, this.props.objectId, type, name);

    this.CloseModal();
  }

  ActivateModal(type) {
    let selection;
    switch (type) {
      case "user":
        selection = <Users selectable onSelect={this.AddPermission}/>;
        break;
      case "group":
        selection = <Groups selectable onSelect={this.AddPermission}/>;
        break;
      case "ntp":
        selection = <NTPInstances selectable onSelect={this.AddPermission}/>;
    }

    this.setState({
      modal: (
        <Modal
          className="title-permission-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          { selection }
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

TitlePermissions.propTypes = {
  objectId: PropTypes.string.isRequired
};

export default TitlePermissions;
