import "./static/stylesheets/app.scss";
import {Confirm} from "elv-components-js";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";
import {Redirect, Switch, Route, withRouter} from "react-router";
import {HashRouter, NavLink} from "react-router-dom";

import * as Stores from "./stores";
import AsyncComponent from "./components/AsyncComponent";
import Users from "./components/Users";
import Groups from "./components/Groups";
import Titles from "./components/Titles";
import Title from "./components/Title";
import Asset from "./components/Asset";
import AssetPermissions from "./components/permissions/AssetPermissions";
import OfferingPermissions from "./components/permissions/OfferingPermissions";
import Action from "elv-components-js/src/components/Action";

import timezones from "./TimeZones";
import Settings from "./components/settings/Settings";
import NTPInstances from "./components/NTPInstances";
import NTPInstance from "./components/NTPInstance";
import PermissionDetails from "./components/PermissionDetails";
import NTPSubjects from "./components/NTPSubjects";

if(typeof EluvioConfiguration === "undefined") {
  global.EluvioConfiguration = {};
}

@inject("rootStore")
@observer
@withRouter
class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      commitMessage: ""
    };

    this.Content = this.Content.bind(this);
  }

  componentWillUnmount() {
    clearInterval(this.versionHashInterval);
  }

  Timezone() {
    return (
      <div className="timezone-selection">
        <label>Timezone</label>
        <select
          value={this.props.rootStore.timezone}
          onChange={event => this.props.rootStore.SetTimezone(event.target.value)}
        >
          {
            timezones.map(zone => <option key={`zone-${zone}`} value={zone}>{zone}</option>)
          }
        </select>
      </div>
    );
  }

  Content() {
    // This function will not be called until the root store initialization has
    // completed and the client is available

    const {message, error, key} = this.props.rootStore.message;

    let headerMessage = <div className="message" />;
    if(error) {
      headerMessage = <div key={`message-${key}`} className="message error-message">{ error }</div>;
    } else if(message) {
      headerMessage = <div key={`message-${key}`} className="message">{ message }</div>;
    }

    return (
      <div className="app-container">
        {
          this.props.rootStore.versionHashChanged ?
            <div className="version-warning">Warning: You are currently working on an outdated content object. Please
          refresh the page to view the latest version.</div> : null
        }
        <header>
          { headerMessage }
          { this.Timezone() }
          <Action
            onClick={async () => await Confirm({
              message: "Are you sure you want to save these permissions?",
              additionalInputs: [{
                label: "Commit Message (optional)",
                name: "commitMessage",
                onChange: commitMessage => this.setState({commitMessage})
              }],
              onConfirm: async () => {
                await this.props.rootStore.Save(this.state.commitMessage);
                this.setState({commitMessage: ""});
              }
            })}
          >
            Save
          </Action>
        </header>
        <nav className="navigation-tabs -elv-tab-container">
          <NavLink to="/titles" className="-elv-tab" activeClassName="selected">Titles</NavLink>
          <NavLink to="/users" className="-elv-tab" activeClassName="selected">Users</NavLink>
          <NavLink to="/groups" className="-elv-tab" activeClassName="selected">Groups</NavLink>
          <NavLink to="/ntps" className="-elv-tab" activeClassName="selected">Tickets</NavLink>
          <NavLink to="/settings" className="-elv-tab" activeClassName="selected">Settings</NavLink>
        </nav>
        <main className={`app-version-${this.props.rootStore.versionKey}`}>
          <Switch>
            <Route exact path="/settings" component={Settings} />

            <Route exact path="/users" component={Users} />
            <Route exact path="/users/:userAddress" component={Titles} />
            <Route exact path="/users/:userAddress/:objectId" component={PermissionDetails} />

            <Route exact path="/groups" component={Groups} />
            <Route exact path="/groups/:groupAddress" component={Titles} />
            <Route exact path="/groups/:groupAddress/:objectId" component={PermissionDetails} />

            <Route exact path="/ntps" component={NTPInstances} />
            <Route exact path="/ntps/:ntpId" component={Titles} />

            <Route exact path="/ntps/:ntpId/subjects" component={NTPSubjects} />
            <Route exact path="/ntps/:ntpId/subjects/:subjectId" component={Titles} />
            <Route exact path="/ntps/:ntpId/subjects/:subjectId/:objectId" component={PermissionDetails} />

            <Route exact path="/ntps/:ntpId/manage" component={NTPInstance} />
            <Route exact path="/ntps/:ntpId/:objectId" component={PermissionDetails} />

            <Route exact path="/titles" component={params => <Titles key="main-titles" {...params} />} />
            <Route exact path="/titles/:objectId" component={Title} />
            <Route exact path="/titles/:objectId/:targetId" component={PermissionDetails} />
            <Route exact path="/titles/:objectId/permissions/profiles/:profile/assets" component={AssetPermissions} />
            <Route exact path="/titles/:objectId/permissions/profiles/:profile/offerings" component={OfferingPermissions} />

            <Route exact path="/titles/:objectId/assets/:assetKey" component={Asset} />

            <Route>
              <Redirect to="/titles" />
            </Route>
          </Switch>
        </main>
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={() => this.props.rootStore.InitializeClient()}
        render={this.Content}
      />
    );
  }
}

render(
  (
    <React.Fragment>
      <Provider {...Stores}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </React.Fragment>
  ),
  document.getElementById("app")
);
