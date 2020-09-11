import {configure, observable, action, computed, flow} from "mobx";

import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import ContentStore from "./Content";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable initialized = false;
  @observable tab = "users";

  // Profile permissions
  @observable titleProfiles = {};

  // User/Group permissions
  @observable titlePermissions = {};

  // Titles and groups with permissions
  @observable allTitles = {};
  @observable allGroups = {};

  @observable groupList = [];
  @observable groupCache = {};
  @observable totalGroups = 0;

  @computed get titles() {
    return Object.values(this.allTitles)
      .sort((a, b) => a.title < b.title ? -1 : 1);
  }

  groupTitleIds = (groupAddress) => {
    return Object.keys(this.titlePermissions || {})
      .filter(objectId => this.titlePermissions[objectId][groupAddress]);
  };

  groupTitles = (groupAddress) => {
    const groupTitleIds = new Set(this.groupTitleIds(groupAddress));
    return Object.values(this.allTitles)
      .filter(title => groupTitleIds.has(title.objectId))
      .sort((a, b) => a.title < b.title ? -1 : 1);
  };

  groupTitlePermissions = (groupAddress) => {
    return this.groupTitleIds(groupAddress).map(id => ({
      objectId: id,
      name: this.allTitles[id].metadata.public.name,
      ...this.titlePermissions[id][groupAddress]
    }));
  };



  SafeTraverse = (object, path) => {
    let keys = path.split("/");

    if(keys.length === 1 && Array.isArray(keys[0])) {
      keys = keys[0];
    }

    let result = object;

    for(let i = 0; i < keys.length; i++){
      result = result[keys[i]];

      if(result === undefined) { return undefined; }
    }

    return result;
  };

  @action.bound
  AddTitle = flow(function * ({libraryId, objectId}) {
    if(!libraryId) {
      libraryId = yield this.client.ContentObjectLibraryId({objectId});
    }

    let metadata = (yield this.client.ContentObjectMetadata({
      libraryId,
      objectId,
      select: [
        "public/name",
        "public/asset_metadata/title",
        "public/asset_metadata/display_title",
        "public/asset_metadata/title"
      ]
    })) || {};

    metadata = {public: {asset_metadata: {title: objectId}}, ...metadata};

    this.allTitles[objectId] = {
      libraryId,
      objectId,
      title: this.SafeTraverse(metadata, "public/asset_metadata/display_title") || this.SafeTraverse(metadata, "public/asset_metadata/title"),
      metadata
    };

    if(!this.titleProfiles[objectId]) {
      this.titleProfiles[objectId] = {
        default: {
          assets: "full-access",
          offerings: "full-access",
          offeringsDefault: "full-access",
          assetsDefault: "full-access",
          assetPermissions: [],
          offeringPermissions: []
        },
        "pre-release": {
          assets: "no-access",
          offerings: "no-access",
          offeringsDefault: "no-access",
          assetsDefault: "no-access",
          assetPermissions: [],
          offeringPermissions: []
        },
        "servicing": {
          assets: "no-access",
          offerings: "no-access",
          offeringsDefault: "no-access",
          assetsDefault: "no-access",
          assetPermissions: [],
          offeringPermissions: []
        },
        "all-access": {
          assets: "full-access",
          offerings: "full-access",
          offeringsDefault: "full-access",
          assetsDefault: "full-access",
          assetPermissions: [],
          offeringPermissions: []
        }
      };
    }

    return this.allTitles[objectId];
  });

  @action.bound
  LoadFullTitle = flow(function * ({objectId}) {
    let currentTitle = this.allTitles[objectId];

    if(!currentTitle) {
      currentTitle = yield this.AddTitle({objectId});
    }

    let metadata = (yield this.client.ContentObjectMetadata({
      libraryId: currentTitle.libraryId,
      objectId,
      select: [
        "offerings",
        "assets",
        "public/asset_metadata/sources",
        "public/asset_metadata/ip_title_id",
        "public/asset_metadata/synopsis",
        "public/asset_metadata/info/synopsis"
      ]
    })) || {};

    metadata = {public: {asset_metadata: {title: objectId}}, ...metadata};

    if(metadata.assets) {
      Object.keys(metadata.assets).forEach(key => metadata.assets[key].assetKey = key);
      this.allTitles[objectId].assets = Object.values(metadata.assets);
    } else {
      this.allTitles[objectId].assets = [];
    }

    if(metadata.offerings) {
      this.allTitles[objectId].offerings = Object.keys(metadata.offerings).map(offeringKey => {
        const offering = metadata.offerings[offeringKey];
        return {
          offeringKey,
          playoutFormats: offering.playout ? Object.keys(offering.playout.playout_formats || {}).join(", ") : "",
          simpleWatermark: offering.simple_watermark,
          imageWatermark: offering.image_watermark
        };
      });
    } else {
      this.allTitles[objectId].offerings = [];
    }

    this.allTitles[objectId].metadata = {
      ...currentTitle.metadata,
      ...metadata,
      public: {
        ...currentTitle.metadata.public,
        ...metadata.public,
        asset_metadata: {
          ...currentTitle.metadata.public.asset_metadata,
          ...metadata.public.asset_metadata
        }
      }
    };

    this.allTitles[objectId].baseUrl = yield this.client.FabricUrl({
      libraryId: currentTitle.libraryId,
      objectId
    });

    const permission = yield this.client.Permission({objectId});
    this.allTitles[objectId].permission = this.client.permissionLevels[permission].short;
  });

  @action.bound
  AddTitleProfile(objectId, name) {
    if(this.titleProfiles[objectId][name]) { return; }

    this.titleProfiles[objectId][name] = {
      assets: "full-access",
      offerings: "full-access",
      offeringsDefault: "full-access",
      assetsDefault: "full-access",
      assetPermissions: [],
      offeringPermissions: []
    };
  }

  @action.bound
  RemoveTitleProfile(objectId, name) {
    delete this.titleProfiles[objectId][name];
  }

  @action.bound
  SetTitleProfileAccess(objectId, profile, key, value) {
    this.titleProfiles[objectId][profile][key] = value;
  }

  @action.bound
  SetTitlePermissionAccess(objectId, address, key, value) {
    this.titlePermissions[objectId][address][key] = value;
  }

  GroupInfo = flow(function * (address) {
    if(!this.groupCache[address]) {
      const metadata = yield this.client.ContentObjectMetadata({
        libraryId: (yield this.client.ContentSpaceId()).replace(/^ispc/, "ilib"),
        objectId: this.client.utils.AddressToObjectId(address),
        metadataSubtree: "public",
        select: [
          "name",
          "description"
        ]
      });

      this.groupCache[address] = {
        address,
        name: metadata.name || address,
        description: metadata.description || ""
      };
    }

    return this.groupCache[address];
  });

  @action.bound
  LoadGroup = flow(function * (address) {
    this.allGroups[address] = yield this.GroupInfo(address);
  });

  @action.bound
  LoadGroups = flow(function * ({page=1, perPage=10, filter=""}) {
    const startIndex = (page - 1) * perPage;
    const groupAddresses = (yield this.client.Collection({collectionType: "accessGroups"}));

    this.totalGroups = groupAddresses.length;

    this.groupList = (
      yield this.client.utils.LimitedMap(
        10,
        groupAddresses,
        async address => {
          address = this.client.utils.FormatAddress(address);

          return this.GroupInfo(address);
        }
      )
    )
      .filter(group => !filter || group.name.toLowerCase().includes(filter.toLowerCase()) || group.address.includes(filter.toLowerCase()))
      .sort((a, b) => a.name < b.name ? -1 : 1)
      .slice(startIndex, startIndex + perPage);
  });

  @action.bound
  InitializeGroupTitlePermission(groupAddress, objectId) {
    if(!this.titlePermissions[objectId]) {
      this.titlePermissions[objectId] = {};
    }

    if(!this.titlePermissions[objectId][groupAddress]) {
      this.titlePermissions[objectId][groupAddress] = {
        profile: "default",
        startTime: undefined,
        endTime: undefined
      };
    }
  }

  constructor() {
    this.contentStore = new ContentStore(this);
  }

  @action.bound
  // eslint-disable-next-line require-yield
  InitializeClient = flow(function * () {
    this.client = new FrameClient({
      target: window.parent,
      timeout: 30
    });
  });

  @action.bound
  SetTab(tab) {
    this.tab = tab;
  }
}

export const rootStore = new RootStore();
export const contentStore = rootStore.contentStore;

