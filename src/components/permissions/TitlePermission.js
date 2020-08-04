import React from "react";
import {inject, observer} from "mobx-react";
import {DateSelection, FormatName, ImageIcon} from "elv-components-js";
import PropTypes from "prop-types";
import {withRouter} from "react-router";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";

import SettingsIcon from "../../static/icons/settings.svg";

@inject("rootStore")
@observer
@withRouter
class TitlePermission extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      version: 0
    };
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.objectId];
  }

  PermissionInfo() {
    if(this.props.profile) {
      return this.props.rootStore.titleProfiles[this.props.objectId][this.props.profile];
    }

    if(this.Group()) {
      return this.props.rootStore.titlePermissions[this.props.objectId][this.Group().address];
    }
  }

  Group() {
    const groupAddress = this.props.match.params.groupAddress || this.props.groupAddress;

    if(!groupAddress) { return; }

    return this.props.rootStore.allGroups[groupAddress];
  }

  Update(key, value) {
    if(this.props.profile) {
      this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, key, value);
    }

    if(this.Group()) {
      this.props.rootStore.SetTitlePermissionAccess(this.props.objectId, this.Group().address, key, value);
    }

    this.setState({version: this.state.version + 1});
  }

  AccessSelection(key, custom=true) {
    let options = [
      <option key="no-access" value="no-access">No Access</option>
    ];

    if(this.Group()) {
      this.props.rootStore.profiles.map(profile =>
        options.push(
          <option key={`access-${profile}`} value={profile}>{ FormatName(profile) }</option>
        )
      );
    }

    if(custom) {
      options.push(<option key="custom" value="custom">Custom</option>);
    }

    options.push(<option key="full-access" value="full-access">Full Access</option>);

    const value = this.PermissionInfo()[key];
    let settingsIcon;
    if(value === "custom") {
      let link = UrlJoin(
        this.props.location.pathname,
        "permissions",
        this.props.profile ? "profile" : "group",
        this.props.profile || this.Group().address,
        key
      );

      settingsIcon = (
        <Link to={link} title="Configure Permissions">
          <ImageIcon icon={SettingsIcon} />
        </Link>
      );
    }

    return (
      <React.Fragment>
        <select
          value={value}
          onChange={event => this.Update(key, event.target.value)}
        >
          { options }
        </select>
        { settingsIcon }
      </React.Fragment>
    );
  }

  render() {
    return (
      <React.Fragment>
        <div className={`list-entry title-profile-list-entry ${typeof this.props.index !== "undefined" ? (this.props.index % 2 === 0 ? "even" : "odd") : ""}`}>
          <div>{ this.props.profile ? FormatName(this.props.profile) : this.Group().name }</div>
          <div>{ this.AccessSelection("title", false)}</div>
          <div>{ this.AccessSelection("assets")}</div>
          <div>{ this.AccessSelection("offerings")}</div>
          <div>
            <DateSelection
              readOnly
              noLabel
              value={this.PermissionInfo().startTime}
              onChange={dateTime => this.Update("startTime", dateTime)}
            />
          </div>
          <div>
            <DateSelection
              readOnly
              noLabel
              value={this.PermissionInfo().endTime}
              onChange={dateTime => this.Update("endTime", dateTime)}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

TitlePermission.propTypes = {
  objectId: PropTypes.string.isRequired,
  profile: PropTypes.string,
  groupAddress: PropTypes.string,
  index: PropTypes.number
};

export default TitlePermission;
