import React from "react";
import {Action, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import {BackButton, ChangeSort, DeleteButton, SortableHeader} from "./Misc";
import Path from "path";
import AsyncComponent from "./AsyncComponent";
import TargetPermissions from "./permissions/TargetPermissions";

@inject("rootStore")
@observer
class Titles extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      sortKey: "title",
      sortAsc: true,
    };

    this.Content = this.Content.bind(this);
    this.AddTitles = this.AddTitles.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
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

  TitleList() {
    if(this.Target()) {
      return <TargetPermissions permissions={this.props.rootStore.targetTitlePermissions(this.Target().address)} target={this.Target()} filter={this.state.filter} />;
    }

    return (
      <div className="list titles-list">
        <div className="list-entry titles-list-entry list-header titles-list-header">
          { this.SortableHeader("title", "Title")}
          <div>Permissions</div>
          <div />
        </div>
        {
          this.props.rootStore.titles
            .filter(({title}) => !this.state.filter || (title.toLowerCase().includes(this.state.filter.toLowerCase())))
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .map((title, index) =>
              <Link
                key={`title-entry-${title.objectId}`}
                to={UrlJoin(this.props.location.pathname, title.objectId)}
                className={`list-entry titles-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
              >
                <div>{ title.title }</div>
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
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Titles..."/>
        </div>

        { this.TitleList() }
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
                this.props.rootStore.AddTitle({objectId})
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
          await this.props.rootStore.AddTitle({libraryId, objectId: objectId});

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
