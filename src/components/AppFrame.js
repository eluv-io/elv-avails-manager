/* AppFrame

This is a sandboxed frame that includes a message passing interface
to allow the contained app to request fabric / blockchain API requests
from the core app, which owns user account information and keys
*/

import React from "react";
import PropTypes from "prop-types";
import URI from "urijs";
import {inject, observer} from "mobx-react";

// Ensure error objects can be properly serialized in messages
if(!("toJSON" in Error.prototype)) {
  const excludedAttributes = [
    "columnNumber",
    "fileName",
    "lineNumber"
  ];

  Object.defineProperty(Error.prototype, "toJSON", {
    value: function() {
      let object = {};

      Object.getOwnPropertyNames(this).forEach(key => {
        if(!excludedAttributes.includes(key)) {
          object[key] = this[key];
        }
      }, this);

      return object;
    },
    configurable: true,
    writable: true
  });
}

const IsCloneable = (value) => {
  if(Object(value) !== value) {
    // Primitive value
    return true;
  }

  switch ({}.toString.call(value).slice(8,-1)) {
    case "Boolean":
    case "Number":
    case "String":
    case "Date":
    case "RegExp":
    case "Blob":
    case "FileList":
    case "ImageData":
    case "ImageBitmap":
    case "ArrayBuffer":
      return true;
    case "Array":
    case "Object":
      return Object.keys(value).every(prop => IsCloneable(value[prop]));
    case "Map":
      return [...value.keys()].every(IsCloneable)
        && [...value.values()].every(IsCloneable);
    case "Set":
      return [...value.keys()].every(IsCloneable);
    default:
      return false;
  }
};

class IFrameBase extends React.Component {
  SandboxPermissions() {
    return [
      "allow-downloads",
      "allow-scripts",
      "allow-forms",
      "allow-modals",
      "allow-pointer-lock",
      "allow-orientation-lock",
      "allow-popups",
      "allow-presentation",
      "allow-same-origin",
    ].join(" ");
  }

  // Only update if the app URL has changed
  shouldComponentUpdate(oldProps) {
    return this.props.appUrl !== oldProps.appUrl;
  }

  componentDidMount() {
    window.addEventListener("message", this.props.listener);
  }

  componentWillUnmount() {
    window.removeEventListener("message", this.props.listener);
  }

  render() {
    return (
      <iframe
        ref={this.props.appRef}
        src={this.props.appUrl}
        allow="encrypted-media *"
        allowFullScreen
        sandbox={this.SandboxPermissions()}
        className={"app-frame " + (this.props.className || "")}
      />
    );
  }
}

IFrameBase.propTypes = {
  appUrl: PropTypes.string.isRequired,
  appRef: PropTypes.object.isRequired,
  listener: PropTypes.func.isRequired,
  className: PropTypes.string
};

const IFrame = React.forwardRef(
  (props, appRef) => <IFrameBase appRef={appRef} {...props} />
);

@inject("rootStore")
@observer
class AppFrame extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      appRef: React.createRef()
    };

    this.ApiRequestListener = this.ApiRequestListener.bind(this);
  }

  async componentWillUnmount() {
    // Ensure region is reset after app is unloaded in case app changed it
    await this.rootStore.client.ResetRegion();
  }

  AppUrl() {
    // Inject any query parameters into the given URL
    let appUrl = this.props.appUrl;
    if(this.props.queryParams) {
      const parsedUrl = URI(appUrl);
      Object.keys(this.props.queryParams).forEach(key => {
        parsedUrl.addSearch(key, this.props.queryParams[key]);
      });
      appUrl = parsedUrl.toString();
    }

    return appUrl;
  }

  Respond(requestId, source, responseMessage) {
    responseMessage = {
      ...responseMessage,
      requestId,
      type: "ElvFrameResponse"
    };

    // If the response is not cloneable, serialize it to remove any non-cloneable parts
    if(!IsCloneable(responseMessage)) {
      responseMessage = JSON.parse(JSON.stringify(responseMessage));
    }

    try {
      // Try sending the response message as-is
      source.postMessage(
        responseMessage,
        "*"
      );
    } catch (error) {
      this.LogError(responseMessage, error);
    }
  }

  // Listen for API request messages from frame
  async ApiRequestListener(event) {
    // Ignore unrelated messages
    if(!event || !event.data || event.data.type !== "ElvFrameRequest") { return; }

    const client = this.props.rootStore.client;

    const Respond = (response) => this.Respond(response.requestId, event.source, response);

    Respond(
      await client.PassRequest({
        request: event.data,
        Respond
      })
    );
  }

  render() {
    return (
      <IFrame
        ref={this.state.appRef}
        appUrl={this.AppUrl()}
        listener={this.ApiRequestListener}
        className={this.props.className}
      />
    );
  }
}

AppFrame.propTypes = {
  appUrl: PropTypes.string.isRequired,
  queryParams: PropTypes.object,
  className: PropTypes.string
};

export default AppFrame;
