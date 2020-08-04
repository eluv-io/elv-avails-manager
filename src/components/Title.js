import React from "react";
import Path from "path";
import {inject, observer} from "mobx-react";
import {BackButton} from "./Misc";
import AsyncComponent from "./AsyncComponent";
import {Action, LabelledField, Tabs, Modal} from "elv-components-js";

import AppFrame from "./AppFrame";
import TitlePermission from "./permissions/TitlePermission";
import AssetList from "./AssetList";
import OfferingList from "./OfferingList";
import Groups from "./Groups";

@inject("rootStore")
@observer
class Title extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showPreview: false,
      tab: (new URLSearchParams(this.props.location.search || "")).get("tab") || "title",
      sortKey: "attachment_file_name",
      sortAsc: true
    };

    this.AddGroupPermission = this.AddGroupPermission.bind(this);
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

  Preview() {
    if(!this.Title().metadata.public.asset_metadata.sources) {
      return null;
    }

    const toggleButton = (
      <Action
        onClick={() => this.setState({showPreview: !this.state.showPreview})}
      >
        { this.state.showPreview ? "Hide Preview" : "Show Preview" }
      </Action>
    );

    return (
      <div className="title-preview">
        <div className="controls">
          { toggleButton }
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
        <LabelledField label="Synopsis" value={(assetMetadata.info || {}).synopsis || assetMetadata.synopsis} />
        { this.Preview() }
      </div>
    );
  }

  Profiles() {
    return (
      <div className="list title-profile-list">
        <div className="list-entry list-header title-profile-list-entry title-profile-list-header">
          <div>Profile</div>
          <div>Title Access</div>
          <div>Assets</div>
          <div>Offerings</div>
          <div>Start Time</div>
          <div>End Time</div>
        </div>
        {
          this.props.rootStore.profiles.map((profile, index) =>
            <TitlePermission
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

  Permissions() {
    return (
      <div className="list title-profile-list">
        {
          this.Group() ? null :
            <div className="controls">
              <Action onClick={this.ActivateModal}>Add Group Permission</Action>
            </div>
        }
        <div className="list-entry list-header title-profile-list-entry title-profile-list-header">
          <div>Access Group</div>
          <div>Title Access</div>
          <div>Assets</div>
          <div>Offerings</div>
          <div>Start Time</div>
          <div>End Time</div>
        </div>
        {
          this.Group() ?
            <TitlePermission objectId={this.Title().objectId} /> :
            Object.keys(this.props.rootStore.titlePermissions[this.Title().objectId] || {}).map((address, index) =>
              <TitlePermission key={`title-permission-${address}`} objectId={this.Title().objectId} groupAddress={address} index={index} />
            )
        }
      </div>
    );
  }

  Content() {
    let content;
    switch (this.state.tab) {
      case "permissions":
        content = this.Permissions();
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

    return (
      <div className="page-container">
        { this.state.modal }
        <header>
          <BackButton to={Path.dirname(this.props.location.pathname)} />
          <h1>{ group ? `${group.name} | ${this.Title().title} | Title Permissions` : this.Title().title }</h1>
        </header>

        <Tabs
          selected={this.state.tab}
          onChange={tab => this.setState({tab, showPreview: false})}
          options={[["Permissions", "permissions"], ["Access Profiles", "profiles"], ["Title", "title"], ["Assets", "assets"], ["Offerings", "offerings"]]}
        />

        { content }
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={async () => {
          if(this.props.match.params.groupAddress){
            this.props.rootStore.InitializeGroupTitlePermission(this.props.match.params.groupAddress, this.props.match.params.objectId);

            if(!this.Group()) {
              await this.props.rootStore.LoadGroups();
            }
          }

          if(this.Title() && this.Title().metadata.assets) { return; }

          await this.props.rootStore.LoadFullTitle({objectId: this.props.match.params.objectId});
        }}
        render={this.Content}
      />
    );
  }

  /* Group Selection */

  AddGroupPermission(groupAddress) {
    this.props.rootStore.InitializeGroupTitlePermission(groupAddress, this.Title().objectId);

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

export default Title;
