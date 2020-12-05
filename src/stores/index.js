import {configure, observable, action, computed, flow, runInAction, toJS} from "mobx";
import {DateTime} from "luxon";
import URI from "urijs";
import {Buffer} from "buffer";
import {Settings} from "luxon";
import Trie from "trie-search";

import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import ContentStore from "./Content";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable appConfiguration;

  @observable tenantId;

  @observable libraryId;
  @observable objectId;
  @observable versionHash;
  @observable writeToken;

  @observable initialized = false;

  @observable message = {};

  @observable tab = "users";

  @observable timezone = DateTime.local().zoneName;

  @observable sites = [];

  // Profile permissions
  @observable titleProfiles = {};

  // User/Group permissions
  @observable titlePermissions = {};

  @observable titleOptions = {};

  // Things with permissions
  @observable allTitles = {};

  @observable allNTPInstances = {};

  @observable allGroups = {};
  @observable allUsers = {};
  @observable allOAuthGroups = {};

  @observable userList = [];
  @observable totalUsers = 0;

  @observable groupList = [];
  @observable totalGroups = 0;
  @observable groupCache = {};

  @observable oauthGroups;
  @observable oauthUsers;

  @observable totalGroups = 0;

  @observable oauthSettings = {
    domain: "",
    adminToken: ""
  };

  @computed get titles() {
    return Object.values(this.allTitles)
      .sort((a, b) => a.displayTitle < b.displayTitle ? -1 : 1);
  }

  @computed get titlesTrie() {
    const trie = new Trie();
    let titles = {};
    this.titles.forEach(title => titles[title.displayTitle] = title);

    trie.addFromObject(titles);

    return trie;
  }

  /* Various views on title permissions */

  @computed get titlePermissionMap() {
    let map = {};

    Object.keys(this.titlePermissions || {}).forEach(objectId =>
      Object.keys(this.titlePermissions[objectId]).forEach(address =>
        map[address] ? map[address].push(objectId) : map[address] = [objectId]
      )
    );

    return map;
  }

  targetTitleIds(address) {
    return this.titlePermissionMap[address] || [];
  }

  targetTitlePermissions(address) {
    return this.targetTitleIds(address).map(id => ({
      objectId: id,
      displayTitle: this.allTitles[id].displayTitle,
      displayTitleWithStatus: this.allTitles[id].displayTitleWithStatus,
      ...this.titlePermissions[id][address]
    }));
  }

  constructor() {
    this.contentStore = new ContentStore(this);

    window.rootStore = this;
  }

  @action.bound
  SetTimezone(zone) {
    Settings.defaultZoneName = zone;
    this.timezone = zone;
  }

  FormatType(type) {
    switch (type) {
      case "fabricUser":
        return "Fabric User";
      case "oauthUser":
        return "OAuth User";
      case "fabricGroup":
        return "Fabric Group";
      case "oauthGroup":
        return "OAuth Group";
      case "ntpInstance":
        return "NTP Instance";
      default:
        return "Unknown type";
    }
  }

  @action.bound
  SetError(error) {
    this.message = { error, key: Math.random() };
  }

  @action.bound
  SetMessage(message) {
    this.message = { message, key: Math.random() };
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
  SetTenantId(tenantId) {
    this.tenantId = tenantId;
  }

  @action.bound
  AddSite = flow(function * ({libraryId, objectId}) {
    const searchLink = (yield this.client.ContentObjectMetadata({libraryId, objectId, metadataSubtree: "public/search"}));

    if(!searchLink) {
      throw Error("Site must have search index");
    } else if(this.sites.find(site => site.objectId === objectId)) {
      return;
    }

    const name = (yield this.client.ContentObjectMetadata({libraryId, objectId, metadataSubtree: "public/name"})) || objectId;

    this.sites.push({
      libraryId,
      objectId,
      name
    });
  });

  @action.bound
  RemoveSite(objectId) {
    this.sites = this.sites.filter(site => site.objectId !== objectId);
  }

  DefaultProfiles() {
    if(this.appConfiguration && this.appConfiguration.profiles) {
      let profiles = {};
      Object.keys(this.appConfiguration.profiles).map(profileKey => {
        const profile = this.appConfiguration.profiles[profileKey];
        profiles[profileKey] = {
          assets: profile.assets_default || "full-access",
          assetsDefault: profile.assets_default || "full-access",
          offerings: profile.offerings_default || "full-access",
          offeringsDefault: profile.offerings_default || "full-access",
          assetPermissions: [],
          offeringPermissions: []
        };
      });

      return profiles;
    }

    // Default configuration
    return {
      default: {
        assets: "full-access",
        offerings: "full-access",
        offeringsDefault: "full-access",
        assetsDefault: "full-access",
        assetPermissions: [],
        offeringPermissions: []
      }
    };
  }

  async DisplayTitle({objectId}) {
    const metadata = (await this.client.ContentObjectMetadata({
      libraryId: await this.client.ContentObjectLibraryId({objectId}),
      objectId,
      select: [
        "public/name",
        "public/asset_metadata/info/status"
      ]
    })) || {};


    const displayTitle = this.SafeTraverse(metadata, "public/name");
    let displayTitleWithStatus = displayTitle;

    const status = this.SafeTraverse(metadata, "public/asset_metadata/info/status");
    if(status) {
      displayTitleWithStatus = `${displayTitle} (${status})`;
    }

    return { displayTitle, displayTitleWithStatus, status };
  }

  @action.bound
  AddTitle = flow(function * ({objectId, defaultProfiles=true, displayTitle}) {
    if(this.allTitles[objectId]) { return; }

    let displayTitleWithStatus = displayTitle;
    let status;
    if(!displayTitle) {
      const titleInfo = yield this.DisplayTitle({objectId});
      displayTitle = titleInfo.displayTitle;
      displayTitleWithStatus = titleInfo.displayTitleWithStatus;
      status = titleInfo.status;
    }

    this.allTitles[objectId] = {
      objectId,
      displayTitle: displayTitle || objectId,
      displayTitleWithStatus: displayTitleWithStatus || objectId,
      status,
      metadata: {public: {}}
    };

    if(!this.titleProfiles[objectId]) {
      if(defaultProfiles) {
        this.titleProfiles[objectId] = this.DefaultProfiles();
      } else {
        this.titleProfiles[objectId] = {};
      }
    }

    if(!this.titleOptions[objectId]) {
      this.titleOptions[objectId] = {
        active: true
      };
    }
  });

  @action.bound
  RemoveTitle(objectId) {
    delete this.allTitles[objectId];
    delete this.titlePermissions[objectId];
    delete this.titleProfiles[objectId];
    delete this.titleOptions[objectId];
  }

  @action.bound
  LoadFullTitle = flow(function * ({objectId, defaultProfiles=true}) {
    let currentTitle = this.allTitles[objectId];

    const libraryId = yield this.client.ContentObjectLibraryId({objectId});
    this.allTitles[objectId].libraryId = libraryId;

    if(!currentTitle) {
      currentTitle = this.AddTitle({objectId, defaultProfiles});
    } else if(currentTitle.fullyLoaded) {
      // Already loaded
      return;
    }

    let metadata = (yield this.client.ContentObjectMetadata({
      libraryId,
      objectId,
      select: [
        "offerings",
        "assets",
        "public/asset_metadata/title",
        "public/asset_metadata/display_title",
        "public/asset_metadata/sources",
        "public/asset_metadata/ip_title_id",
        "public/asset_metadata/synopsis",
        "public/asset_metadata/info/synopsis",
        "public/asset_metadata/info/status"
      ]
    })) || {};

    const { displayTitle, displayTitleWithStatus, status } = yield this.DisplayTitle({objectId});

    if(!metadata.public) { metadata.public = {}; }
    if(!metadata.public.asset_metadata) { metadata.public.asset_metadata = {}; }

    this.allTitles[objectId].displayTitle = displayTitle;
    this.allTitles[objectId].displayTitleWithStatus = displayTitleWithStatus;
    this.allTitles[objectId].status = status;

    if(metadata.assets) {
      Object.keys(metadata.assets).forEach(key => {
        metadata.assets[key].assetKey = key;
        const access = metadata.assets[key].access || metadata.assets[key].original_access;
        const status = access ? `(${access})` : "";
        metadata.assets[key].assetTitle = `${metadata.assets[key].title} ${status}`;
      });
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
      libraryId,
      objectId
    });

    const permission = yield this.client.Permission({objectId});
    this.allTitles[objectId].permission = this.client.permissionLevels[permission].short;

    Object.keys(this.titleProfiles[objectId] || {}).map(profileName => {
      if(this.titleProfiles[objectId][profileName].assets === "custom") {
        const titleAssets = this.allTitles[objectId].metadata.assets || {};

        this.titleProfiles[objectId][profileName].assetPermissions =
          this.titleProfiles[objectId][profileName].assetPermissions.map(assetPermission => ({
            ...(titleAssets[assetPermission.assetKey] || {}),
            ...assetPermission
          }));
      }

      if(this.titleProfiles[objectId][profileName].offerings === "custom") {
        const titleOfferings = this.allTitles[objectId].metadata.offerings || {};

        this.titleProfiles[objectId][profileName].offeringPermissions =
          this.titleProfiles[objectId][profileName].offeringPermissions.map(offeringPermission => ({
            ...(titleOfferings[offeringPermission.offeringKey] || {}),
            ...offeringPermission
          }));
      }
    });

    if(!this.titlePermissions[objectId]) {
      this.titlePermissions[objectId] = {};
    }

    this.allTitles[objectId].fullyLoaded = true;
  });

  @action.bound
  UpdateTitleOption(titleId, key, value) {
    this.titleOptions[titleId][key] = value;
  }

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

    Object.keys(this.titlePermissions[objectId]).forEach(address => {
      if(this.titlePermissions[objectId][address].profile === name) {
        delete this.titlePermissions[objectId][address];
      }
    });
  }

  @action.bound
  SetTitleProfileAccess(objectId, profile, key, value) {
    this.titleProfiles[objectId][profile][key] = value;
  }

  @action.bound
  SetTitlePermissionAccess(objectId, address, key, value) {
    this.titlePermissions[objectId][address][key] = value;
  }

  // Load information about a specific fabric group
  GroupInfo = flow(function * (address) {
    address = address.trim();

    if(!this.groupCache[address]) {
      // Store promise to avoid multiple redundant calls
      this.groupCache[address] = new Promise(async resolve => {
        try {
          const metadata = await this.client.ContentObjectMetadata({
            libraryId: (await this.client.ContentSpaceId()).replace(/^ispc/, "ilib"),
            objectId: this.client.utils.AddressToObjectId(address),
            metadataSubtree: "public",
            select: [
              "name",
              "description"
            ]
          });

          resolve({
            type: "fabricGroup",
            address,
            name: metadata.name || address,
            description: metadata.description || ""
          });
        } catch (error) {
          resolve({
            type: "fabricGroup",
            address,
            name: address,
            description: ""
          });
        }
      });
    }

    return yield this.groupCache[address];
  });

  // Retrieve OAuth user/group info

  OAuthUserInfo(id) {
    if(!this.oauthUsers) {
      throw Error("OAuth user info missing");
    }

    const user = this.oauthUsers[id];

    if(!user) {
      throw Error("Unable to find user " + id);
    }

    return user;
  }

  OAuthGroupInfo(id) {
    if(!this.oauthGroups) {
      throw Error("OAuth group info missing");
    }

    const group = this.oauthGroups[id];

    if(!group) {
      throw Error("Unable to find group " + id);
    }

    return group;
  }

  // Call wallet address to ensure user exists
  @action.bound
  ValidateUser = flow(function * (address) {
    try {
      if(yield this.client.userProfileClient.UserWalletAddress({address})) {
        return true;
      }

      throw Error("Invalid user address");
    } catch (error) {
      return false;
    }
  });

  // Add a new user/group to allUsers or allGroups

  @action.bound
  LoadUser(address, type, name) {
    address = address.trim();
    name = (name || "").trim();

    try {
      if(type === "fabricUser") {
        address = this.client.utils.FormatAddress(address);

        this.allUsers[address] = {
          type,
          name: name || address,
          address
        };
      } else {
        this.allUsers[address] = this.OAuthUserInfo(address);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load user:", address);
      // eslint-disable-next-line no-console
      console.error(error);

      this.allusers[address] = {
        type,
        address,
        name: name || address,
        description: ""
      };
    }
  }

  @action.bound
  LoadGroup = flow(function * (address, type, name) {
    address = address.trim();

    try {
      if(type === "fabricGroup") {
        this.allGroups[address] = yield this.GroupInfo(address);
      } else {
        this.allGroups[address] = this.OAuthGroupInfo(address);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load group:", address);
      // eslint-disable-next-line no-console
      console.error(error);
      this.allGroups[address] = {
        type,
        address,
        name: (name || address).trim(),
        description: ""
      };
    }
  });

  @action.bound
  LoadNTPInstance = flow(function * ({ntpId, name, tickets}) {
    try {
      ntpId = ntpId.trim();
      name = (name || (this.allNTPInstances[ntpId] || {}).name || "").trim();

      const ntpInfo = yield this.client.NTPInstance({tenantId: this.tenantId, ntpId});

      this.allNTPInstances[ntpId] = {
        ...ntpInfo,
        tickets: tickets || (this.allNTPInstances[ntpId] || {}).tickets || [],
        name: name.trim(),
        ntpId,
        address: ntpId,
        type: "ntpInstance",
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load NTP Instance:", ntpId);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });

  @action.bound
  CreateNTPInstance = flow(function * ({name, ticketLength, maxTickets, maxRedemptions, start, end, objectId, groupAddresses}) {
    const ntpId = yield this.client.CreateNTPInstance({
      tenantId: this.tenantId,
      name,
      objectId,
      groupAddresses,
      maxTickets,
      maxRedemptions,
      ticketLength,
      startTime: start,
      endTime: end
    });

    yield this.LoadNTPInstance({ntpId, name});

    yield this.SaveNTPInstances();

    return ntpId;
  });

  @action.bound
  EditNTPInstance = flow(function * ({ntpId, name, maxTickets, maxRedemptions, start, end}) {
    yield this.client.UpdateNTPInstance({
      tenantId: this.tenantId,
      ntpId,
      maxTickets,
      maxRedemptions,
      startTime: start,
      endTime: end
    });

    yield this.LoadNTPInstance({ntpId, name});

    yield this.SaveNTPInstances();
  });

  @action.bound
  DeleteNTPInstance = flow(function * ({ntpId}) {
    yield this.client.DeleteNTPInstance({
      tenantId: this.tenantId,
      ntpId,
    });

    yield this.SaveNTPInstances();
  });

  @action.bound
  IssueTickets = flow(function * ({ntpId, useEmails=false, count=1, emails="", callback}) {
    if(useEmails) {
      // Remove leading and trailing whitespace and commas and split to list
      emails = emails.trim().replace(/^,/, "").replace(/,$/, "").trim().split(",").map(email => email.trim());

      for(let i = 0; i < emails.length; i++) {
        if(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emails[i]))) {
          throw Error(`Invalid email: ${emails[i]}`);
        }
      }
    }

    const list = useEmails ? emails : [...Array(parseInt(count)).keys()];

    let tickets = [];
    let failures = [];
    let completed = 0;
    yield this.client.utils.LimitedMap(
      10,
      list,
      async (email) => {
        try {
          const {token, user_id} = await this.client.IssueNTPCode({
            tenantId: this.tenantId,
            ntpId,
            email: useEmails ? email : undefined
          });

          tickets.push({
            token,
            user_id,
            issued_at: Date.now()
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);

          failures.push({
            email,
            error
          });
        } finally {
          completed += 1;
          callback({completed, total: list.length});
        }
      }
    );

    this.allNTPInstances[ntpId].tickets = [
      ...(this.allNTPInstances[ntpId].tickets || []),
      ...tickets
    ];

    if(tickets.length > 0) {
      yield this.SaveNTPInstances();
    }

    yield this.LoadNTPInstance({ntpId});

    return {tickets, failures};
  });

  async SaveNTPInstances(infoOnly=false) {
    let ntpInstances = {};
    Object.keys(this.allNTPInstances || {})
      .forEach(ntpId => ntpInstances[ntpId] = {
        name: this.allNTPInstances[ntpId].name,
        tickets: toJS(this.allNTPInstances[ntpId].tickets || [])
      });

    if(infoOnly) {
      return ntpInstances;
    }

    await this.client.EditAndFinalizeContentObject({
      libraryId: this.libraryId,
      objectId: this.objectId,
      commitMessage: "Save NTP Information (Permissions Manager)",
      callback: async ({writeToken}) => {
        await this.client.ReplaceMetadata({
          libraryId: this.libraryId,
          objectId: this.objectId,
          writeToken,
          metadataSubtree: "auth_policy_settings/ntp_instances",
          metadata: ntpInstances
        });
      }
    });
  }

  // Page/Sort/Filter users and groups

  @action.bound
  LoadOAuthUsers({page=1, perPage=100, filter=""}) {
    const startIndex = (page - 1) * perPage;

    const users = Object.values(this.oauthUsers)
      .filter(user => !filter || user.name.toLowerCase().includes(filter.toLowerCase()) || user.address.includes(filter.toLowerCase()))
      .sort((a, b) => a.name < b.name ? -1 : 1);

    this.totalUsers = users.length;
    this.userList = users.slice(startIndex, startIndex + perPage);
  }

  @action.bound
  LoadGroups = flow(function * ({page=1, perPage=100, filter=""}) {
    const startIndex = (page - 1) * perPage;
    const groupAddresses = (yield this.client.Collection({collectionType: "accessGroups"})).sort();

    this.totalGroups = groupAddresses.length;

    const groups = (
      yield this.client.utils.LimitedMap(
        20,
        groupAddresses,
        async address => {
          address = this.client.utils.FormatAddress(address);

          return this.GroupInfo(address);
        }
      )
    )
      .filter(group => !filter || group.name.toLowerCase().includes(filter.toLowerCase()) || group.address.includes(filter.toLowerCase()))
      .sort((a, b) => a.name < b.name ? -1 : 1);

    this.totalGroups = groups.length;
    this.groupList = groups.slice(startIndex, startIndex + perPage);
  });

  @action.bound
  LoadOAuthGroups({page=1, perPage=100, filter=""}) {
    if(!this.oauthGroups) { return; }

    const startIndex = (page - 1) * perPage;

    const groups = Object.values(this.oauthGroups)
      .filter(group => !filter || group.name.toLowerCase().includes(filter.toLowerCase()) || group.address.includes(filter.toLowerCase()));

    this.totalGroups = groups.length;
    this.groupList = groups.slice(startIndex, startIndex + perPage);
  }

  @action.bound
  RemoveTarget(address) {
    delete this.allUsers[address];
    delete this.allGroups[address];
    delete this.allOAuthGroups[address];
    delete this.allNTPInstances[address];

    // Iterate through title permissions
    Object.keys(this.titlePermissions).forEach(objectId =>
      this.RemoveTitlePermission(objectId, address)
    );
  }

  @action.bound
  InitializeTitlePermission(address, objectId, type, name) {
    if(!this.titlePermissions[objectId]) {
      this.titlePermissions[objectId] = {};
    }

    if(!this.titlePermissions[objectId][address]) {
      const profiles = Object.keys(this.titleProfiles[objectId])
        .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
      const defaultProfile =
        profiles.find(profile => profile.toLowerCase() === "default" ? profile : undefined) || profiles[0];

      this.titlePermissions[objectId][address] = {
        type,
        name,
        profile: defaultProfile,
        startTime: undefined,
        endTime: undefined
      };
    }
  }

  @action.bound
  RemoveTitlePermission(objectId, address) {
    if(this.titlePermissions[objectId]) {
      delete this.titlePermissions[objectId][address];
    }
  }

  // Misc

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

    const oktaParameters = yield this.client.ContentObjectMetadata({
      libraryId: this.libraryId,
      objectId: this.objectId,
      metadataSubtree: "request_parameters"
    });

    if(oktaParameters) {
      try {
        this.oauthSettings.domain = URI(oktaParameters.url).origin();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to parse oauth domain");
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    const typeHash = (yield this.client.ContentObject({
      libraryId: this.libraryId,
      objectId: this.objectId
    })).type;

    if(typeHash) {
      const libraryId = (yield this.client.ContentSpaceId()).replace("ispc", "ilib");
      const objectId = this.client.utils.DecodeVersionHash(typeHash).objectId;

      this.appConfiguration = (yield this.client.ContentObjectMetadata({
        libraryId,
        objectId,
        metadataSubtree: "public/permissions_configuration"
      })) || {};
    }

    yield this.Load();
  });

  @action.bound
  SetTab(tab) {
    this.tab = tab;
  }

  @action.bound
  SetOAuthSetting(key, value) {
    this.oauthSettings[key] = value;
  }

  @action.bound
  async QueryOAuthAPI(path, params={}) {
    const url = `${this.oauthSettings.domain.trim()}/api/v1/\${API}`;

    const currentUrl = await this.client.ContentObjectMetadata({
      libraryId: this.libraryId,
      objectId: this.objectId,
      writeToken: this.writeToken,
      metadataSubtree: "request_parameters/url"
    });

    if(currentUrl !== url) {
      const writeToken = await this.WriteToken();
      await this.client.ReplaceMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        metadataSubtree: "request_parameters",
        metadata: {
          "headers": {
            "Accept": "application/json",
            "Authorization": "SSWS ${API_KEY}",
            "Content-Type": "application/json"
          },
          "method": "GET",
          "url": `${this.oauthSettings.domain}/api/v1/\${API}`
        },
      });
    }

    if(params) {
      path = `${path}?${Object.keys(params).map(key => `${key}=${params[key]}`).join("&")}`;
    }

    let proxyUrl = await this.client.FabricUrl({
      libraryId: this.libraryId,
      objectId: this.objectId,
      writeToken: this.writeToken,
      rep: "proxy",
      queryParams: {API_KEY: this.oauthSettings.adminToken, API: path}
    });

    const result = JSON.parse(atob((await (await fetch(proxyUrl)).json()).body));

    if(result.errorCode) {
      throw Error(result);
    }

    return result;
  }

  @action.bound
  SyncOAuth = flow(function * () {
    try {
      let groups = {};
      (yield this.QueryOAuthAPI("groups"))
        .map(group => {
          groups[group.id] = {
            type: "oauthGroup",
            address: group.id,
            name: group.profile.name || group.id,
            description: group.profile.description || ""
          };
        });

      let users = {};
      (yield this.QueryOAuthAPI("users"))
        .map(user => {
          users[user.id] = {
            type: "oauthUser",
            address: user.id,
            name: `${user.profile.firstName} ${user.profile.lastName} (${user.profile.email})`
          };
        });

      const writeToken = yield this.WriteToken();

      const oauthInfo = {users, groups};

      const existingPart = yield this.client.ContentObjectMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        metadataSubtree: "oauth_settings"
      });

      const partHash = (yield this.client.UploadPart({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        encryption: "cgck",
        data: Buffer.from(JSON.stringify(oauthInfo))
      })).part.hash;

      yield this.client.ReplaceMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        metadataSubtree: "oauth_settings",
        metadata: partHash
      });

      if(existingPart) {
        yield this.client.DeletePart({
          libraryId: this.libraryId,
          objectId: this.objectId,
          writeToken,
          partHash: existingPart
        });
      }

      yield this.Finalize("OAuth Sync");

      this.oauthGroups = groups;
      this.oauthUsers = users;

      this.SetMessage("Successfully synced with OAuth");
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.SetError("Failed to connect to OAuth");
      return false;
    }
  });

  @action.bound
  WriteToken = flow(function * () {
    if(!this.writeToken) {
      const {writeToken} = yield this.client.EditContentObject({libraryId: this.libraryId, objectId: this.objectId});

      this.writeToken = writeToken;
    }

    return this.writeToken;
  });

  @action.bound
  Finalize = flow(function * (commitMessage) {
    if(!this.writeToken) {
      throw Error("Write token not created");
    }

    const {hash} = yield this.client.FinalizeContentObject({
      libraryId: this.libraryId,
      objectId: this.objectId,
      writeToken: this.writeToken,
      commitMessage: commitMessage || "Permissions Manager"
    });

    this.versionHash = hash;
    this.writeToken = undefined;
  });

  @action.bound
  Load = flow(function * () {
    const params = {libraryId: this.libraryId, objectId: this.objectId};

    // OAuth users and groups and fabric users
    const oauthSyncHash = yield this.client.ContentObjectMetadata({...params, metadataSubtree: "oauth_settings"});

    if(oauthSyncHash) {
      let oauthSync = (yield this.client.DownloadPart({...params, partHash: oauthSyncHash, format: "text"}));
      oauthSync = JSON.parse(Buffer.from(oauthSync));

      // Convert from old format
      if(Array.isArray(oauthSync.users)) {
        let users = {};
        oauthSync.users.map(user => {
          users[user.address] = user;
        });

        oauthSync.users = users;
      }

      if(Array.isArray(oauthSync.groups)) {
        let groups = {};
        oauthSync.groups.map(group => {
          groups[group.address] = group;
        });

        oauthSync.groups = groups;
      }

      this.oauthUsers = oauthSync.users;
      this.oauthGroups = oauthSync.groups;
    }

    const settings = yield this.client.ContentObjectMetadata({...params, metadataSubtree: "auth_policy_settings"});

    if(settings) {
      this.sites = yield Promise.all(
        (settings.sites || []).map(async objectId => {
          const libraryId = await this.client.ContentObjectLibraryId({objectId});
          const name = (await this.client.ContentObjectMetadata({libraryId, objectId, metadataSubtree: "public/name"})) || objectId;

          return {
            libraryId,
            objectId,
            name
          };
        })
      );

      this.tenantId = settings.tenantId || "";
      yield Promise.all(
        Object.keys(settings.ntp_instances || {}).map(async ntpId => {
          await this.LoadNTPInstance({
            ntpId,
            ...settings.ntp_instances[ntpId]
          });
        })
      );
    }

    const authSpec = yield this.client.ContentObjectMetadata({...params, metadataSubtree: "auth_policy_spec"});

    if(!authSpec) { return; }

    yield this.client.utils.LimitedMap(
      20,
      Object.keys(authSpec),
      async titleId => {
        await this.AddTitle({objectId: titleId, defaultProfiles: false, displayTitle: authSpec[titleId].display_title});

        runInAction(() => {
          // Options
          this.titleOptions[titleId] = {
            active: typeof authSpec[titleId].active === "boolean" && !authSpec[titleId].active ? false : true
          };

          // Profiles
          const profiles = Object.keys(authSpec[titleId].profiles || {});
          for(let i = 0; i < profiles.length; i++) {
            const profileName = profiles[i];
            const profile = authSpec[titleId].profiles[profileName];

            let loadedProfile = {};

            if(profile.start) {
              loadedProfile.startTime = DateTime.fromISO(profile.start).toMillis();
            }
            if(profile.end) {
              loadedProfile.endTime = DateTime.fromISO(profile.end).toMillis();
            }

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

                  let loadedPermission = {assetKey};
                  loadedPermission.permission = customPermission.permission || "no-access";

                  if(customPermission.start) {
                    loadedPermission.startTime = DateTime.fromISO(customPermission.start).toMillis();
                  }
                  if(customPermission.end) {
                    loadedPermission.endTime = DateTime.fromISO(customPermission.end).toMillis();
                  }

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

                  let loadedPermission = {offeringKey};
                  loadedPermission.permission = customPermission.permission || "no-access";

                  if(customPermission.start) {
                    loadedPermission.startTime = DateTime.fromISO(customPermission.start).toMillis();
                  }
                  if(customPermission.end) {
                    loadedPermission.endTime = DateTime.fromISO(customPermission.end).toMillis();
                  }
                  if(customPermission.geo) {
                    loadedPermission.geoRestriction = customPermission.geo;
                  }

                  return loadedPermission;
                });
              }
            }

            this.titleProfiles[titleId][profileName] = loadedProfile;
          }
        });

        // Permissions
        this.titlePermissions[titleId] = {};
        await Promise.all(
          (authSpec[titleId].permissions || []).map(async loadedPermissions => {
            try {
              const profile = loadedPermissions.profile;
              let type = loadedPermissions.subject.type;
              let id = loadedPermissions.subject.oauth_id || loadedPermissions.subject.id;
              if(type === "group") {
                type = "fabricGroup";
                id = this.client.utils.HashToAddress(id);
                await this.LoadGroup(id, type);
              } else if(type === "oauth_group") {
                type = "oauthGroup";
                await this.LoadGroup(id, type, loadedPermissions.subject.id);
              } else if(type === "user") {
                type = "fabricUser";
                id = this.client.utils.HashToAddress(id);
                const name = this.SafeTraverse(settings, `fabric_users/${id}/name`);
                this.LoadUser(id, type, name);
              } else if(type === "oauth_user") {
                type = "oauthUser";
                this.LoadUser(id, type, loadedPermissions.subject.id);
              } else if(type === "ntp") {
                await this.LoadNTPInstance(id);
              }

              this.titlePermissions[titleId][id] = {
                type: type,
                profile
              };

              if(loadedPermissions.start) {
                this.titlePermissions[titleId][id].startTime = DateTime.fromISO(loadedPermissions.start).toMillis();
              }
              if(loadedPermissions.end) {
                this.titlePermissions[titleId][id].endTime = DateTime.fromISO(loadedPermissions.end).toMillis();
              }
            } catch (error) {
              const type = (((loadedPermissions || {}).subject || {}).type || "").replace("_", " ");
              const id = ((loadedPermissions || {}).subject || {}).id || "";

              this.SetError(`Failed to load permission on ${titleId} for ${type} ${id}`);
              // eslint-disable-next-line no-console
              console.error(`Failed to load permission on ${titleId} for ${type} ${id}`);
              // eslint-disable-next-line no-console
              console.error(error);
            }
          })
        );
      }
    );
  });

  @action.bound
  Save = flow(function * (commitMessage) {
    try {
      let permissionSpec = {};

      Object.keys(this.titleProfiles).forEach(titleId => {
        // Profiles

        permissionSpec[titleId] = {
          display_title: this.allTitles[titleId].displayTitleWithStatus || this.allTitles[titleId].displayTitle,
          profiles: {},
          permissions: []
        };

        if(!(this.titleOptions[titleId] || {}).active) {
          permissionSpec[titleId].active = false;
        }

        Object.keys(this.titleProfiles[titleId]).forEach(profileName => {
          const profile = this.titleProfiles[titleId][profileName];

          let profileSpec = {};
          if(profile.startTime) { profileSpec.start = DateTime.fromMillis(profile.startTime).toUTC().toISO(); }
          if(profile.endTime) { profileSpec.end = DateTime.fromMillis(profile.endTime).toUTC().toISO(); }

          // Assets
          profileSpec.assets = {default_permission: profile.assets === "custom" ? profile.assetsDefault : profile.assets };
          if(profile.assetPermissions.length > 0) {
            profileSpec.assets.custom_permissions = {};
            profile.assetPermissions.forEach(asset => {
              let assetPermission = {permission: asset.permission};
              if(asset.startTime) { assetPermission.start = DateTime.fromMillis(asset.startTime).toUTC().toISO(); }
              if(asset.endTime) { assetPermission.end = DateTime.fromMillis(asset.endTime).toUTC().toISO(); }

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
                offeringPermission.start = DateTime.fromMillis(offering.startTime).toUTC().toISO();
              }
              if(offering.endTime) {
                offeringPermission.end = DateTime.fromMillis(offering.endTime).toUTC().toISO();
              }
              if(offering.geoRestriction) {
                offeringPermission.geo = offering.geoRestriction;
              }

              profileSpec.offerings.custom_permissions[offering.offeringKey] = offeringPermission;
            });
          }

          permissionSpec[titleId].profiles[profileName] = profileSpec;
        });

        // Permissions
        permissionSpec[titleId].permissions = Object.keys(this.titlePermissions[titleId] || {}).map(id => {
          const permission = this.titlePermissions[titleId][id];

          let itemPermission = { profile: permission.profile };

          let type = permission.type;
          if(type === "fabricGroup") {
            itemPermission.subject = {
              id: `igrp${this.client.utils.AddressToHash(id)}`,
              type: "group"
            };
          } else if(type === "oauthGroup") {
            itemPermission.subject = {
              id: this.OAuthGroupInfo(id).name,
              oauth_id: id,
              type: "oauth_group"
            };
          } else if(type === "fabricUser") {
            itemPermission.subject = {
              id: `iusr${this.client.utils.AddressToHash(id)}`,
              name: permission.name,
              type: "user"
            };
          } else if(type === "oauthUser") {
            itemPermission.subject = {
              id: this.OAuthUserInfo(id).name,
              oauth_id: id,
              type: "oauth_user"
            };
          } else {
            itemPermission.subject = {
              id: id,
              type: "otp"
            };
          }

          if(permission.startTime) { itemPermission.start = DateTime.fromMillis(permission.startTime).toUTC().toISO(); }
          if(permission.endTime) { itemPermission.end = DateTime.fromMillis(permission.endTime).toUTC().toISO(); }

          return itemPermission;
        });
      });

      const writeToken = yield this.WriteToken();

      yield this.client.ReplaceMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        metadataSubtree: "auth_policy_spec",
        metadata: permissionSpec
      });

      let fabricUsers = {};
      Object.values(this.allUsers)
        .filter(user => user.type === "fabricUser")
        .forEach(fabricUser => fabricUsers[fabricUser.address] = {name: fabricUser.name, address: fabricUser.address});

      yield this.client.ReplaceMetadata({
        libraryId: this.libraryId,
        objectId: this.objectId,
        writeToken,
        metadataSubtree: "auth_policy_settings",
        metadata: {
          tenantId: this.tenantId || "",
          sites: this.sites.map(site => site.objectId),
          fabric_users: fabricUsers,
          ntp_instances: yield this.SaveNTPInstances(true)
        }
      });

      yield this.Finalize(commitMessage);

      this.SetMessage("Successfully saved permissions");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      this.SetError("Failed to save: " + error.message || error);
    }
  });
}

export const rootStore = new RootStore();
export const contentStore = rootStore.contentStore;

