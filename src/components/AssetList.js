import React from "react";
import {Action, ImageIcon, LabelledField, PreviewIcon} from "elv-components-js";
import PropTypes from "prop-types";
import UrlJoin from "url-join";
import PictureIcon from "../static/icons/image.svg";
import FileIcon from "../static/icons/file.svg";
import {Link, withRouter} from "react-router-dom";
import PrettyBytes from "pretty-bytes";
import {ChangeSort, FormatDate, SortableHeader} from "./Misc";

@withRouter
class AssetList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: "",
      show: false,
      sortKey: "attachment_file_name",
      sortAsc: true,
      selected: []
    };

    this.AssetEntry = this.AssetEntry.bind(this);
    this.SelectAsset = this.SelectAsset.bind(this);

    this.SortableHeader = SortableHeader.bind(this);
    this.ChangeSort = ChangeSort.bind(this);
  }

  SelectAsset(asset) {
    const isSelected = this.state.selected.find(entry => entry.assetKey === asset.assetKey);

    if(isSelected) {
      this.setState({
        selected: this.state.selected.filter(entry => entry.assetKey !== asset.assetKey)
      }, () => this.props.onSelect(this.state.selected));
    } else {
      this.setState({
        selected: [...this.state.selected, asset]
      }, () => this.props.onSelect(this.state.selected));
    }
  }

  AssetEntry(asset, index) {
    const Icon = asset => {
      if(asset.asset_type === "Image") {
        if(["bmp", "jpg", "jpeg", "png", "gif", "webp"].includes((asset.attachment_content_type || "").toLowerCase().replace("image/", ""))) {
          return (
            <PreviewIcon
              imagePath={UrlJoin("meta", "assets", asset.assetKey, "file")}
              baseFileUrl={this.props.baseUrl}
              icon={PictureIcon}
              height={500}
            />
          );
        } else {
          return <ImageIcon icon={PictureIcon} title="Image" />;
        }
      } else {
        return <ImageIcon icon={FileIcon} title="File" />;
      }
    };

    if(!this.props.selectable) {
      return (
        <Link
          key={`asset-entry-${asset.assetKey}`}
          to={`${UrlJoin(this.props.location.pathname, "assets", asset.assetKey)}?backPath=${this.props.backPath || ""}`}
          className={`list-entry assets-list-entry ${index % 2 === 0 ? "even" : "odd"} ${this.props.withPermissions ? "assets-list-entry-with-permissions" : ""}`}
        >
          <div className="list-entry-icon-cell">
            { Icon(asset) }
          </div>
          <div>{ asset.assetTitle }</div>
          <div>{ asset.asset_type }</div>
          <div>{ PrettyBytes(asset.attachment_file_size) }</div>
          { this.props.withPermissions ? <div>{asset.permission === "full-access" ? "Full Access" : "No Access"} </div> : null }
          { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.startTime)} </div> : null }
          { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.endTime)} </div> : null }
        </Link>
      );
    }

    const isSelected = this.state.selected.find(entry => entry.assetKey === asset.assetKey);
    return (
      <div
        tabIndex={0}
        key={`asset-entry-${asset.assetKey}`}
        onClick={() => this.SelectAsset(asset)}
        className={`list-entry list-entry-selectable assets-list-entry ${index % 2 === 0 ? "even" : "odd"} ${isSelected ? "selected" : ""} ${this.props.withPermissions ? "assets-list-entry-with-permissions" : ""}`}
      >
        <div className="list-entry-icon-cell">
          { Icon(asset) }
        </div>
        <div>{ asset.assetTitle }</div>
        <div>{ asset.asset_type }</div>
        <div>{ PrettyBytes(asset.attachment_file_size) }</div>
        { this.props.withPermissions ? <div>{asset.permission === "full-access" ? "Full Access" : "No Access"} </div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.startTime)} </div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.endTime)} </div> : null }
      </div>
    );
  }

  render() {
    const assets = this.props.assets
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1))
      .filter(({attachment_file_name, asset_type}) =>
        !this.state.filter ||
        ((attachment_file_name || "").toLowerCase().includes(this.state.filter.toLowerCase())
          || (asset_type || "").toLowerCase().includes(this.state.filter.toLowerCase()))
      );

    const SelectAll = () => {
      this.setState({
        selected: this.props.assets
      }, () => this.props.onSelect(this.state.selected));
    };

    const Clear = () => {
      this.setState({
        selected: []
      }, () => this.props.onSelect(this.state.selected));
    };

    return (
      <div className="assets-list">
        <div className="controls">
          { this.props.actions }
          { this.props.assets.length > 0 && this.props.selectable ? <Action className="secondary" onClick={SelectAll}>Select All</Action> : null }
          { this.state.selected.length > 0 && this.props.selectable ? <Action className="secondary" onClick={Clear}>Clear Selected</Action> : null }
          <input className="filter" name="filter" value={this.state.filter} onChange={event => this.setState({filter: event.target.value})} placeholder="Filter Assets..."/>
        </div>
        <div className="title-view">
          <LabelledField label="Assets" value={assets.length} />
        </div>
        <div className="list">
          <div className={`list-entry assets-list-entry list-header assets-list-header ${this.props.withPermissions ? "assets-list-entry-with-permissions" : ""}`}>
            <div className="list-entry-icon-cell"/>
            { this.SortableHeader("assetTitle", "Title") }
            { this.SortableHeader("asset_type", "Type") }
            { this.SortableHeader("attachment_file_size", "Size") }
            { this.props.withPermissions ? this.SortableHeader("permission", "Permission") : null }
            { this.props.withPermissions ? this.SortableHeader("startTime", "Start Time") : null }
            { this.props.withPermissions ? this.SortableHeader("endTime", "End Time") : null }
          </div>
          { assets.map(this.AssetEntry) }
        </div>
      </div>
    );
  }
}

AssetList.propTypes = {
  assets: PropTypes.array.isRequired,
  baseUrl: PropTypes.string.isRequired,
  selectable: PropTypes.bool,
  onSelect: PropTypes.func,
  backPath: PropTypes.string,
  withPermissions: PropTypes.bool,
  actions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.node
  ])
};

export default AssetList;
