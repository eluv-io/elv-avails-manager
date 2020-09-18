import "../static/stylesheets/content-browser.scss";

import React from "react";
import AsyncComponent from "./AsyncComponent";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {Action, IconButton, LoadingElement, Maybe, Tabs} from "elv-components-js";

import CloseIcon from "../static/icons/x-circle.svg";
import BackIcon from "../static/icons/directory_back.svg";

@observer
class BrowserList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 1,
      filter: "",
      version: 1,
      loading: false,
      selected: []
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

  Submit() {
    if(!this.props.multiple) { return; }

    return (
      <div className="actions-container">
        <Action onClick={async () => {
          if(this.state.loading) { return; }

          try {
            this.setState({loading: true});

            await this.props.Select(this.state.selected);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
          } finally {
            this.setState({loading: false});
          }
        }}
        >
          Submit
        </Action>
      </div>
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
        { this.Submit() }
        { this.Filter() }
        <AsyncComponent
          key={`browser-listing-version-${this.state.version}`}
          Load={() => this.props.Load({page: this.state.page, filter: this.state.filter})}
          render={() => (
            <LoadingElement loading={this.state.loading}>
              <div className="list scroll-list">
                {list.map(({id, name, objectName, objectDescription, assetType, titleType}, index) => {
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

                  const selected = this.state.selected.includes(id);

                  return (
                    <div
                      className={`list-entry list-entry-selectable browse-list-entry ${selected ? "selected" : ""} ${disabled ? "disabled" : ""} ${index % 2 === 0 ? "even" : "odd"}`}
                      key={`browse-entry-${id}`}
                      title={title}
                      onClick={async () => {
                        if(disabled) { return; }

                        this.setState({loading: true});
                        try {
                          if(this.props.multiple) {
                            if(!selected) {
                              this.setState({selected: this.state.selected.concat([id])});
                            } else {
                              this.setState({selected: this.state.selected.filter(otherId => otherId !== id)});
                            }
                          } else {
                            await this.props.Select(id);
                          }
                        } finally {
                          this.setState({loading: false});
                        }
                      }}
                    >
                      <div>{name}</div>
                      <div className="hint">{assetType}</div>
                    </div>
                  );
                })}
              </div>
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
  multiple: PropTypes.bool,
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
      error: "",
      siteIndex: undefined,
      tab: this.props.browseSite && this.props.rootStore.sites.length > 0 ? "site" : "all"
    };

    this.SelectObjects = this.SelectObjects.bind(this);
  }

  async SelectObjects(arg) {
    try {
      this.setState({error: ""});

      if(this.props.multiple) {
        await this.props.onComplete({
          libraryId: this.state.libraryId,
          objectIds: arg
        });
      } else {
        await this.props.onComplete({
          libraryId: this.state.libraryId,
          objectId: arg
        });
      }
    } catch (error) {
      this.setState({error: error.message || error});

      setTimeout(() => this.setState({error: ""}), 6000);
    }
  }

  Content() {
    if(!this.state.libraryId) {
      return (
        <React.Fragment>
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
    }

    const library = this.props.contentStore.libraries
      .find(({libraryId}) => libraryId === this.state.libraryId);

    let list = this.props.contentStore.objects[this.state.libraryId] || [];

    return (
      <React.Fragment>
        <div className="content-browser-actions">

        </div>
        <BrowserList
          key={`browser-list-${this.state.libraryId}`}
          header={library.name}
          list={list}
          paginated
          paginationInfo={this.props.contentStore.objectPaginationInfo[this.state.libraryId]}
          assetTypes={this.props.assetTypes}
          titleTypes={this.props.titleTypes}
          multiple={this.props.multiple}
          Load={async ({page, filter}) => await this.props.contentStore.LoadObjects({
            libraryId: this.state.libraryId,
            page,
            filter,
            assetTypes: this.props.assetTypes,
            titleTypes: this.props.titleTypes
          })}
          Select={this.SelectObjects}
        />
      </React.Fragment>
    );
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
          multiple={this.props.multiple}
          key={`site-browser-${this.state.siteIndex}`}
          header={"Select a Title"}
          Load={args => this.props.contentStore.LoadSiteTitles({siteId: this.props.rootStore.sites[this.state.siteIndex].objectId, ...args})}
          list={this.props.contentStore.siteTitles}
          paginated
          paginationInfo={this.props.contentStore.sitePaginationInfo}
          Select={this.SelectObjects}
        />
      );
    }
  }

  render() {
    return (
      <div className="content-browser">
        <h2 className="page-header">
          { this.state.libraryId ?
            <IconButton
              icon={BackIcon}
              className="back-button"
              onClick={() => this.setState({libraryId: undefined, selected: []})}
              label="Back"
            /> : null }
          {this.props.header}
        </h2>
        <IconButton
          icon={CloseIcon}
          className="close-button"
          label="Close"
        />
        {
          this.props.browseSite && this.props.rootStore.sites.length > 0 ?
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
  browseSite: PropTypes.bool,
  multiple: PropTypes.bool,
  header: PropTypes.string,
  assetTypes: PropTypes.arrayOf(PropTypes.string),
  titleTypes: PropTypes.arrayOf(PropTypes.string),
  playableOnly: PropTypes.bool,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ContentBrowser;
