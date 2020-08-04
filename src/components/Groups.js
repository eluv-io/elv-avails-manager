import React from "react";
import AsyncComponent from "./AsyncComponent";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";

import {ChangeSort, SortableHeader} from "./Misc";

@inject("rootStore")
@observer
class Groups extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      sortKey: "name",
      sortAsc: true,
    };

    this.Content = this.Content.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  Content() {
    return (
      <div className="page-container groups-page">
        <header>
          <h1>Access Groups</h1>
        </header>

        <div className="controls">
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Groups..."/>
        </div>
        <div className="list">
          <div className="list-entry list-header groups-list-entry">
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("description", "Description") }
          </div>
          {
            Object.values(this.props.rootStore.allGroups)
              .filter(({name, description}) => !this.state.filter || (name.toLowerCase().includes(this.state.filter.toLowerCase()) || description.toLowerCase().includes(this.state.filter.toLowerCase())))
              .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
              .map(({address, name, description}, i) => {
                if(this.props.selectable) {
                  return (
                    <div
                      key={`groups-${address}`}
                      className={`list-entry list-entry-selectable groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                      onClick={() => this.props.onSelect(address)}
                    >
                      <div title={address}>{ name }</div>
                      <div>{ description }</div>
                    </div>
                  );
                }

                return (
                  <Link
                    to={UrlJoin("groups", address)}
                    key={`groups-${address}`}
                    className={`list-entry groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                  >
                    <div title={address}>{ name }</div>
                    <div>{ description }</div>
                  </Link>
                );
              })
          }
        </div>
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={this.props.rootStore.LoadGroups}
        render={this.Content}
      />
    );
  }
}

Groups.propTypes = {
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default Groups;
