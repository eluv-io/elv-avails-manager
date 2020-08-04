import "./static/stylesheets/app.scss";
import {AsyncComponent} from "elv-components-js";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";
import {Redirect, Switch, Route, withRouter} from "react-router";
import {HashRouter, NavLink} from "react-router-dom";

import * as Stores from "./stores";
import Users from "./components/Users";
import Groups from "./components/Groups";
import Titles from "./components/Titles";
import Title from "./components/Title";
import Asset from "./components/Asset";
import AssetPermissions from "./components/permissions/AssetPermissions";
import OfferingPermissions from "./components/permissions/OfferingPermissions";

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

    return (
      <div className="app-container">
        <nav className="navigation-tabs -elv-tab-container">
          <NavLink to="/titles" className="-elv-tab" activeClassName="selected">Titles</NavLink>
          <NavLink to="/profiles" className="-elv-tab" activeClassName="selected">Profiles</NavLink>
          <NavLink to="/users" className="-elv-tab" activeClassName="selected">Users</NavLink>
          <NavLink to="/groups" className="-elv-tab" activeClassName="selected">Groups</NavLink>
          <NavLink to="/view" className="-elv-tab" activeClassName="selected">Effective View</NavLink>
        </nav>
        <main>
          <Switch>
            <Route exact path="/users" component={Users} />
            <Route exact path="/view" component={Titles} />

            <Route exact path="/groups" component={Groups} />
            <Route exact path="/groups/:groupAddress" component={Titles} />
            <Route exact path="/groups/:groupAddress/:objectId" component={Title} />
            <Route exact path="/groups/:groupAddress/:objectId/permissions/:permissionType/:targetId/assets" component={AssetPermissions} />
            <Route exact path="/groups/:groupAddress/:objectId/permissions/:permissionType/:targetId/offerings" component={OfferingPermissions} />
            <Route exact path="/groups/:groupAddress/:objectId/assets/:assetKey" component={Asset} />

            <Route exact path="/titles" component={Titles} />
            <Route exact path="/titles/:objectId" component={Title} />
            <Route exact path="/titles/:objectId/permissions/:permissionType/:targetId/assets" component={AssetPermissions} />
            <Route exact path="/titles/:objectId/permissions/:permissionType/:targetId/offerings" component={OfferingPermissions} />

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
