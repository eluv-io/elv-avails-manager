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
import OAuthSettings from "./components/OAuthSettings";
import Sites from "./components/Sites";

if(typeof EluvioConfiguration === "undefined") {
  global.EluvioConfiguration = {};
}

@inject("rootStore")
@observer
@withRouter
class App extends React.Component {
  constructor(props) {
    super(props);

    this.Content = this.Content.bind(this);
  }

  Content() {
    // This function will not be called until the root store initialization has
    // completed and the client is available

    const {message, error, key} = this.props.rootStore.message;

    let headerMessage;
    if(error) {
      headerMessage = <div key={`message-${key}`} className="message error-message">{ error }</div>;
    } else if(message) {
      headerMessage = <div key={`message-${key}`} className="message">{ message }</div>;
    }

    return (
      <div className="app-container">
        <header>
          { headerMessage }
          <Action
            onClick={async () => await Confirm({
              message: "Are you sure you want to save these permissions?",
              onConfirm: this.props.rootStore.Save
            })}
          >
            Save
          </Action>
        </header>
        <nav className="navigation-tabs -elv-tab-container">
          <NavLink to="/sites" className="-elv-tab" activeClassName="selected">Sites</NavLink>
          <NavLink to="/titles" className="-elv-tab" activeClassName="selected">Titles</NavLink>
          <NavLink to="/users" className="-elv-tab" activeClassName="selected">Users</NavLink>
          <NavLink to="/groups" className="-elv-tab" activeClassName="selected">Groups</NavLink>
          <NavLink to="/oauth" className="-elv-tab" activeClassName="selected">OAuth</NavLink>
        </nav>
        <main>
          <Switch>
            <Route exact path="/sites" component={Sites} />

            <Route exact path="/oauth" component={OAuthSettings} />

            <Route exact path="/view" component={Titles} />

            <Route exact path="/users" component={Users} />
            <Route exact path="/users/:userType/:userAddress" component={Titles} />

            <Route exact path="/groups" component={Groups} />
            <Route exact path="/groups/:groupType/:groupAddress" component={Titles} />

            <Route exact path="/titles" component={Titles} />
            <Route exact path="/titles/:objectId" component={Title} />
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
