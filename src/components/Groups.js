import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Redirect} from "react-router";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, LoadingElement, Modal} from "elv-components-js";

import {ChangeSort, SortableHeader} from "./Misc";

@inject("rootStore")
@observer
class GroupBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 1,
      perPage: 10,
      filter: "",
      loading: false
    };

    this.UpdateFilter = this.UpdateFilter.bind(this);
    this.Load = this.Load.bind(this);
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

  SetPage(page) {
    this.setState({page: page}, this.Load);
  }

  UpdateFilter(event) {
    clearTimeout(this.filterTimeout);

    this.setState({filter: event.target.value});

    this.filterTimeout = setTimeout(this.Load, 1000);
  }

  render() {
    const totalGroups = this.props.rootStore.totalGroups;
    const startIndex = (this.state.page - 1) * this.state.perPage + 1;
    return (
      <div className="group-browser">
        <h1>Add a Group</h1>
        <div className="controls">
          <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
          <input className="filter" name="filter" value={this.state.filter} onChange={this.UpdateFilter} placeholder="Filter Groups..."/>
        </div>
        <div className="controls page-controls centered">
          <Action disabled={this.state.page === 1} onClick={() => this.SetPage(this.state.page - 1)}>Previous</Action>
          { startIndex } - { Math.min(totalGroups, startIndex + this.state.perPage - 1) } of { totalGroups }
          <Action disabled={this.state.page * (this.state.perPage + 1) > totalGroups} onClick={() => this.SetPage(this.state.page + 1)}>Next</Action>
        </div>
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
                  onClick={() => this.props.onComplete(group.address, group.type)}
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

    this.state = {
      filter: "",
      sortKey: "name",
      sortAsc: true,
      modal: null
    };

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);

    this.AddGroup = this.AddGroup.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
  }

  render() {
    return (
      <div className="page-container groups-page">
        { this.state.modal }
        <div className="page-header">
          <h1>Groups</h1>
        </div>

        <div className="controls">
          <Action onClick={() => this.ActivateModal(false)}>Add Group</Action>
          {
            this.props.rootStore.oauthSettings.domain && this.props.rootStore.oauthGroups ?
              <Action onClick={() => this.ActivateModal(true)}>
                Add OAuth Group
              </Action> : null
          }
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Groups..."/>
        </div>
        <div className="list">
          <div className="list-entry list-header groups-list-entry">
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("type", "Type") }
            { this.SortableHeader("description", "Description") }
            <div>Titles</div>
          </div>
          {
            Object.values(this.props.rootStore.allGroups)
              .filter(({name, description}) => !this.state.filter || (name.toLowerCase().includes(this.state.filter.toLowerCase()) || description.toLowerCase().includes(this.state.filter.toLowerCase())))
              .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
              .map(({type, address, name, description}, i) => {
                if(this.props.selectable) {
                  return (
                    <div
                      key={`groups-${address}`}
                      className={`list-entry list-entry-selectable groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                      onClick={() => this.props.onSelect(address, type)}
                    >
                      <div title={address}>{ name }</div>
                      <div title={type}>{ this.props.rootStore.FormatType(type) }</div>
                      <div className="small-font">{ description }</div>
                      <div>{ this.props.rootStore.targetTitles(address).length }</div>
                    </div>
                  );
                }

                return (
                  <Link
                    to={UrlJoin("groups", type, address)}
                    key={`groups-${address}`}
                    className={`list-entry groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                  >
                    <div title={address}>{ name }</div>
                    <div title={type}>{ this.props.rootStore.FormatType(type) }</div>
                    <div>{ description }</div>
                    <div>{ this.props.rootStore.targetTitles(address).length }</div>
                  </Link>
                );
              })
          }
        </div>
      </div>
    );
  }

  /* Group Browser */

  async AddGroup(address, type) {
    await this.props.rootStore.LoadGroup(address, type);

    this.CloseModal();

    if(this.props.onSelect) {
      this.props.onSelect(address, type);
    } else {
      this.setState({
        modal: <Redirect to={UrlJoin(this.props.location.pathname, type, address)}/>
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
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default Groups;
