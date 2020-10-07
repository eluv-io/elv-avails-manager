import React from "react";
import {Action, DateSelection, ImageIcon, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import {
  BackButton,
  DeleteButton, EffectiveAvailability,
  InitPSF
} from "./Misc";
import Path from "path";
import AsyncComponent from "./AsyncComponent";
import LinkIcon from "../static/icons/link.svg";

@inject("rootStore")
@observer
class Titles extends React.Component {
  constructor(props) {
    super(props);

    this.Content = this.Content.bind(this);
    this.AddTitles = this.AddTitles.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "displayTitle", perPage: this.Target() ? 10 : 100});
  }

  User() {
    if(!this.props.match.params.userAddress) { return; }

    return this.props.rootStore.allUsers[this.props.match.params.userAddress];
  }

  Group() {
    if(!this.props.match.params.groupAddress) { return; }

    return this.props.rootStore.allGroups[this.props.match.params.groupAddress];
  }

  Target() {
    return this.Group() || this.User();
  }

  TargetPermissions() {
    const permissions = this.props.rootStore.targetTitlePermissions(this.Target().address)
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
      .filter(title => !this.state.activeFilter || title.displayTitle.toLowerCase().includes(this.state.activeFilter));

    return (
      <React.Fragment>
        { this.PageControls(permissions.length) }
        <div className="list title-profile-list">
          <div className="list-entry list-header target-permission-list-entry title-permission-list-header">
            { this.SortableHeader("displayTitle", "Title") }
            { this.SortableHeader("profile", "Availability Profile") }
            { this.SortableHeader("startTime", "Start Time") }
            { this.SortableHeader("endTime", "End Time") }
            <div>Availability</div>
            <div />
          </div>
          {
            this.Paged(permissions)
              .map((titlePermission, index) => {
                const Update = (key, value) => this.props.rootStore.SetTitlePermissionAccess(titlePermission.objectId, this.Target().address, key, value);
                const profile = this.props.rootStore.titleProfiles[titlePermission.objectId][titlePermission.profile];

                if(!profile) { return null; }

                return (
                  <div className={`list-entry target-permission-list-entry ${index % 2 === 0 ? "even" : "odd"}`} key={`title-permission-${this.Target().address}-${titlePermission.objectId}`}>
                    <div className="small-font" title={titlePermission.displayTitle}>
                      <Link to={UrlJoin("/titles", titlePermission.objectId)} className="title-link">
                        <ImageIcon icon={LinkIcon} />
                      </Link>
                      { titlePermission.displayTitle }
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
                        title={`Remove ${titlePermission.displayTitle}`}
                        Delete={() => this.props.rootStore.RemoveTitlePermission(titlePermission.objectId, this.Target().address)}
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>
      </React.Fragment>
    );
  }

  TitleList() {
    const titles = !this.state.activeFilter ?
      this.props.rootStore.titles :
      this.props.rootStore.titlesTrie.get(this.state.activeFilter).map(result => result.value);

    return (
      <React.Fragment>
        { this.PageControls(titles.length) }
        <div className="list titles-list">
          <div className="list-entry titles-list-entry list-header titles-list-header">
            { this.SortableHeader("displayTitle", "Title")}
            <div>Permissions</div>
            <div />
          </div>
          {
            this.Paged(
              titles.sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            ).map((title, index) =>
              <Link
                key={`title-entry-${title.objectId}`}
                to={UrlJoin(this.props.location.pathname, title.objectId)}
                className={`list-entry titles-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
              >
                <div>{ title.displayTitle }</div>
                <div>{ Object.keys(this.props.rootStore.titlePermissions[title.objectId] || {}).length }</div>
                <div className="actions-cell">
                  <DeleteButton
                    confirm="Are you sure you want to remove this title?"
                    title={`Remove ${title.title}`}
                    Delete={() => this.props.rootStore.RemoveTitle(title.objectId)}
                  />
                </div>
              </Link>
            )
          }
        </div>
      </React.Fragment>
    );
  }

  Content() {
    return (
      <div className="page-container titles">
        { this.state.modal }
        <div className="page-header">
          { this.Target() ? <BackButton to={Path.dirname(Path.dirname(this.props.location.pathname))} /> : null }
          <h1>{ this.Target() ? `${this.Target().name} | Title Permissions` : "All Titles"}</h1>
        </div>

        <div className="controls">
          <Action onClick={this.ActivateModal}>Add Titles</Action>
          { this.Filter("Filter Titles...") }
        </div>

        { this.Target() ? this.TargetPermissions() : this.TitleList() }
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={async () => {
          if(this.props.match.params.groupAddress && !this.Group()){
            await this.props.rootStore.LoadGroup(this.props.match.params.groupAddress, this.props.match.params.groupType);

            await Promise.all(
              this.props.rootStore.targetTitleIds(this.props.match.params.groupAddress).map(objectId =>
                this.props.rootStore.AddTitle({objectId, lookupDisplayTitle: true})
              )
            );
          }
        }}
        render={this.Content}
      />
    );
  }


  /* Content Browser */

  async AddTitles({libraryId, objectIds}) {
    let addError;
    await Promise.all(
      objectIds.map(async objectId => {
        try {
          await this.props.rootStore.AddTitle({libraryId, objectId: objectId, lookupDisplayTitle: true});

          if(this.Target()) {
            this.props.rootStore.InitializeTitlePermission(this.Target().address, objectId, this.Target().type);
          }
        } catch (error) {
          if(!addError) { addError = error; }

          this.props.rootStore.RemoveTitle(objectId);

          if(this.Target()) {
            this.props.rootStore.RemoveTitlePermission(this.Target().address, objectId, this.Target().type);
          }

          // eslint-disable-next-line no-console
          console.error(error);
          throw error;
        }
      })
    );

    if(addError) { throw addError; }

    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <ContentBrowser
            browseSite
            multiple
            header="Select Titles"
            onComplete={this.AddTitles}
            onCancel={this.CloseModal}
            objectOnly
          />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

export default Titles;
