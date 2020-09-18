import React from "react";
import BackIcon from "../static/icons/directory_back.svg";
import {Confirm, IconButton} from "elv-components-js";
import {Link} from "react-router-dom";

import DeleteIcon from "../static/icons/trash.svg";

export const BackButton = ({to}) => (
  <Link to={to} className="back-button">
    <IconButton
      icon={BackIcon}
      label={"Back"}
    />
  </Link>
);

export const DeleteButton = ({Delete, confirm, title="Remove", className=""}) => {
  if(!confirm) { confirm = "Are you sure you want to remove this item?"; }

  return (
    <IconButton
      icon={DeleteIcon}
      onClick={
        async event => {
          event.preventDefault();

          await Confirm({
            message: confirm,
            onConfirm: Delete
          });
        }}
      label={title}
      className={`delete-icon ${className}`}
    />
  );
};

export const SortableHeader = function(key, label, f) {
  return (
    <div
      onClick={() => this.ChangeSort(key, f)}
      className={`sortable-header ${key === this.state.sortKey ? "active" : ""} ${this.state.sortAsc ? "asc" : "desc"}`}
    >
      {label}
    </div>
  );
};

export const ChangeSort = function(key, f) {
  if(this.state.sortKey === key) {
    this.setState({sortAsc: !this.state.sortAsc, sortFunction: f});
  } else {
    this.setState({sortKey: key, sortAsc: true, sortFunction: f});
  }
};

export const EffectiveAvailability = (startTimes, endTimes) => {
  const effectiveStartTime = Math.max(...startTimes.filter(t => t));
  const effectiveEndTime = Math.min(...endTimes.filter(t => t));

  let effectivePeriod = "Unlimited";
  if(isFinite(effectiveStartTime) || isFinite(effectiveEndTime)) {
    if(effectiveEndTime < effectiveStartTime) {
      effectivePeriod = "None";
    } else {
      effectivePeriod = `
                    ${isFinite(effectiveStartTime) ? new Date(effectiveStartTime).toISOString().substring(0, 10) : ""}
                    -
                    ${isFinite(effectiveEndTime) ? new Date(effectiveEndTime).toISOString().substring(0, 10) : ""}
                  `;
    }
  }

  return effectivePeriod;
};
