import React from "react";
import {inject, observer} from "mobx-react";
import {DateSelection, ImageIcon, ToolTip} from "elv-components-js";
import PropTypes from "prop-types";
import {withRouter} from "react-router";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import {DeleteButton} from "../Misc";

import SettingsIcon from "../../static/icons/settings.svg";
import CheckIcon from "../../static/icons/check-circle.svg";
import MinusCircleIcon from "../../static/icons/minus-circle.svg";

@inject("rootStore")
@observer
@withRouter
class TitleProfile extends React.Component {
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
    return this.props.rootStore.titleProfiles[this.props.objectId][this.props.profile];
  }

  Update(key, value) {
    this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, key, value);

    this.setState({version: this.state.version + 1});
  }

  AccessSelection(key, custom=true) {
    let options = [
      <option key="no-access" value="no-access">No Access</option>
    ];

    if(custom) {
      options.push(<option key="custom" value="custom">Custom</option>);
    }

    options.push(<option key="full-access" value="full-access">Full Access</option>);

    const value = this.PermissionInfo()[key];
    let settingsIcon, defaultPermissionIcon;
    if(value === "custom") {
      let link = UrlJoin(
        this.props.location.pathname,
        "permissions",
        "profiles",
        this.props.profile,
        key
      );

      const type = key.charAt(0).toUpperCase() + key.substr(1).toLowerCase();
      settingsIcon = (
        <ToolTip content={`Configure Permissions For ${type}`}>
          <Link to={link}>
            <ImageIcon className="profile-settings-icon" icon={SettingsIcon} />
          </Link>
        </ToolTip>
      );

      const defaultPermission = this.PermissionInfo()[`${key}Default`];

      defaultPermissionIcon = (
        <ToolTip content={`Default Profile Permission For ${type}: ${defaultPermission === "full-access" ? "Full Access" : "No Access"}`}>
          <ImageIcon
            className={`default-permission-indicator ${defaultPermission === "full-access" ? "full-access" : ""}`}
            icon={defaultPermission === "full-access" ? CheckIcon : MinusCircleIcon}
          />
        </ToolTip>
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
        { defaultPermissionIcon }
        { settingsIcon }
      </React.Fragment>
    );
  }

  render() {
    const removable = !Object.keys(this.props.rootStore.titlePermissions[this.props.objectId])
      .find(address => this.props.rootStore.titlePermissions[this.props.objectId][address].profile === this.props.profile);

    return (
      <React.Fragment>
        <div className={`list-entry title-profile-list-entry ${typeof this.props.index !== "undefined" ? (this.props.index % 2 === 0 ? "even" : "odd") : ""}`}>
          <div>{ this.props.profile }</div>
          <div>{ this.AccessSelection("assets")}</div>
          <div>{ this.AccessSelection("offerings")}</div>
          <div>
            <DateSelection readOnly noLabel value={this.PermissionInfo().startTime} onChange={dateTime => this.Update("startTime", dateTime)} />
          </div>
          <div>
            <DateSelection readOnly noLabel value={this.PermissionInfo().endTime} onChange={dateTime => this.Update("endTime", dateTime)} />
          </div>
          <div className="actions-cell">
            <DeleteButton
              disabled={!removable}
              confirm="Are you sure you want to remove this profile?"
              title={removable ? `Remove ${this.props.profile}` : "Unable to delete profiles with active permissions"}
              Delete={() => this.props.rootStore.RemoveTitleProfile(this.props.objectId, this.props.profile)}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

TitleProfile.propTypes = {
  objectId: PropTypes.string.isRequired,
  profile: PropTypes.string.isRequired,
  index: PropTypes.number
};

export default TitleProfile;
