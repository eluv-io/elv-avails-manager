import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";

import {ChangeSort, EffectiveAvailability, SortableHeader} from "../Misc";
import {Action, DateSelection, Modal} from "elv-components-js";
import {toJS} from "mobx";
import Groups from "../Groups";

@inject("rootStore")
@observer
class TitlePermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      sortKey: "name",
      sortAsc: true,
    };

    this.AddGroupPermission = this.AddGroupPermission.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  render() {
    const permissions = toJS({
      ...this.props.rootStore.titlePermissions[this.props.objectId],
    });

    Object.keys(permissions).forEach(addr => permissions[addr] = { ...permissions[addr], ...(this.props.rootStore.allGroups[addr] || {})});

    return (
      <div className="list title-profile-list">
        { this.state.modal }
        <div className="controls">
          <Action onClick={this.ActivateModal}>Add Group Permission</Action>
        </div>
        <div className="list-entry list-header title-permission-list-entry title-permission-list-header">
          { this.SortableHeader("name", "Group") }
          { this.SortableHeader("profile", "Availability Profile") }
          { this.SortableHeader("startTime", "Start Time") }
          { this.SortableHeader("endTime", "End Time") }
          <div>Availability</div>
        </div>
        {
          Object.keys(this.props.rootStore.titlePermissions[this.props.objectId] || {})
            .sort((addrA, addrB) => permissions[addrA][this.state.sortKey] < permissions[addrB][this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .filter(address => !this.state.filter || this.props.rootStore.allGroups[address].name.toLowerCase().includes(this.state.filter))
            .map((address, index) => {
              const group = this.props.rootStore.allGroups[address];
              const groupPermissions = this.props.rootStore.titlePermissions[this.props.objectId][address];
              const Update = (key, value) => this.props.rootStore.SetTitlePermissionAccess(this.props.objectId, address, key, value);
              const profile = this.props.rootStore.titleProfiles[this.props.objectId][groupPermissions.profile];

              return (
                <div className={`list-entry title-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`} key={`title-permission-${address}`}>
                  <div>
                    { group.name }
                  </div>
                  <div>
                    <select
                      value={groupPermissions.profile}
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
                    <DateSelection
                      dateOnly
                      readOnly
                      noLabel
                      value={groupPermissions.startTime}
                      onChange={dateTime => Update("startTime", dateTime)}
                    />
                  </div>
                  <div>
                    <DateSelection
                      dateOnly
                      readOnly
                      noLabel
                      value={groupPermissions.endTime}
                      onChange={dateTime => Update("endTime", dateTime)}
                    />
                  </div>
                  <div className="small-font">
                    { EffectiveAvailability([profile.startTime, groupPermissions.startTime], [profile.endTime, groupPermissions.endTime])}
                  </div>
                </div>
              );
            })
        }
      </div>
    );
  }

  /* Group Selection */

  AddGroupPermission(groupAddress) {
    this.props.rootStore.InitializeGroupTitlePermission(groupAddress, this.props.objectId);

    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="title-permission-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <Groups selectable onSelect={this.AddGroupPermission} />
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
