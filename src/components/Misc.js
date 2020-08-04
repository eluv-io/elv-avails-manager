import React from "react";
import BackIcon from "../static/icons/directory_back.svg";
import {IconButton} from "elv-components-js";
import {Link} from "react-router-dom";

export const BackButton = ({to}) => (
  <Link to={to} className="back-button">
    <IconButton
      icon={BackIcon}
      label={"Back"}
    />
  </Link>
);

export const SortableHeader = function(key, label) {
  return (
    <div
      onClick={() => this.ChangeSort(key)}
      className={`sortable-header ${key === this.state.sortKey ? "active" : ""} ${this.state.sortAsc ? "asc" : "desc"}`}
    >
      {label}
    </div>
  );
};

export const ChangeSort = function(key) {
  if(this.state.sortKey === key) {
    this.setState({sortAsc: !this.state.sortAsc});
  } else {
    this.setState({sortKey: key, sortAsc: true});
  }
};
