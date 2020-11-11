import {observable, action, flow} from "mobx";
import URI from "urijs";

class ContentStore {
  @observable libraries = [];
  @observable objectLists = {};
  @observable objects = {};
  @observable versions = {};

  @observable objectsPerPage = 100;
  @observable objectPaginationInfo = {};

  @observable files = {};
  @observable baseFileUrls = {};
  @observable mimeTypes = {};
  @observable playoutOptions = {};

  @observable sitePaginationInfo = {items: 0, limit: 10};
  @observable siteTitles = [];

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  @action.bound
  LoadSiteTitles = flow(function * ({siteId, page=1, perPage=100, filter=""}) {
    const site = this.rootStore.sites.find(site => site.objectId === siteId);

    if(!site) { throw Error("Site not found"); }

    const client = this.rootStore.client;

    const initialNodes = yield client.Nodes();
    try {
      yield client.SetNodes({
        fabricURIs: EluvioConfiguration.searchNodes.map(node => URI(node).protocol("https").toString().replace("///", "//"))
      });

      const startIndex = (page - 1) * perPage;
      const {pagination, results} = yield client.LinkData({
        libraryId: site.libraryId,
        objectId: site.objectId,
        linkPath: "public/search",
        queryParams: {
          select: ["public/asset_metadata/title", "public/asset_metadata/display_title"],
          terms: `(f_asset_type:primary${filter ? ` AND f_display_title:${encodeURIComponent(filter)}`: ""})`,
          start: startIndex,
          limit: this.objectsPerPage
        }
      });

      if(!pagination) {
        throw Error("Search not available");
      }

      this.sitePaginationInfo = {
        items: pagination.total,
        limit: this.objectsPerPage
      };

      this.siteTitles = results.map(title => ({
        name: this.rootStore.SafeTraverse(title, "meta/public/asset_metadata/title") || this.rootStore.SafeTraverse(title, "meta/public/asset_metadata/display_title"),
        id: title.id
      }));
    } finally {
      yield client.SetNodes(initialNodes);
    }
  });

  @action.bound
  LoadLibraries = flow(function * () {
    if(this.libraries.length > 0) { return; }

    const libraryIds = yield this.rootStore.client.ContentLibraries();

    let libraries = [];
    yield this.rootStore.client.utils.LimitedMap(
      5,
      libraryIds,
      async libraryId => {
        const metadata = await this.rootStore.client.ContentObjectMetadata({
          libraryId,
          objectId: libraryId.replace("ilib", "iq__")
        });

        const name = (metadata.public ? metadata.public.name : metadata.name) || metadata.name || libraryId || "";
        libraries.push({
          id: libraryId,
          libraryId,
          name,
          sortKey: name.startsWith("ilib") ? `zz${name.toLowerCase()}` : name.toLowerCase()
        });
      }
    );

    this.libraries = libraries.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
  });

  @action.bound
  LoadObjects = flow(function * ({libraryId, page=1, filter=""}) {
    const limit = this.objectsPerPage;
    const start = (page - 1) * limit;

    const results = (
      yield this.rootStore.client.ContentObjects({
        libraryId,
        filterOptions: {
          filter: !filter ? undefined : {
            key: "public/asset_metadata/title",
            type: "cnt",
            filter
          },
          select: [
            "public/name",
            "public/description",
            "public/asset_metadata/title",
            "public/asset_metadata/display_title",
            "public/asset_metadata/asset_type",
            "public/asset_metadata/title_type",
            "public/asset_metadata/info/status"
          ],
          sort: "public/asset_metadata/title",
          start,
          limit
        }
      })
    ) || {};

    let objects = [];
    yield this.rootStore.client.utils.LimitedMap(
      5,
      (results.contents || []),
      async ({id, versions}) => {
        const metadata = versions[0].meta || {};
        metadata.public = metadata.public || {};

        // TODO: Temporary - Remove when content is fixed
        if((metadata.public.name || "").toLowerCase().startsWith("z_old")) {
          return;
        }

        metadata.public.asset_metadata = metadata.public.asset_metadata || {};
        metadata.public.asset_metadata = {
          ...(metadata.asset_metadata || {}),
          ...metadata.public.asset_metadata
        };

        let name =
          metadata.public.asset_metadata.title ||
          metadata.public.asset_metadata.displayTitle ||
          metadata.public.name ||
          metadata.name ||
          "";

        const status = (metadata.public.asset_metadata.info || {}).status;
        if(status) {
          name = `${name} (${status})`;
        }

        objects.push({
          id,
          objectId: id,
          name,
          objectName: metadata.public.name,
          objectDescription: metadata.public.description,
          assetType: metadata.public.asset_metadata.asset_type,
          titleType: metadata.public.asset_metadata.title_type,
          sortKey: name.startsWith("iq__") ? `zz${name}` : name
        });
      }
    );

    this.objects[libraryId] = objects.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
    this.objectPaginationInfo[libraryId] = results.paging;
  });

  @action.bound
  LoadVersions = flow(function * (libraryId, objectId) {
    if(this.versions[objectId]) { return; }

    const versions = (yield this.rootStore.client.ContentObjectVersions({libraryId, objectId})).versions || [];

    this.versions[objectId] = versions.map(({hash}) => ({
      id: hash,
      versionHash: hash,
      name: hash
    }));
  });

  @action.bound
  LoadFiles = flow(function * (versionHash) {
    if(this.files[versionHash]) { return; }

    this.files[versionHash] = (yield this.rootStore.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "files"
    })) || {};

    this.mimeTypes[versionHash] = (yield this.rootStore.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "mime_types"
    })) || {};

    this.LoadBaseFileUrl(versionHash);
  });

  @action.bound
  LoadBaseFileUrl = flow(function * (versionHash) {
    if(this.baseFileUrls[versionHash]) { return; }

    this.baseFileUrls[versionHash] = (yield this.rootStore.client.FileUrl({
      versionHash,
      filePath: "/"
    }));
  });

  @action.bound
  LoadPlayoutOptions = flow(function * ({objectId, versionHash}) {
    if(!versionHash) {
      versionHash = yield this.rootStore.client.LatestVersionHash({objectId});
    }

    if(!this.playoutOptions[versionHash]) {
      this.playoutOptions[versionHash] = (yield this.rootStore.client.PlayoutOptions({
        versionHash,
        linkPath: "public/asset_metadata/sources/default",
        protocols: ["hls"],
        drms: ["aes-128"]
      }));
    }

    return versionHash;
  });
}

export default ContentStore;
