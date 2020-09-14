import {configure, observable, action, computed, flow} from "mobx";
import {DateTime} from "luxon";

import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import ContentStore from "./Content";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable libraryId;
  @observable objectId;
  @observable versionHash;

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
  AddTitle = flow(function * ({libraryId, objectId, defaultProfiles=true}) {
    if(this.allTitles[objectId]) { return; }

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
      if(defaultProfiles) {
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
      } else {
        this.titleProfiles[objectId] = {};
      }
    }

    return this.allTitles[objectId];
  });

  @action.bound
  LoadFullTitle = flow(function * ({objectId, defaultProfiles=true}) {
    let currentTitle = this.allTitles[objectId];

    if(!currentTitle) {
      currentTitle = yield this.AddTitle({objectId, defaultProfiles});
    } else if(currentTitle.fullyLoaded) {
      // Already loaded
      return;
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

    this.allTitles[objectId].fullyLoaded = true;
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

    window.rootStore = this;
  }

  @action.bound
  // eslint-disable-next-line require-yield
  InitializeClient = flow(function * () {
    this.client = new FrameClient({
      target: window.parent,
      timeout: 30
    });

    let queryParams = window.location.search.split("?")[1];
    queryParams = queryParams.split("&");
    queryParams.forEach(param => {
      const [key, value] = param.split("=");
      this[key] = value;
    });

    if(!this.libraryId) {
      throw Error("Missing query parameter 'libraryId'");
    } else if(!this.objectId) {
      throw Error("Missing query parameter 'objectId'");
    } else if(!this.versionHash) {
      throw Error("Missing query parameter 'versionHash'");
    }

    yield this.Load();
  });

  @action.bound
  SetTab(tab) {
    this.tab = tab;
  }


  @action.bound
  Load = flow(function * () {
    const authSpec = yield this.client.ContentObjectMetadata({libraryId: this.libraryId, objectId: this.objectId, metadataSubtree: "auth_policy_spec"});

    if(!authSpec) { return; }

    yield this.client.utils.LimitedMap(
      10,
      Object.keys(authSpec),
      async titleId => {
        await this.LoadFullTitle({objectId: titleId, defaultProfiles: false});

        // Make asset map to look up assets
        let titleAssetMap = {};
        (this.allTitles[titleId].assets || []).forEach(asset => titleAssetMap[asset.assetKey] = asset);

        const profiles = Object.keys(authSpec[titleId].profiles);
        for(let i = 0; i < profiles.length; i++) {
          const profileName = profiles[i];
          const profile = authSpec[titleId].profiles[profileName];

          let loadedProfile = {};

          if(profile.start) { loadedProfile.startTime = DateTime.fromISO(profile.start).toMillis(); }
          if(profile.end) { loadedProfile.endTime = DateTime.fromISO(profile.end).toMillis(); }

          // Assets
          if(!profile.assets) {
            loadedProfile.assetsDefault = "no-access";
          } else {
            loadedProfile.assetsDefault = profile.assets.default_permission || "no-access";
            loadedProfile.assets = loadedProfile.assetsDefault;
            loadedProfile.assetPermissions = [];

            if(profile.assets.custom_permissions) {
              loadedProfile.assets = "custom";
              loadedProfile.assetPermissions = Object.keys(profile.assets.custom_permissions).map(assetKey => {
                const customPermission = profile.assets.custom_permissions[assetKey];

                let loadedPermission = titleAssetMap[assetKey] || {};
                loadedPermission.permission = customPermission.permission || "no-access";

                if(customPermission.start) { loadedPermission.startTime = DateTime.fromISO(customPermission.start).toMillis(); }
                if(customPermission.end) { loadedPermission.endTime = DateTime.fromISO(customPermission.end).toMillis(); }

                return loadedPermission;
              });
            }
          }

          // Offerings
          if(!profile.offerings) {
            loadedProfile.offeringsDefault = "no-access";
          } else {
            loadedProfile.offeringsDefault = profile.offerings.default_permission || "no-access";
            loadedProfile.offerings = loadedProfile.offeringsDefault;
            loadedProfile.offeringPermissions = [];

            if(profile.offerings.custom_permissions) {
              loadedProfile.offerings = "custom";
              loadedProfile.offeringPermissions = Object.keys(profile.offerings.custom_permissions).map(offeringKey => {
                const customPermission = profile.offerings.custom_permissions[offeringKey];

                let loadedPermission = this.allTitles[titleId].offerings.find(offering => offering.offeringKey === offeringKey) || {};
                loadedPermission.permission = customPermission.permission || "no-access";

                if(customPermission.start) { loadedPermission.startTime = DateTime.fromISO(customPermission.start).toMillis(); }
                if(customPermission.end) { loadedPermission.endTime = DateTime.fromISO(customPermission.end).toMillis(); }
                if(customPermission.geo) { loadedPermission.geoRestriction = customPermission.geo; }

                return loadedPermission;
              });
            }
          }

          this.titleProfiles[titleId][profileName] = loadedProfile;
        }

        /*
      default: {
          assets: "full-access",
            offerings: "full-access",
            offeringsDefault: "full-access",
            assetsDefault: "full-access",
            assetPermissions: [],
            offeringPermissions: []
        },

         */
      }
    );
  });

  @action.bound
  Save = flow(function * () {
    try {
      /*
      Profiles:
      "profiles": {
        "default": {
          "start": "2020-10-01",
          "end": "2020-12-31",
          "offerings": [
            "main",
            "low-res"
          ],
          "assets": {
            "default_permissions": "full-access",
            "custom_permissions": {
              "poster.jpg": {
                "start": "2020-10-01",
                "end": "2030-10-01"
              },
              "cast.pdf": {
                "start": "2020-10-01",
                "end": "2030-10-01"
              },
              "plot.pdf": "full-access"
            }
          }
        },
        "restricted": {
          "start": "2020-10-01",
          "end": "2020-12-31",
          "geo": "us",
          "offerings": [
            "low-res"
          ],
          "assets": {
            "default_permissions": "no-access"
          }
        },

            "default_permissions": "full-access",
            "custom_permissions": {
              "poster.jpg": {
                "start": "2020-10-01",
                "end": "2030-10-01"
                "permission": "no-access"
              },
              "cast.pdf": {
                "start": "2020-10-01",
                "end": "2030-10-01",
                "permission": "full-access"
              },
              "plot.pdf": {
                "permission": "no-access"
              }
            }


       Permissions:

       "permissions": [
          {
            "subjects": [
              "group1",
              "group2",
              "user1"
            ],
            "profile": "default"
          },
          {
            "subjects": [
              "group3"
            ],
            "profile": "restricted"
          }
        ]
       */

      let permissionSpec = {};
      Object.keys(this.titleProfiles).forEach(titleId => {
        permissionSpec[titleId] = {profiles: {}, permissions: []};

        Object.keys(this.titleProfiles[titleId]).forEach(profileName => {
          const profile = this.titleProfiles[titleId][profileName];

          let profileSpec = {};
          if(profile.startTime) {
            profileSpec.start = DateTime.fromMillis(profile.startTime).toISODate();
          }
          if(profile.endTime) {
            profileSpec.end = DateTime.fromMillis(profile.endTime).toISODate();
          }

          // Assets
          profileSpec.assets = {default_permission: profile.assets === "custom" ? profile.assetsDefault : profile.assets };
          if(profile.assetPermissions.length > 0) {
            profileSpec.assets.custom_permissions = {};
            profile.assetPermissions.forEach(asset => {
              let assetPermission = {permission: asset.permission};
              if(asset.startTime) {
                assetPermission.start = DateTime.fromMillis(asset.startTime).toISODate();
              }
              if(asset.endTime) {
                assetPermission.end = DateTime.fromMillis(asset.endTime).toISODate();
              }

              profileSpec.assets.custom_permissions[asset.assetKey] = assetPermission;
            });
          }

          // Offerings
          profileSpec.offerings = {default_permission: profile.offerings === "custom" ? profile.offeringsDefault : profile.offerings };
          if(profile.offeringPermissions.length > 0) {
            profileSpec.offerings.custom_permissions = {};
            profile.offeringPermissions.forEach(offering => {
              let offeringPermission = {permission: offering.permission};
              if(offering.startTime) {
                offeringPermission.start = DateTime.fromMillis(offering.startTime).toISODate();
              }
              if(offering.endTime) {
                offeringPermission.end = DateTime.fromMillis(offering.endTime).toISODate();
              }
              if(offering.geoRestriction) {
                offeringPermission.geo = offering.geoRestriction;
              }

              profileSpec.offerings.custom_permissions[offering.offeringKey] = offeringPermission;
            });
          }

          permissionSpec[titleId].profiles[profileName] = profileSpec;
        });
      });

      const {writeToken} = yield this.client.EditContentObject({libraryId: this.libraryId, objectId: this.objectId});

      yield this.client.ReplaceMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        metadataSubtree: "auth_policy_spec",
        metadata: permissionSpec
      });

      yield this.client.FinalizeContentObject({libraryId: this.libraryId, objectId: this.objectId, writeToken});
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
    }
  });
}

export const rootStore = new RootStore();
export const contentStore = rootStore.contentStore;

