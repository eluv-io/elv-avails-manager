import React from "react";
import {Action, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link, Redirect} from "react-router-dom";
import {BackButton, ChangeSort, SortableHeader} from "./Misc";
import Path from "path";
import AsyncComponent from "./AsyncComponent";
import GroupPermissions from "./permissions/GroupPermissions";

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
    this.AddTitle = this.AddTitle.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  Group() {
    if(!this.props.match.params.groupAddress) { return; }

    return this.props.rootStore.allGroups[this.props.match.params.groupAddress];
  }

  TitleList() {
    if(this.Group()) {
      return <GroupPermissions groupAddress={this.Group().address} filter={this.state.filter} />;
    }

    return (
      <div className="list titles-list">
        <div className="list-entry titles-list-entry list-header titles-list-header">
          { this.SortableHeader("title", "Title")}
        </div>
        {
          ( this.Group() ? this.props.rootStore.groupTitles(this.Group().address) : this.props.rootStore.titles )
            .filter(({title}) => !this.state.filter || (title.toLowerCase().includes(this.state.filter.toLowerCase())))
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .map((title, index) =>
              <Link
                key={`title-entry-${title.objectId}`}
                to={UrlJoin(this.props.location.pathname, title.objectId)}
                className={`list-entry titles-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
              >
                <div>{ title.title }</div>
              </Link>
            )
        }
      </div>
    );
  }

  Content() {
    const group = this.Group();
    return (
      <div className="page-container titles">
        { this.state.modal }
        <header>
          { group ? <BackButton to={Path.dirname(this.props.location.pathname)} /> : null }
          <h1>{ group ? `${group.name} | Title Permissions` : "All Titles"}</h1>
        </header>

        <div className="controls">
          <Action onClick={this.ActivateModal}>Add Title</Action>
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
            await this.props.rootStore.LoadGroups();

            await Promise.all(
              this.props.rootStore.groupTitleIds(this.props.match.params.groupAddress).map(objectId =>
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

  async AddTitle(args) {
    await this.props.rootStore.AddTitle(args);
    this.CloseModal();

    if(this.Group()) {
      this.props.rootStore.InitializeGroupTitlePermission(this.Group().address, args.objectId);
    } else {
      this.setState({
        modal: <Redirect to={UrlJoin(this.props.location.pathname, args.objectId)} />
      });
    }
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <ContentBrowser
            header="Select a Title"
            onComplete={this.AddTitle}
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
