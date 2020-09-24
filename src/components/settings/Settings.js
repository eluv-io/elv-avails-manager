import React from "react";
import Sites from "./Sites";
import OAuthSettings from "./OAuthSettings";

const Settings = () => {
  return (
    <div className="page-container">
      <OAuthSettings />
      <div className="settings-spacer" />
      <Sites />
    </div>
  );
};

export default Settings;
