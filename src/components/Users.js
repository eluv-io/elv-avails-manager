import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Redirect} from "react-router";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, LabelledField, LoadingElement, Modal} from "elv-components-js";

import {DeleteButton, InitPSF} from "./Misc";

@inject("rootStore")
@observer
class UsersBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.Load = this.Load.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", additionalState: { name: "", address: "", error: "", loading: false }});
  }

  componentDidMount() {
    this.Load();
  }

  async Load() {
    this.setState({loading: true});

    try {
      this.props.rootStore.LoadOAuthUsers({
        page: this.state.page,
        perPage: this.state.perPage,
        filter: this.state.activeFilter
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      this.setState({loading: false});
    }
  }

  FabricUserForm() {
    return (
      <form
        className="fabric-user-form"
        onSubmit={async event => {
          event.preventDefault();

          this.setState({validating: true});

          if(await this.props.rootStore.ValidateUser(this.state.address)) {
            this.props.onComplete(this.state.address, "fabricUser", this.state.name);
          } else {
            this.setState({error: "Invalid user address"});
          }
        }}
      >
        <h1>Add Fabric User</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error } </div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: ""})}
          />
        </LabelledField>
        <LabelledField label="Address">
          <input
            required
            placeholder="0x0000000000000000000000000000000000000000"
            value={this.state.address}
            onChange={event => this.setState({address: event.target.value, error: ""})}
          />
        </LabelledField>

        <div className="form-actions">
          <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
          <Action type="submit">Add User</Action>
        </div>
      </form>
    );
  }

  render() {
    if(!this.props.oauth) {
      return this.FabricUserForm();
    }

    return (
      <div className="user-browser">
        <h1>Add a User</h1>
        <div className="controls">
          <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
          { this.Filter("Filter Users...", this.Load) }
        </div>
        { this.PageControls(this.props.rootStore.totalUsers, this.Load)}
        <LoadingElement loading={this.state.loading}>
          <div className="list">
            <div className="list-entry list-header users-browse-list-entry">
              <div>Name</div>
            </div>
            {
              this.props.rootStore.userList.map((user, i) =>
                <div
                  key={`users-${user.address}`}
                  className={`list-entry list-entry-selectable users-browse-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                  onClick={() => this.props.onComplete(user.address, user.type)}
                >
                  <div>{ user.name }</div>
                </div>
              )
            }
          </div>
        </LoadingElement>
      </div>
    );
  }
}

UsersBrowser.propTypes = {
  oauth: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};


@inject("rootStore")
@observer
class Users extends React.Component {
  constructor(props) {
    super(props);

    this.AddUser = this.AddUser.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", additionalState: { modal: null }});
  }

  render() {
    const users = Object.values(this.props.rootStore.allUsers)
      .filter(({name}) => !this.state.activeFilter || (name.toLowerCase().includes(this.state.activeFilter.toLowerCase())))
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <div className="page-container users-page">
        { this.state.modal }
        <div className="page-header">
          <h1>Users</h1>
          <div />
        </div>

        <div className="controls">
          <Action onClick={() => this.ActivateModal(false)}>Add Fabric User</Action>
          {
            this.props.rootStore.oauthUsers ?
              <Action onClick={() => this.ActivateModal(true)}>
                Add OAuth User
              </Action> : null
          }
          { this.Filter("Filter Users...") }
        </div>
        { this.PageControls(users.length) }
        <div className="list">
          <div className={`list-entry list-header users-list-entry ${this.props.selectable ? "list-entry-selectable" : ""}`}>
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("type", "Type") }
            <div>Titles</div>
            { this.props.selectable ? null : <div /> }
          </div>
          {
            this.Paged(users).map(({type, address, name}, i) => {
              const contents = (
                <React.Fragment>
                  <div title={address}>{ name }</div>
                  <div title={type}>{ this.props.rootStore.FormatType(type) }</div>
                  <div>{ this.props.rootStore.targetTitlesIds(address).length }</div>
                </React.Fragment>
              );

              if(this.props.selectable) {
                return (
                  <div
                    key={`users-${address}`}
                    className={`list-entry list-entry-selectable users-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                    onClick={() => this.props.onSelect(address, type)}
                  >
                    {contents}
                  </div>
                );
              }

              return (
                <Link
                  to={UrlJoin("users", type, address)}
                  key={`users-${address}`}
                  className={`list-entry users-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                >
                  { contents }
                  <div className="actions-cell">
                    <DeleteButton
                      confirm="Are you sure you want to remove this user?"
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

  /* User Browser */

  async AddUser(address, type, name) {
    await this.props.rootStore.LoadUser(address, type, name);

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
          className={`asset-form-modal ${oauth ? "fullscreen-modal" : "shrink-modal"}`}
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <UsersBrowser
            key={`user-browser-${oauth}`}
            oauth={oauth}
            onComplete={this.AddUser}
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

Users.propTypes = {
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default Users;
