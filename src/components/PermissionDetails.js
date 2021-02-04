import React from "react";
import {BackButton, EffectiveAvailability, JoinNTPSubject, SplitNTPSubject} from "./Misc";
import Path from "path";
import {inject, observer} from "mobx-react";
import {FormatName, ImageIcon, LabelledField, ToolTip} from "elv-components-js";
import HelpIcon from "../static/icons/help-circle.svg";
import AssetList from "./AssetList";
import OfferingList from "./OfferingList";
import AsyncComponent from "./AsyncComponent";

@inject("rootStore")
@observer
class PermissionDetails extends React.Component {
  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  TargetId() {
    if(this.props.match.params.subjectId) {
      // NTP Subject
      return JoinNTPSubject(this.props.match.params.ntpId, this.props.match.params.subjectId);
    }

    return (
      this.props.match.params.userAddress ||
      this.props.match.params.groupAddress ||
      this.props.match.params.ntpId ||
      this.props.match.params.targetId
    );
  }

  Target() {
    const {ntpId, subjectId} = SplitNTPSubject(this.TargetId());

    if((ntpId && subjectId) || this.props.match.params.subjectId) {
      return (this.props.rootStore.allNTPSubjects[ntpId || this.props.match.params.ntpId] || {})[this.TargetId()];
    }

    const targetId = this.TargetId();
    return (
      this.props.rootStore.allUsers[targetId] ||
      this.props.rootStore.allGroups[targetId] ||
      this.props.rootStore.allNTPInstances[targetId]
    );
  }

  Permission() {
    return this.props.rootStore.titlePermissions[this.props.match.params.objectId][this.TargetId()];
  }

  Profile() {
    return this.props.rootStore.titleProfiles[this.props.match.params.objectId][this.Permission().profile];
  }

  List(type) {
    const label = type === "assets" ? "Assets" : "Offerings";

    if(this.Profile()[type] !== "custom") {
      return (
        <div className="permission-details-list">
          <h3>{label}</h3>
          <LabelledField label="Permission">
            {FormatName(this.Profile()[type])}
          </LabelledField>
        </div>
      );
    }

    const FormatTime = (item, key) => [item[key], this.Profile()[key], this.Permission()[key]].filter(time => time);

    const list = (type === "assets" ? this.Profile().assetPermissions : this.Profile().offeringPermissions)
      .map(item => ({
        ...item,
        startTime: Math.max(...FormatTime(item, "startTime")),
        endTime: Math.min(...FormatTime(item, "endTime")),
      }));

    return (
      <div className="permission-details-list">
        <h3>{label}</h3>
        <LabelledField label="Permission">
          Custom
        </LabelledField>
        <LabelledField label={`Default ${label} Permission`}>
          {FormatName(this.Profile()[`${type}Default`])}
        </LabelledField>
        {
          type === "assets" ?
            <AssetList
              assets={list}
              baseUrl={this.Title().baseUrl}
              withPermissions
              profile={this.Profile()}
              noControls
              effective
            /> :
            <OfferingList
              offerings={list}
              baseUrl={this.Title().baseUrl}
              withPermissions
              profile={this.Profile()}
              noControls
              effective
            />
        }
      </div>
    );
  }

  Content() {
    const availabilityInfoTooltip = (
      <ToolTip content="Effective availability is the most restrictive combination of profile and permission availability"  >
        <ImageIcon className="help-icon" icon={HelpIcon} />
      </ToolTip>
    );

    return (
      <div className="page-container permission-details">
        <div className="page-header">
          <BackButton to={Path.dirname(this.props.location.pathname) + "?tab=permissions"} />
          <h1>{`${this.Target().name} | ${this.Title().displayTitleWithStatus} | Permission Details`}</h1>
        </div>
        <div className="permission-details">
          <LabelledField label="Subject">
            { this.Target().name } ({ this.props.rootStore.FormatType(this.Target().type) })
          </LabelledField>
          <LabelledField label="Title">
            { this.Title().displayTitleWithStatus }
          </LabelledField>
          <LabelledField label="Profile">
            { this.Permission().profile }
          </LabelledField>
          <LabelledField label={<span>Effective Availability { availabilityInfoTooltip }</span>}>
            { EffectiveAvailability([this.Profile().startTime, this.Permission().startTime], [this.Profile().endTime, this.Permission().endTime])}
          </LabelledField>
          <LabelledField label="Availability (Profile)">
            { EffectiveAvailability([this.Profile().startTime], [this.Profile().endTime])}
          </LabelledField>
          <LabelledField label="Availability (Permission)">
            { EffectiveAvailability([this.Permission().startTime], [this.Permission().endTime])}
          </LabelledField>
        </div>

        { this.List("assets") }
        { this.List("offerings") }
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
        render={() => this.Content()}
      />
    );
  }
}

export default PermissionDetails;
