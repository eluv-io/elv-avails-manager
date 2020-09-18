import "../static/stylesheets/content-browser.scss";

import React from "react";
import AsyncComponent from "./AsyncComponent";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {Action, LoadingElement, Maybe, Tabs} from "elv-components-js";

@observer
class BrowserList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 1,
      filter: "",
      version: 1,
      loading: false
    };
  }

  Pagination() {
    if(!this.props.paginated) { return null; }

    let pages = 1;
    if(this.props.paginationInfo) {
      const {items, limit} = this.props.paginationInfo;
      pages = Math.ceil(items / limit);
    }

    const ChangePage = (page) => {
      clearTimeout(this.pageChangeTimeout);

      this.setState({page});
      this.pageChangeTimeout = setTimeout(() => {
        this.setState({version: this.state.version + 1});
      }, 500);
    };

    return (
      <div className="browser-pagination">
        {Maybe(
          this.state.page > 1,
          <Action className="secondary prev-button" onClick={() => ChangePage(this.state.page - 1)}>
            Previous
          </Action>
        )}
        Page {this.state.page} of {Math.max(pages, 1)}
        {Maybe(
          this.state.page < pages,
          <Action className="secondary next-button" onClick={() => ChangePage(this.state.page + 1)}>
            Next
          </Action>
        )}
      </div>
    );
  }

  Filter() {
    return (
      <input
        name="filter"
        placeholder="Filter..."
        className="browser-filter"
        onChange={event => {
          this.setState({filter: event.target.value});

          if(this.props.paginated) {
            clearTimeout(this.filterTimeout);

            this.filterTimeout = setTimeout(async () => {
              this.setState({page: 1, version: this.state.version + 1});
            }, 1000);
          }
        }}
        value={this.state.filter}
      />
    );
  }

  render() {
    let list = this.props.list || [];
    if(!this.props.paginated) {
      list = list.filter(({name}) => name.toLowerCase().includes(this.state.filter.toLowerCase()));
    }

    return (
      <div className="browser-container">
        <h3>{this.props.header}</h3>
        <h4>{this.props.subHeader}</h4>
        { this.Pagination() }
        { this.Filter() }
        <AsyncComponent
          key={`browser-listing-version-${this.state.version}`}
          Load={() => this.props.Load({page: this.state.page, filter: this.state.filter})}
          render={() => (
            <LoadingElement loading={this.state.loading}>
              <ul className={`browser ${this.props.hashes ? "mono" : ""}`}>
                {list.map(({id, name, objectName, objectDescription, assetType, titleType}) => {
                  let disabled =
                    (this.props.assetTypes && !this.props.assetTypes.includes(assetType)) ||
                    (this.props.titleTypes && !this.props.titleTypes.includes(titleType));

                  let title = objectName ? `${objectName}\n\n${id}${objectDescription ? `\n\n${objectDescription}` : ""}` : id;
                  if(disabled) {
                    title = title + "\n\nTitle type or asset type not allowed for this list:";
                    title = title + `\n\tTitle Type: ${titleType || "<not specified>"}`;
                    title = title + `\n\tAllowed Title Types: ${(this.props.titleTypes || []).join(", ")}`;
                    title = title + `\n\tAsset Type: ${assetType || "<not specified>"}`;
                    title = title + `\n\tAllowed Asset Types: ${(this.props.assetTypes || []).join(", ")}`;
                  }

                  return (
                    <li key={`browse-entry-${id}`}>
                      <button
                        disabled={disabled}
                        title={title}
                        onClick={async () => {
                          this.setState({loading: true});
                          try {
                            await this.props.Select(id);
                          } finally {
                            this.setState({loading: false});
                          }
                        }}
                      >
                        <div>{name}</div>
                        {assetType ? <div className="hint">{assetType}</div> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </LoadingElement>
          )}
        />
      </div>
    );
  }
}

BrowserList.propTypes = {
  header: PropTypes.string.isRequired,
  subHeader: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  list: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
      ])
    })
  ),
  hashes: PropTypes.bool,
  assetTypes: PropTypes.arrayOf(PropTypes.string),
  titleTypes: PropTypes.arrayOf(PropTypes.string),
  Load: PropTypes.func.isRequired,
  Select: PropTypes.func.isRequired,
  paginated: PropTypes.bool,
  paginationInfo: PropTypes.object,
  totalItems: PropTypes.number
};

@inject("rootStore")
@inject("contentStore")
@observer
class ContentBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      libraryId: undefined,
      objectId: undefined,
      error: "",
      siteIndex: undefined,
      tab: this.props.site && this.props.rootStore.sites.length > 0 ? "site" : "all"
    };
  }

  Content() {
    if(!this.state.libraryId) {
      return (
        <React.Fragment>
          <div className="content-browser-actions">
            <Action
              className="back tertiary"
              onClick={this.props.onCancel}
            >
              Cancel
            </Action>
          </div>
          <BrowserList
            key="browser-list-libraries"
            header="Select a library"
            list={this.props.contentStore.libraries}
            Load={this.props.contentStore.LoadLibraries}
            Select={libraryId => this.setState({libraryId})}
            paginated={false}
          />
        </React.Fragment>
      );
    } else if(!this.state.objectId) {
      const library = this.props.contentStore.libraries
        .find(({libraryId}) => libraryId === this.state.libraryId);

      let list = this.props.contentStore.objects[this.state.libraryId] || [];

      return (
        <React.Fragment>
          <div className="content-browser-actions">
            <Action
              className="back secondary"
              onClick={() => this.setState({libraryId: undefined})}
            >
              Back
            </Action>
            <Action
              className="back tertiary"
              onClick={this.props.onCancel}
            >
              Cancel
            </Action>
          </div>
          <BrowserList
            key={`browser-list-${this.state.libraryId}`}
            header={library.name}
            list={list}
            paginated
            paginationInfo={this.props.contentStore.objectPaginationInfo[this.state.libraryId]}
            assetTypes={this.props.assetTypes}
            titleTypes={this.props.titleTypes}
            Load={async ({page, filter}) => await this.props.contentStore.LoadObjects({
              libraryId: this.state.libraryId,
              page,
              filter,
              assetTypes: this.props.assetTypes,
              titleTypes: this.props.titleTypes
            })}
            Select={async objectId => {
              if(this.props.objectOnly) {
                try {
                  this.setState({error: ""});

                  await this.props.onComplete({
                    libraryId: this.state.libraryId,
                    objectId
                  });
                } catch (error) {
                  this.setState({error: error.message || error});

                  setTimeout(() => this.setState({error: ""}), 6000);
                }
              } else {
                this.setState({objectId});
              }
            }}
          />
        </React.Fragment>
      );
    } else {
      const library = this.props.contentStore.libraries
        .find(({libraryId}) => libraryId === this.state.libraryId);
      const object = this.props.contentStore.objects[this.state.libraryId]
        .find(({objectId}) => objectId === this.state.objectId);

      return (
        <React.Fragment>
          <div className="content-browser-actions">
            <Action
              className="back secondary"
              onClick={() => this.setState({objectId: undefined})}
            >
              Back
            </Action>
            <Action
              className="back tertiary"
              onClick={this.props.onCancel}
            >
              Cancel
            </Action>
          </div>
          <BrowserList
            key={`browser-list-${this.state.objectId}`}
            header="Select a version"
            subHeader={<React.Fragment><div>{library.name}</div><div>{object.name}</div></React.Fragment>}
            list={this.props.contentStore.versions[this.state.objectId]}
            hashes={true}
            Load={async () => await this.props.contentStore.LoadVersions(this.state.libraryId, this.state.objectId)}
            Select={async versionHash => await this.props.onComplete({
              libraryId: this.state.libraryId,
              objectId: this.state.objectId,
              versionHash
            })}
            paginated={false}
          />
        </React.Fragment>
      );
    }
  }

  Site() {
    if(typeof this.state.siteIndex === "undefined") {
      return (
        <BrowserList
          key="site-browser"
          header="Select a Site"
          Load={() => {}}
          list={this.props.rootStore.sites.map((site, i) => ({name: site.name, id: i}))}
          Select={index => this.setState({siteIndex: index})}
        />
      );
    } else {
      return (
        <BrowserList
          key={`site-browser-${this.state.siteIndex}`}
          header={"Select a Title"}
          Load={args => this.props.contentStore.LoadSiteTitles({siteId: this.props.rootStore.sites[this.state.siteIndex].objectId, ...args})}
          list={this.props.contentStore.siteTitles}
          paginated
          paginationInfo={this.props.contentStore.sitePaginationInfo}
          Select={objectId => this.props.onComplete({objectId})}
        />
      );
    }
  }

  render() {
    return (
      <div className="content-browser">
        <h2>{this.props.header}</h2>
        {
          this.props.site && this.props.rootStore.sites.length > 0 ?
            <Tabs className="secondary" selected={this.state.tab} onChange={tab => this.setState({tab, siteIndex: undefined})} options={[["Site", "site"], ["All", "all"]]} /> :
            null
        }
        <div key={this.state.error} className="message error-message">{ this.state.error }</div>
        {
          this.state.tab === "all" ?
            this.Content() :
            this.Site()
        }
      </div>
    );
  }
}

ContentBrowser.propTypes = {
  site: PropTypes.bool,
  header: PropTypes.string,
  assetTypes: PropTypes.arrayOf(PropTypes.string),
  titleTypes: PropTypes.arrayOf(PropTypes.string),
  playableOnly: PropTypes.bool,
  objectOnly: PropTypes.bool,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ContentBrowser;
