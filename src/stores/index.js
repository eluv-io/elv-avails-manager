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

  @observable profiles = [
    "default",
    "special-partners"
  ];

  @observable titleProfiles = {};

  @observable allTitles = {
    "iq__31pCbDS1fCHErd1nrCx2uHe5SHZE": {
      "libraryId": "ilib3691LecDh9yNyqKHpwXtmej8kS4v",
      "objectId": "iq__31pCbDS1fCHErd1nrCx2uHe5SHZE",
      "title": "21 Jump Street",
      "metadata": {
        "public": {
          "asset_metadata": {
            "display_title": "21 Jump Street",
            "title": "21 Jump Street"
          },
          "name": "21JUMPST - 21 Jump Street Mezzanine"
        }
      }
    },
    "iq__3F1F2bucfGaFraL3zAgUaBXsSCh2": {
      "libraryId": "ilib3691LecDh9yNyqKHpwXtmej8kS4v",
      "objectId": "iq__3F1F2bucfGaFraL3zAgUaBXsSCh2",
      "title": "8 Heads In A Duffel Bag",
      "metadata": {
        "public": {
          "asset_metadata": {
            "display_title": "8 Heads In A Duffel Bag",
            "title": "8 Heads In A Duffel Bag"
          },
          "name": "EIGHTHEA - 8 Heads In A Duffel Bag Mezzanine"
        }
      }
    },
    "iq__3F2aJD1xNzz72zsaAF4PzVKh9s9y": {
      "libraryId": "ilib3691LecDh9yNyqKHpwXtmej8kS4v",
      "objectId": "iq__3F2aJD1xNzz72zsaAF4PzVKh9s9y",
      "title": "Black Caesar",
      "metadata": {
        "public": {
          "asset_metadata": {
            "display_title": "Black Caesar",
            "title": "Black Caesar"
          },
          "name": "BLACKCAE MEZ - Black Caesar"
        }
      }
    }
  };

  @computed get titles() {
    return Object.values(this.allTitles)
      .sort((a, b) => a.title < b.title ? -1 : 1);
  }

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

    if(!this.titleProfiles[objectId]) {
      this.titleProfiles[objectId] = {};
    }

    this.profiles.forEach(profile => {
      if(this.titleProfiles[objectId][profile]) { return; }

      this.titleProfiles[objectId][profile] = {
        title: "full-access",
        assets: "full-access",
        offerings: "full-access",
        assetsDefault: "no-access",
        offeringsDefault: "no-access",
        assetPermissions: [],
        offeringPermissions: []
      };
    });
  });

  @action.bound
  SetTitleProfileAccess(objectId, profile, key, value) {
    this.titleProfiles[objectId][profile][key] = value;
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

