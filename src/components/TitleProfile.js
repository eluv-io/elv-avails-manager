import React from "react";
import {inject, observer} from "mobx-react";
import {DateSelection} from "elv-components-js";
import PropTypes from "prop-types";

import AssetProfile from "./AssetProfile";

@inject("rootStore")
@observer
class TitleProfile extends React.Component {
  Title() {
    return this.props.rootStore.allTitles[this.props.objectId];
  }

  ProfileInfo() {
    return this.props.rootStore.titleProfiles[this.props.objectId][this.props.profile];
  }

  AccessSelection(key, custom=true) {
    return (
      <select
        value={this.ProfileInfo()[key]}
        onChange={event => this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, key, event.target.value)}
      >
        <option value="no-access">No Access</option>
        { custom ? <option value="custom">Custom</option> : null }
        <option value="full-access">Full Access</option>
      </select>
    );
  }

  render() {
    return (
      <div className="title-profile">
        <div className="list title-profile-list">
          <div className="list-entry list-header title-profile-list-entry title-profile-list-header">
            <div />
            <div>Title Access</div>
            <div>Assets</div>
            <div>Offerings</div>
            <div>Start Time</div>
            <div>End Time</div>
          </div>
          <div className="list-entry title-profile-list-entry">
            <div>{ this.props.profile }</div>
            <div>{ this.AccessSelection("title", false)}</div>
            <div>{ this.AccessSelection("assets")}</div>
            <div>{ this.AccessSelection("offerings")}</div>
            <div>
              <DateSelection
                noLabel
                value={this.ProfileInfo().startTime}
                onChange={datetime => this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, "startTime", datetime)}
              />
            </div>
            <div>
              <DateSelection
                noLabel
                value={this.ProfileInfo().endTime}
                onChange={datetime => this.props.rootStore.SetTitleProfileAccess(this.props.objectId, this.props.profile, "endTime", datetime)}
              />
            </div>
          </div>
        </div>
        { this.ProfileInfo().assets === "custom" ?  <AssetProfile objectId={this.props.objectId} profile={this.props.profile} /> : null }
      </div>
    );
  }
}

TitleProfile.propTypes = {
  objectId: PropTypes.string.isRequired,
  profile: PropTypes.string.isRequired
};

export default TitleProfile;
