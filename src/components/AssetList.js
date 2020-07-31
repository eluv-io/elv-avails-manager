import {DateTime} from "luxon";

import React from "react";
import {ImageIcon, PreviewIcon} from "elv-components-js";
import PropTypes from "prop-types";
import UrlJoin from "url-join";
import PictureIcon from "../static/icons/image.svg";
import FileIcon from "../static/icons/file.svg";
import {Link, withRouter} from "react-router-dom";
import PrettyBytes from "pretty-bytes";

@withRouter
class AssetList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      sortKey: "attachment_file_name",
      sortAsc: true,
      selected: []
    };

    this.AssetEntry = this.AssetEntry.bind(this);
    this.SelectAsset = this.SelectAsset.bind(this);
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

    const FormatDate = millis => millis ? DateTime.fromMillis(millis).toISO({suppressMilliseconds: true}) : "";

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
          <div>{ asset.attachment_file_name }</div>
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
        key={`asset-entry-${asset.assetKey}`}
        onClick={() => this.SelectAsset(asset)}
        className={`list-entry list-entry-selectable assets-list-entry ${index % 2 === 0 ? "even" : "odd"} ${isSelected ? "selected" : ""} ${this.props.withPermissions ? "assets-list-entry-with-permissions" : ""}`}
      >
        <div className="list-entry-icon-cell">
          { Icon(asset) }
        </div>
        <div>{ asset.attachment_file_name }</div>
        <div>{ asset.asset_type }</div>
        <div>{ PrettyBytes(asset.attachment_file_size) }</div>
        { this.props.withPermissions ? <div>{asset.permission === "full-access" ? "Full Access" : "No Access"} </div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.startTime)} </div> : null }
        { this.props.withPermissions ? <div className="date-field">{FormatDate(asset.endTime)} </div> : null }
      </div>
    );
  }

  render() {
    const ChangeSort = (key) => {
      if(this.state.sortKey === key) {
        this.setState({sortAsc: !this.state.sortAsc});
      } else {
        this.setState({sortKey: key, sortAsc: true});
      }
    };

    const SortableHeader = (key, label) =>
      <div
        onClick={() => ChangeSort(key)}
        className={`sortable-header ${key === this.state.sortKey ? "active" : ""} ${this.state.sortAsc ? "asc" : "desc"}`}
      >
        { label }
      </div>;


    const assets = this.props.assets
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <div className="list assets-list">
        <div className={`list-entry assets-list-entry list-header assets-list-header ${this.props.withPermissions ? "assets-list-entry-with-permissions" : ""}`}>
          <div className="list-entry-icon-cell"/>
          { SortableHeader("attachment_file_name", "Asset") }
          { SortableHeader("asset_type", "Type") }
          { SortableHeader("attachment_file_size", "Size") }
          { this.props.withPermissions ? SortableHeader("permission", "Permission") : null }
          { this.props.withPermissions ? SortableHeader("startTime", "Start Time") : null }
          { this.props.withPermissions ? SortableHeader("endTime", "End Time") : null }
        </div>

        {
          assets.map(this.AssetEntry)
        }
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
  withPermissions: PropTypes.bool
};

export default AssetList;
