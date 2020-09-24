import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {withRouter} from "react-router";
import {Link} from "react-router-dom";
import UrlJoin from "url-join";

import {ChangeSort, DeleteButton, EffectiveAvailability, SortableHeader} from "../Misc";
import {DateSelection, ImageIcon} from "elv-components-js";
import LinkIcon from "../../static/icons/link.svg";

@inject("rootStore")
@observer
@withRouter
class TargetPermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sortKey: "name",
      sortAsc: true,
    };

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  render() {
    return (
      <div className="list title-profile-list">
        <div className="list-entry list-header target-permission-list-entry title-permission-list-header">
          { this.SortableHeader("name", "Title") }
          { this.SortableHeader("profile", "Availability Profile") }
          { this.SortableHeader("startTime", "Start Time") }
          { this.SortableHeader("endTime", "End Time") }
          <div>Availability</div>
          <div />
        </div>
        {
          this.props.permissions
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .filter(title => !this.props.filter || title.name.toLowerCase().includes(this.props.filter))
            .map((titlePermission, index) => {
              const Update = (key, value) => this.props.rootStore.SetTitlePermissionAccess(titlePermission.objectId, this.props.target.address, key, value);
              const profile = this.props.rootStore.titleProfiles[titlePermission.objectId][titlePermission.profile];

              return (
                <div className={`list-entry target-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`} key={`title-permission-${this.props.target.address}`}>
                  <div className="small-font" title={titlePermission.name}>
                    <Link to={UrlJoin("/titles", titlePermission.objectId)} className="title-link">
                      <ImageIcon icon={LinkIcon} />
                    </Link>
                    { titlePermission.name }
                  </div>
                  <div>
                    <select
                      value={titlePermission.profile}
                      onChange={event => Update("profile", event.target.value)}
                    >
                      {
                        Object.keys(this.props.rootStore.titleProfiles[titlePermission.objectId]).map(profile =>
                          <option key={`profile-${profile}`} value={profile}>{ profile }</option>
                        )
                      }
                    </select>
                  </div>
                  <div>
                    <DateSelection readOnly noLabel value={titlePermission.startTime} onChange={dateTime => Update("startTime", dateTime)} />
                  </div>
                  <div>
                    <DateSelection readOnly noLabel value={titlePermission.endTime} onChange={dateTime => Update("endTime", dateTime)} />
                  </div>
                  <div className="small-font">
                    { EffectiveAvailability([profile.startTime, titlePermission.startTime], [profile.endTime, titlePermission.endTime])}
                  </div>
                  <div className="actions-cell">
                    <DeleteButton
                      confirm="Are you sure you want to remove this title?"
                      title={`Remove ${titlePermission.name}`}
                      Delete={() => this.props.rootStore.RemoveTitlePermission(titlePermission.objectId, this.props.target.address)}
                    />
                  </div>
                </div>
              );
            })
        }
      </div>
    );
  }
}

TargetPermissions.propTypes = {
  permissions: PropTypes.array.isRequired,
  target: PropTypes.object.isRequired,
  filter: PropTypes.string
};

export default TargetPermissions;
