import React from "react";
import {BackButton} from "./Misc";
import Path from "path";
import {inject, observer} from "mobx-react";
import AsyncComponent from "./AsyncComponent";
import {LabelledField} from "elv-components-js";

@inject("rootStore")
@observer
class Asset extends React.Component {
  constructor(props) {
    super(props);

    this.Content = this.Content.bind(this);
  }

  Title() {
    return this.props.rootStore.allTitles[this.props.match.params.objectId];
  }

  Asset() {
    return this.Title().metadata.assets[this.props.match.params.assetKey];
  }

  Content() {
    const backPath =
      (new URLSearchParams(this.props.location.search || "")).get("backPath") ||
      `${Path.dirname(Path.dirname(this.props.location.pathname))}?tab=assets`;

    return (
      <div>
        <header>
          <BackButton to={backPath} />
          <h1>{ this.Title().title } | { this.Asset().attachment_file_name }</h1>
        </header>

        <div className="asset-info">
          {
            Object.keys(this.Asset()).sort().map(key =>
              key === "assetKey" ? null :
                <LabelledField
                  key={`asset-field-${key}`}
                  label={key}
                  value={
                    typeof this.Asset()[key] === "object" ?
                      JSON.stringify(this.Asset()[key], null, 2) :
                      this.Asset()[key]
                  }
                />
            )
          }
        </div>
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

export default Asset;
