import React from "react";
import AsyncComponent from "../AsyncComponent";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {withRouter} from "react-router";
import {Link} from "react-router-dom";
import UrlJoin from "url-join";

import {ChangeSort, EffectiveAvailability, SortableHeader} from "../Misc";
import {DateSelection, ImageIcon} from "elv-components-js";
import LinkIcon from "../../static/icons/link.svg";

@inject("rootStore")
@observer
@withRouter
class GroupPermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sortKey: "name",
      sortAsc: true,
    };

    this.Content = this.Content.bind(this);
    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  Content() {
    const titles = this.props.rootStore.groupTitlePermissions(this.props.groupAddress);

    return (
      <div className="list title-profile-list">
        <div className="list-entry list-header title-permission-list-entry title-permission-list-header">
          { this.SortableHeader("name", "Title") }
          { this.SortableHeader("profile", "Availability Profile") }
          { this.SortableHeader("startTime", "Start Time") }
          { this.SortableHeader("endTime", "End Time") }
          <div>Availability</div>
        </div>
        {
          titles
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .filter(title => !this.props.filter || title.name.toLowerCase().includes(this.props.filter))
            .map((titlePermission, index) => {
              const Update = (key, value) => this.props.rootStore.SetTitlePermissionAccess(titlePermission.objectId, this.props.groupAddress, key, value);
              const profile = this.props.rootStore.titleProfiles[titlePermission.objectId][titlePermission.profile];

              return (
                <div className={`list-entry title-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`} key={`title-permission-${this.props.groupAddress}`}>
                  <div className="small-font">
                    <Link to={UrlJoin("/titles", titlePermission.objectId)}>
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
                    <DateSelection
                      dateOnly
                      readOnly
                      noLabel
                      value={titlePermission.startTime}
                      onChange={dateTime => Update("startTime", dateTime)}
                    />
                  </div>
                  <div>
                    <DateSelection
                      dateOnly
                      readOnly
                      noLabel
                      value={titlePermission.endTime}
                      onChange={dateTime => Update("endTime", dateTime)}
                    />
                  </div>
                  <div className="small-font">
                    { EffectiveAvailability([profile.startTime, titlePermission.startTime], [profile.endTime, titlePermission.endTime])}
                  </div>
                </div>
              );
            })
        }
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={async () => this.props.rootStore.LoadGroup(this.props.groupAddress, this.props.match.params.groupType)}
        render={this.Content}
      />
    );
  }
}

GroupPermissions.propTypes = {
  groupAddress: PropTypes.string.isRequired,
  filter: PropTypes.string
};

export default GroupPermissions;
