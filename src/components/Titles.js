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
      page: 1,
      perPage: 100,
      filter: "",
      activeFilter: "",
      sortKey: "display_title",
      sortAsc: true
    };

    this.Content = this.Content.bind(this);
    this.AddTitles = this.AddTitles.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  SetPage(page) {
    this.setState({page});
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

    const titles = !this.state.activeFilter ?
      this.props.rootStore.titles :
      this.props.rootStore.titlesTrie.get(this.state.activeFilter).map(result => result.value);

    const startIndex = (this.state.page - 1) * this.state.perPage + 1;
    return (
      <React.Fragment>
        <div className="controls page-controls centered">
          <Action disabled={this.state.page === 1} onClick={() => this.SetPage(this.state.page - 1)}>Previous</Action>
          { startIndex } - { Math.min(titles.length, startIndex + this.state.perPage - 1) } of { titles.length }
          <Action disabled={this.state.page * (this.state.perPage + 1) > titles.length} onClick={() => this.SetPage(this.state.page + 1)}>Next</Action>
        </div>
        <div className="list titles-list">
          <div className="list-entry titles-list-entry list-header titles-list-header">
            { this.SortableHeader("display_title", "Title")}
            <div>Permissions</div>
            <div />
          </div>
          {
            titles
              .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
              .slice(startIndex, startIndex + this.state.perPage)
              .map((title, index) =>
                <Link
                  key={`title-entry-${title.objectId}`}
                  to={UrlJoin(this.props.location.pathname, title.objectId)}
                  className={`list-entry titles-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
                >
                  <div>{ title.display_title }</div>
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
          <input
            className="filter"
            name="filter"
            value={this.state.filter}
            onChange={event => {
              clearTimeout(this.filterTimeout);
              this.setState({filter: event.target.value});
              this.filterTimeout = setTimeout(() => this.setState({activeFilter: this.state.filter, page: 1}), 500);
            } }
            placeholder="Filter Titles..."
          />
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
