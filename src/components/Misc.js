import React from "react";
import {DateTime} from "luxon";
import {Action, Confirm, DateSelection, IconButton, ImageIcon, Maybe, ToolTip} from "elv-components-js";
import {Link} from "react-router-dom";

import BackIcon from "../static/icons/directory_back.svg";
import DeleteIcon from "../static/icons/trash.svg";
import AlertIcon from "../static/icons/alert-circle.svg";
import ListIcon from "../static/icons/list.svg";

export const BackButton = ({to}) => (
  <Link to={to} className="back-button">
    <IconButton
      icon={BackIcon}
      label="Back"
    />
  </Link>
);

export const DeleteButton = ({Delete, confirm, title="Remove", className="", disabled=false}) => {
  if(!confirm) { confirm = "Are you sure you want to remove this item?"; }

  return (
    <IconButton
      icon={DeleteIcon}
      disabled={disabled}
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

export const PermissionDetailsButton = ({to}) => (
  <Link to={to} className="details-button">
    <IconButton
      icon={ListIcon}
      label="Permission Details"
    />
  </Link>
);


const DATE_FORMAT = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  timeZoneName: "short"
};

export const FormatDate = (millis, long=false, customFormat) => {
  if(!millis || !isFinite(millis)) { return ""; }

  return long ?
    DateTime.fromMillis(millis).toLocaleString({...(customFormat || DATE_FORMAT), second: "numeric"}) :
    DateTime.fromMillis(millis).toLocaleString(customFormat || DATE_FORMAT);
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


/* Pagination, sorting and filtering */

// To be called in class constructor - sets up state and methods for PSF
export const InitPSF = function({sortKey, perPage=100, additionalState={}}) {
  this.state = {
    page: 1,
    perPage,
    filter: "",
    activeFilter: "",
    sortKey: sortKey,
    sortAsc: true,
    ...additionalState
  };

  this.SortableHeader = SortableHeader.bind(this);
  this.ChangeSort = ChangeSort.bind(this);
  this.Filter = Filter.bind(this);
  this.PageControls = PageControls.bind(this);
  this.ChangePage = ChangePage.bind(this);
  this.Paged = Paged.bind(this);
  this.HandleFilterChange = HandleFilterChange.bind(this);
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

export const PageControls = function(total, onChange) {
  const startIndex = (this.state.page - 1) * this.state.perPage + 1;
  let range = "No results";

  if(total) {
    range = `${ startIndex } - ${ Math.min(total, startIndex + this.state.perPage - 1) } of ${ total }`;
  }

  return (
    <div className="controls page-controls centered">
      <Action disabled={this.state.page === 1} onClick={() => this.ChangePage(this.state.page - 1, onChange)}>Previous</Action>
      { range }
      <Action disabled={this.state.page * this.state.perPage >= total} onClick={() => this.ChangePage(this.state.page + 1, onChange)}>Next</Action>
    </div>
  );
};

export const ChangePage = function(page, onChange) {
  this.setState({page}, onChange);
};

export const Paged = function(list) {
  const startIndex = (this.state.page - 1) * this.state.perPage;

  return list.slice(startIndex, startIndex + this.state.perPage);
};

export const HandleFilterChange = function(event, onChange) {
  clearTimeout(this.filterTimeout);

  this.setState({filter: event.target.value});

  this.filterTimeout = setTimeout(() => {
    this.setState({activeFilter: this.state.filter});
    this.ChangePage(1, onChange);
  }, 250);
};

export const Filter = function(placeholder, onChange) {
  return (
    <input
      className="filter"
      name="filter"
      value={this.state.filter}
      onChange={event => this.HandleFilterChange(event, onChange)}
      placeholder={placeholder}
    />
  );
};

export const NTPBadge = ({startTime, endTime}) => {
  const now = Date.now();
  if(endTime < now) {
    return <div className="ntp-badge expired">Expired</div>;
  } else if(startTime > now) {
    return <div className="ntp-badge upcoming">Upcoming</div>;
  }

  return <div className="ntp-badge active">Active</div>;
};

export const ProfileDateSelection = (args) => {
  return (
    <div className="date-input-with-alert">
      <DateSelection {...args} />
      { ProfileDateWarning(args) }
    </div>
  );
};

export const ProfileDateWarning = ({name, profile, value}) => {
  const profileTime = profile[name];

  let alert;
  if(profileTime) {
    if(name === "startTime") {
      if(value > profile.endTime) {
        alert = "Warning: The start date for this item is later than the end date";
      } else if(value < profileTime) {
        alert = "Warning: The start date for this item is earlier than the start date for the profile. This item will not be available until the later profile date.";
      }
    } else if(name === "endTime") {
      if(value < profile.startTime) {
        alert = "Warning: The end date for this item is earlier than the start date";
      } else if(value > profileTime) {
        alert = "Warning: The end date for this item is later than the end date for the profile. This item will not be available after the earlier profile date.";
      }
    }
  }

  return Maybe(alert, DateFieldAlert(alert));
};

export const DateFieldAlert = (message) => {
  return (
    <ToolTip content={message} className="date-field-alert-tooltip">
      <ImageIcon
        className="help-icon date-field-alert"
        icon={AlertIcon}
      />
    </ToolTip>
  );
};
