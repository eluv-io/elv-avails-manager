import React from "react";
import {DateTime} from "luxon";
import {Confirm, IconButton} from "elv-components-js";
import {Link} from "react-router-dom";

import BackIcon from "../static/icons/directory_back.svg";
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

const DATE_FORMAT = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  timeZoneName: "short"
};
export const FormatDate = millis => {
  if(!millis || !isFinite(millis)) { return ""; }

  return DateTime.fromMillis(millis).toLocaleString(DATE_FORMAT);
};

export const EffectiveAvailability = (startTimes, endTimes) => {
  const effectiveStartTime = Math.max(...startTimes.filter(t => t));
  const effectiveEndTime = Math.min(...endTimes.filter(t => t));

  let effectivePeriod = "Unlimited";
  if(isFinite(effectiveStartTime) || isFinite(effectiveEndTime)) {
    if(effectiveEndTime < effectiveStartTime) {
      effectivePeriod = "None";
    } else {
      effectivePeriod = `${FormatDate(effectiveStartTime)} - ${FormatDate(effectiveEndTime)}`;
    }
  }

  return effectivePeriod;
};
