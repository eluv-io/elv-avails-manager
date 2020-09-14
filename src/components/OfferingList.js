import {DateTime} from "luxon";

import React from "react";
import PropTypes from "prop-types";
import {withRouter} from "react-router-dom";
import {ChangeSort, SortableHeader} from "./Misc";
import {Action} from "elv-components-js";

@withRouter
class OfferingList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      show: false,
      sortKey: "offeringKey",
      sortAsc: true,
      selected: []
    };

    this.OfferingEntry = this.OfferingEntry.bind(this);
    this.SelectOffering = this.SelectOffering.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  SelectOffering(offering) {
    const isSelected = this.state.selected.find(entry => entry.offeringKey === offering.offeringKey);

    if(isSelected) {
      this.setState({
        selected: this.state.selected.filter(entry => entry.offeringKey !== offering.offeringKey)
      }, () => this.props.onSelect(this.state.selected));
    } else {
      this.setState({
        selected: [...this.state.selected, offering]
      }, () => this.props.onSelect(this.state.selected));
    }
  }

  OfferingEntry(offering, index) {
    const FormatDate = millis => millis ? DateTime.fromMillis(millis).toISODate() : "";

    const isSelected = this.state.selected.find(entry => entry.offeringKey === offering.offeringKey);
    return (
      <div
        key={`offering-entry-${offering.offeringKey}`}
        className={`list-entry offerings-list-entry ${index % 2 === 0 ? "even" : "odd"} ${this.props.selectable ? "list-entry-selectable" : ""} ${this.props.withPermissions ? "offerings-list-entry-with-permissions" : ""} ${isSelected ? "selected" : ""}`}
        onClick={this.props.selectable ? () => this.SelectOffering(offering) : undefined}
      >
        <div>{ offering.offeringKey }</div>
        <div title={offering.playoutFormats}><span>{ offering.playoutFormats }</span></div>
        { this.props.withPermissions ? <div>{offering.permission === "full-access" ? "Full Access" : "No Access"} </div> : null }
        { this.props.withPermissions ? <div>{offering.geoRestriction}</div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(offering.startTime)} </div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(offering.endTime)} </div> : null }
      </div>
    );
  }

  render() {
    const offerings = this.props.offerings
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    const SelectAll = () => {
      this.setState({
        selected: this.props.offerings
      }, () => this.props.onSelect(this.state.selected));
    };

    const Clear = () => {
      this.setState({
        selected: []
      }, () => this.props.onSelect(this.state.selected));
    };

    return (
      <div className="offerings-list">
        <div className="controls">
          { this.props.actions }
          { this.props.offerings.length > 0 && this.props.selectable ? <Action className="secondary" onClick={SelectAll}>Select All</Action> : null }
          { this.state.selected.length > 0 && this.props.selectable ? <Action className="secondary" onClick={Clear}>Clear Selected</Action> : null }
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Offerings..."/>
        </div>
        <div className="list">
          <div className={`list-entry offerings-list-entry list-header offerings-list-header ${this.props.withPermissions ? "offerings-list-entry-with-permissions" : ""}`}>
            { this.SortableHeader("offeringKey", "Offering") }
            { this.SortableHeader("playoutFormats", "Playout Formats") }
            { this.props.withPermissions ? this.SortableHeader("permission", "Permission") : null }
            { this.props.withPermissions ? this.SortableHeader("geoRestriction", "Geo Restriction") : null }
            { this.props.withPermissions ? this.SortableHeader("startTime", "Start Time") : null }
            { this.props.withPermissions ? this.SortableHeader("endTime", "End Time") : null }
          </div>

          {
            offerings
              .filter(({offeringKey, playoutFormats}) =>
                !this.state.filter ||
                ((offeringKey || "").toLowerCase().includes(this.state.filter.toLowerCase())
                  || (playoutFormats || "").toLowerCase().includes(this.state.filter.toLowerCase()))
              )
              .map(this.OfferingEntry)
          }
        </div>
      </div>
    );
  }
}

OfferingList.propTypes = {
  offerings: PropTypes.array.isRequired,
  selectable: PropTypes.bool,
  onSelect: PropTypes.func,
  withPermissions: PropTypes.bool,
  actions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.node
  ])
};

export default OfferingList;
