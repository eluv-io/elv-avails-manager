import React from "react";
import {Action, Modal} from "elv-components-js";
import ContentBrowser from "../ContentBrowser";
import {inject, observer} from "mobx-react";
import {ChangeSort, DeleteButton, SortableHeader} from "../Misc";

@inject("rootStore")
@observer
class Sites extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      sortKey: "name",
      sortAsc: true,
    };

    this.AddSite = this.AddSite.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  SiteList() {
    return (
      <div className="list sites-list">
        <div className="list-entry sites-list-entry list-header sites-list-header">
          { this.SortableHeader("name", "Name")}
          <div />
        </div>
        {
          this.props.rootStore.sites
            .filter(({name}) => !this.state.filter || (name.toLowerCase().includes(this.state.filter.toLowerCase())))
            .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
            .map((site, index) =>
              <div
                key={`title-entry-${site.objectId}`}
                className={`list-entry sites-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
              >
                <div>{ site.name }</div>
                <div className="actions-cell">
                  <DeleteButton
                    title={`Remove ${site.name}`}
                    Delete={() => this.props.rootStore.RemoveSite(site.objectId)}
                    confirm="Are you sure you want to remove this site?"
                  />
                </div>
              </div>
            )
        }
      </div>
    );
  }

  render() {
    return (
      <div className="page-container titles">
        { this.state.modal }
        <div className="page-header">
          <h1>Sites</h1>
        </div>

        <div className="controls">
          <Action onClick={this.ActivateModal}>Add Site</Action>
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Sites..."/>
        </div>

        { this.SiteList() }
      </div>
    );
  }

  /* Content Browser */

  async AddSite(args) {
    await this.props.rootStore.AddSite(args);

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
            browseSite={false}
            header="Select a Site"
            titleTypes={["site"]}
            onComplete={this.AddSite}
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

export default Sites;
