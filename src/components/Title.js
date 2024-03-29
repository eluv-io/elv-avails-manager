import React from "react";
import Path from "path";
import {inject, observer} from "mobx-react";
import {BackButton} from "./Misc";
import AsyncComponent from "./AsyncComponent";
import {Action, Form, IconButton, LabelledField, Modal, Tabs} from "elv-components-js";

import AppFrame from "./AppFrame";
import TitleProfile from "./permissions/TitleProfile";
import AssetList from "./AssetList";
import OfferingList from "./OfferingList";
import TitlePermissions from "./permissions/TitlePermissions";

import CheckIcon from "../static/icons/check-circle.svg";
import MinusCircleIcon from "../static/icons/minus-circle.svg";


@inject("rootStore")
@observer
class Title extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showPreview: false,
      tab: (new URLSearchParams(this.props.location.search || "")).get("tab") || "profiles",
      sortKey: "attachment_file_name",
      sortAsc: true,
      profileName: ""
    };

    this.AddTitleProfile = this.AddTitleProfile.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.Content = this.Content.bind(this);
  }

  Group() {
    if(!this.props.match.params.groupAddress) { return; }

    return this.props.rootStore.allGroups[this.props.match.params.groupAddress];
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  Actions() {
    const title = this.Title();

    let previewButton;
    if(title.metadata.public.asset_metadata.sources) {
      previewButton = (
        <Action
          onClick={() => this.setState({showPreview: !this.state.showPreview})}
        >
          {this.state.showPreview ? "Hide Preview" : "Show Preview"}
        </Action>
      );
    }

    return (
      <div className="title-preview">
        <div className="controls">
          { previewButton }
          <Action
            className="secondary"
            onClick={() => this.props.rootStore.OpenObjectLink({libraryId: title.libraryId, objectId: title.objectId, versionHash: title.versionHash})}
          >
            Open in Fabric Browser
          </Action>
        </div>

        {
          this.state.showPreview ?
            <AppFrame
              appUrl={EluvioConfiguration.apps["stream-sample"] || EluvioConfiguration.apps["Stream Sample"]}
              queryParams={{objectId: this.Title().objectId, action: "display"}}
              className="site-preview-frame"
            /> : null
        }
      </div>
    );
  }

  TitleView() {
    const title = this.Title();
    const assetMetadata = title.metadata.public.asset_metadata || {info: {}};

    return (
      <div className="title-view">
        <LabelledField label="Library ID" value={title.libraryId} />
        <LabelledField label="Object ID" value={title.objectId} />
        <LabelledField label="Permissions" value={title.permission} />
        <LabelledField label="IP Title ID" value={assetMetadata.ip_title_id} />
        <LabelledField label="Title" value={assetMetadata.title} />
        <LabelledField label="Display Title" value={assetMetadata.display_title} />
        <LabelledField label="Status" value={title.status} />
        <LabelledField label="Synopsis" value={(assetMetadata.info || {}).synopsis || assetMetadata.synopsis} />
        { this.Actions() }
      </div>
    );
  }

  Profiles() {
    return (
      <div className="list title-profile-list">
        <div className="controls">
          <Action onClick={this.ActivateModal}>Add Availability Profile</Action>
        </div>
        <div className="list-entry list-header title-profile-list-entry title-profile-list-header">
          <div>Profile</div>
          <div>Assets</div>
          <div>Offerings</div>
          <div>Start Time</div>
          <div>End Time</div>
          <div />
        </div>
        {
          Object.keys(this.props.rootStore.titleProfiles[this.Title().objectId]).map((profile, index) =>
            <TitleProfile
              // This component doesn't want to update with the mobx state, so force it
              key={`title-profile-${this.Title().objectId}-${profile}`}
              objectId={this.Title().objectId}
              profile={profile}
              index={index}
            />
          )
        }
      </div>
    );
  }

  Content() {
    let content;
    switch (this.state.tab) {
      case "permissions":
        content = <TitlePermissions objectId={this.Title().objectId} />;
        break;
      case "profiles":
        content = this.Profiles();
        break;
      case "title":
        content = this.TitleView();
        break;
      case "assets":
        content = <AssetList assets={this.Title().assets} baseUrl={this.Title().baseUrl} />;
        break;
      case "offerings":
        content = <OfferingList offerings={this.Title().offerings} />;
        break;
      default:
        content = null;
    }

    const group = this.Group();

    const active = this.props.rootStore.titleOptions[this.Title().objectId].active;

    return (
      <div className="page-container">
        { this.state.modal ? this.TitleProfileModal() : null }
        <div className="page-header">
          <BackButton to={Path.dirname(this.props.location.pathname)} />
          <h1>{ group ? `${group.name} | ${this.Title().title} | Title Permissions` : this.Title().displayTitleWithStatus }</h1>
          <div className="title-active-info">
            { active ? "Permissions Active" : "Permissions Inactive"}
            <IconButton
              icon={active ? CheckIcon : MinusCircleIcon}
              onClick={() => this.props.rootStore.UpdateTitleOption(this.Title().objectId, "active", !active)}
              className={`title-active-button ${active ? "active" : "inactive"}`}
              title={active ? "Permissions Active" : "Permissions Inactive" }
            />
          </div>
        </div>

        <Tabs
          selected={this.state.tab}
          onChange={tab => this.setState({tab, showPreview: false})}
          options={[["Availability Profiles", "profiles"], ["Title Permissions", "permissions"], ["Title", "title"], ["Assets", "assets"], ["Offerings", "offerings"]]}
        />

        { content }
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

  /* New Profile Name*/

  AddTitleProfile() {
    this.props.rootStore.AddTitleProfile(this.Title().objectId, this.state.profileName);

    this.CloseModal();
  }

  TitleProfileModal() {
    return (
      <Modal
        className="profile-creation-modal"
        closable={true}
        OnClickOutside={this.CloseModal}
      >
        <Form OnSubmit={this.AddTitleProfile} legend="Add New Availability Profile">
          <div className="form-content">
            <label htmlFor="profileName">Name</label>
            <input name="profileName" value={this.state.profileName} onChange={event => this.setState({profileName: event.target.value})} />
          </div>
        </Form>
      </Modal>
    );
  }

  ActivateModal() {
    this.setState({modal: true});
  }

  CloseModal() {
    this.setState({modal: false, profileName: ""});
  }
}

export default Title;
