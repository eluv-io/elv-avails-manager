import React from "react";
import AsyncComponent from "../AsyncComponent";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {Link} from "react-router-dom";
import UrlJoin from "url-join";

import {ChangeSort, SortableHeader} from "../Misc";
import {DateSelection, ImageIcon} from "elv-components-js";
import LinkIcon from "../../static/icons/link.svg";

@inject("rootStore")
@observer
class GroupPermissions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
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
        </div>
        {
          titles
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .map((title, index) => {
              const Update = (key, value) => this.props.rootStore.SetTitlePermissionAccess(title.objectId, this.props.groupAddress, key, value);

              return (
                <div className={`list-entry title-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`} key={`title-permission-${this.props.groupAddress}`}>
                  <div>
                    <Link to={UrlJoin("/titles", title.objectId)}>
                      <ImageIcon icon={LinkIcon} />
                    </Link>
                    { title.name }
                  </div>
                  <div>
                    <select
                      value={title.profile}
                      onChange={event => Update("profile", event.target.value)}
                    >
                      {
                        Object.keys(this.props.rootStore.titleProfiles[title.objectId]).map(profile =>
                          <option key={`profile-${profile}`} value={profile}>{ profile }</option>
                        )
                      }
                    </select>
                  </div>
                  <div>
                    <DateSelection
                      readOnly
                      noLabel
                      value={title.startTime}
                      onChange={dateTime => Update("startTime", dateTime)}
                    />
                  </div>
                  <div>
                    <DateSelection
                      readOnly
                      noLabel
                      value={title.endTime}
                      onChange={dateTime => Update("endTime", dateTime)}
                    />
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
        Load={this.props.rootStore.LoadGroups}
        render={this.Content}
      />
    );
  }
}

GroupPermissions.propTypes = {
  groupAddress: PropTypes.string.isRequired
};

export default GroupPermissions;
