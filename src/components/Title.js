import React from "react";
import Path from "path";
import {inject, observer} from "mobx-react";
import {BackButton} from "./Misc";
import AsyncComponent from "./AsyncComponent";
import {Action, LabelledField, Tabs} from "elv-components-js";
import AppFrame from "./AppFrame";
import TitleProfile from "./TitleProfile";
import AssetList from "./AssetList";

@inject("rootStore")
@observer
class Title extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showPreview: false,
      tab: (new URLSearchParams(this.props.location.search || "")).get("tab") || "title",
      sortKey: "attachment_file_name",
      sortAsc: true
    };

    this.Content = this.Content.bind(this);
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  Preview() {
    if(!this.Title().metadata.public.asset_metadata.sources) {
      return null;
    }

    const toggleButton = (
      <Action
        onClick={() => this.setState({showPreview: !this.state.showPreview})}
      >
        { this.state.showPreview ? "Hide Preview" : "Show Preview" }
      </Action>
    );

    return (
      <div className="title-preview">
        { toggleButton }
        {
          this.state.showPreview ?
            <AppFrame
              appUrl={EluvioConfiguration.apps["stream-sample"] || EluvioConfiguration.apps["Stream Sample"]}
              queryParams={{objectId: this.Title().objectId, action: "display"}}
              className="site-preview-frame"
            /> : null
        }
      </div>
    );
  }

  TitleView() {
    const title = this.Title();
    const assetMetadata = title.metadata.public.asset_metadata || {info: {}};

    return (
      <div className="title-view">
        <LabelledField label="Library ID" value={title.libraryId} />
        <LabelledField label="Object ID" value={title.objectId} />
        <LabelledField label="Permissions" value={title.permission} />
        <LabelledField label="IP Title ID" value={assetMetadata.ip_title_id} />
        <LabelledField label="Title" value={assetMetadata.title} />
        <LabelledField label="Display Title" value={assetMetadata.display_title} />
        <LabelledField label="Synopsis" value={(assetMetadata.info || {}).synopsis || assetMetadata.synopsis} />
        { this.Preview() }
      </div>
    );
  }

  Offerings() {
    const offerings = this.Title().metadata.offerings || {};

    return (
      <div className="list offerings-list">
        <div className="list-entry offerings-list-entry list-header offerings-list-header">
          <div>Offering</div>
          <div>Playout Formats</div>
          <div>Simple Watermark</div>
          <div>Image Watermark</div>
        </div>

        {
          Object.keys(offerings).sort().map((offeringKey, index) => {
            const offering = offerings[offeringKey];
            const formats = Object.keys(offering.playout.playout_formats || {}).join(", ");

            return (
              <div
                key={`offering-entry-${offeringKey}`}
                className={`list-entry offerings-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
              >
                <div>{ offeringKey }</div>
                <div title={formats}>{ formats }</div>
                <div title={offering.simple_watermark ? JSON.stringify(offering.simple_watermark || {}, null, 2) : null}>
                  { offering.simple_watermark ? "✓" : null }
                </div>
                <div title={offering.image_watermark ? JSON.stringify(offering.image_watermark || {}, null, 2) : null}>
                  { offering.image_watermark ? "✓" : null }
                </div>
              </div>
            );
          })}
      </div>
    );
  }

  Profiles() {
    return (
      <div className="title-profiles">
        {
          this.props.rootStore.profiles.map(profile =>
            <TitleProfile
              key={`title-profile-${this.Title().objectId}-${profile}`}
              objectId={this.Title().objectId}
              profile={profile}
            />
          )
        }
      </div>
    );
  }

  Content() {
    let content;
    switch (this.state.tab) {
      case "profiles":
        content = this.Profiles();
        break;
      case "title":
        content = this.TitleView();
        break;
      case "assets":
        content = <AssetList assets={this.Title().assets} baseUrl={this.Title().baseUrl} />;
        break;
      case "offerings":
        content = this.Offerings();
        break;
      default:
        content = null;
    }

    return (
      <div className="page-container">
        <header>
          <BackButton to={Path.dirname(this.props.location.pathname)} />
          <h1>{ this.Title().title }</h1>
        </header>

        <Tabs
          selected={this.state.tab}
          onChange={tab => this.setState({tab, showPreview: false})}
          options={[["Access Profiles", "profiles"], ["Title", "title"], ["Assets", "assets"], ["Offerings", "offerings"]]}
        />

        { content }
      </div>
    );
  }

  render() {
    return (
      <AsyncComponent
        Load={async () => {
          if(this.Title() && this.Title().metadata.assets) { return; }

          await this.props.rootStore.LoadFullTitle({objectId: this.props.match.params.objectId});
        }}
        render={this.Content}
      />
    );
  }
}

export default Title;
