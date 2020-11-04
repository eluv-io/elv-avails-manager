import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Redirect} from "react-router";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, LoadingElement, Modal} from "elv-components-js";

import {DeleteButton, InitPSF} from "./Misc";

@inject("rootStore")
@observer
class GroupBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.UpdateFilter = this.UpdateFilter.bind(this);
    this.Load = this.Load.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", additionalState: { loading: false }});
  }

  componentDidMount() {
    this.Load();
  }

  async Load() {
    this.setState({loading: true});

    try {
      if(this.props.oauth) {
        await this.props.rootStore.LoadOAuthGroups({
          page: this.state.page,
          perPage: this.state.perPage,
          filter: this.state.filter
        });
      } else {
        await this.props.rootStore.LoadGroups({
          page: this.state.page,
          perPage: this.state.perPage,
          filter: this.state.filter
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      this.setState({loading: false});
    }
  }

  UpdateFilter(event) {
    clearTimeout(this.filterTimeout);

    this.setState({filter: event.target.value});

    this.filterTimeout = setTimeout(this.Load, 1000);
  }

  render() {
    return (
      <div className="group-browser">
        <h1>Add a Group</h1>
        <div className="controls">
          <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
          { this.Filter("Filter Groups...", this.Load) }
        </div>

        { this.PageControls(this.props.rootStore.totalGroups, this.Load) }

        <LoadingElement loading={this.state.loading}>
          <div className="list">
            <div className="list-entry list-header groups-browse-list-entry">
              <div>Name</div>
              <div>Description</div>
            </div>
            {
              this.props.rootStore.groupList.map((group, i) =>
                <div
                  key={`groups-${group.address}`}
                  className={`list-entry list-entry-selectable groups-browse-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                  onClick={() => this.props.onComplete(group.address, group.type, group.name)}
                >
                  <div>{ group.name }</div>
                  <div className="small-font">{ group.description }</div>
                </div>
              )
            }
          </div>
        </LoadingElement>
      </div>
    );
  }
}

GroupBrowser.propTypes = {
  oauth: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};


@inject("rootStore")
@observer
class Groups extends React.Component {
  constructor(props) {
    super(props);

    this.AddGroup = this.AddGroup.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", additionalState: { modal: null }});
  }

  render() {
    const groups = Object.values(this.props.rootStore.allGroups)
      .filter(({name, description}) => !this.state.activeFilter || ((name || "").toLowerCase().includes(this.state.activeFilter.toLowerCase()) || (description || "").toLowerCase().includes(this.state.activeFilter.toLowerCase())))
      .filter(({type}) => this.props.fabricOnly ? type === "fabricGroup" : true)
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <div className="page-container groups-page">
        { this.state.modal }
        <div className="page-header">
          <h1>Groups</h1>
        </div>

        <div className="controls">
          <Action onClick={() => this.ActivateModal(false)}>Add Fabric Group</Action>
          {
            this.props.rootStore.oauthGroups && !this.props.fabricOnly ?
              <Action onClick={() => this.ActivateModal(true)}>
                Add OAuth Group
              </Action> : null
          }
          { this.Filter("Filter Groups...") }
        </div>

        { this.PageControls(groups.length) }

        <div className="list">
          <div className={`list-entry list-header groups-list-entry ${this.props.selectable ? "list-entry-selectable" : ""}`}>
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("type", "Type") }
            { this.SortableHeader("description", "Description") }
            <div>Titles</div>
            { this.props.selectable ? null : <div /> }
          </div>
          {
            this.Paged(groups).map(({type, address, name, description}, i) => {
              const contents = (
                <React.Fragment>
                  <div title={address}>{ name }</div>
                  <div title={type}>{ this.props.rootStore.FormatType(type) }</div>
                  <div className="small-font">{ description }</div>
                  <div>{ this.props.rootStore.targetTitleIds(address).length }</div>
                </React.Fragment>
              );

              if(this.props.selectable) {
                return (
                  <div
                    key={`groups-${address}`}
                    className={`list-entry list-entry-selectable groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                    onClick={() => this.props.onSelect(address, type, name)}
                  >
                    { contents }
                  </div>
                );
              }

              return (
                <Link
                  to={UrlJoin("groups", address)}
                  key={`groups-${address}`}
                  className={`list-entry groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                >
                  { contents }
                  <div className="actions-cell">
                    <DeleteButton
                      confirm="Are you sure you want to remove this group?"
                      title={`Remove ${name}`}
                      Delete={() => this.props.rootStore.RemoveTarget(address)}
                    />
                  </div>
                </Link>
              );
            })
          }
        </div>
      </div>
    );
  }

  /* Group Browser */

  async AddGroup(address, type, name) {
    await this.props.rootStore.LoadGroup(address, type, name);

    this.CloseModal();

    if(this.props.onSelect) {
      this.props.onSelect(address, type, name);
    } else {
      this.setState({
        modal: <Redirect to={UrlJoin(this.props.location.pathname, address)}/>
      });
    }
  }

  ActivateModal(oauth=false) {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal fullscreen-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <GroupBrowser
            key={`group-browser-${oauth}`}
            oauth={oauth}
            onComplete={this.AddGroup}
            onCancel={this.CloseModal}
          />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

Groups.propTypes = {
  fabricOnly: PropTypes.bool,
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default Groups;
