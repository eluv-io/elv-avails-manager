![Eluvio Logo](src/static/images/Logo-Small.png "Eluvio Logo")
  
# Eluvio Fabric Browser App Template

This application is a barebones template for creating apps for use in the Eluvio Fabric Browser.

- [React](https://reactjs.org/) Framework
- [MobX](https://mobx.js.org/README.html) State Management
- [Sass](https://sass-lang.com/) CSS Extension
- [WebPack](https://webpack.js.org/) Code Bundler
- [Babel](https://babeljs.io/) Compiler 
- [elv-client-js](https://github.com/eluv-io/elv-client-js) Eluvio Fabric Client SDK
- [elv-components-js](https://github.com/eluv-io/elv-components-js) Component Library
- [ESLint](https://eslint.org/) Javascript Linter
- [SassLint](https://github.com/sasstools/sass-lint) Sass Linter

For a detailed example of how this template is used, see the [elv-asset-manager app](https://github.com/eluv-io/elv-asset-manager)

#### Running the app locally

The `serve` command will use webpack-dev-server compile and serve the app:

`npm run serve`

By default, the app will be served at `http://localhost:8085`. To use a different port, edit the `serve` command in package.json.

The app only uses FrameClient by default. For local testing, you can use the full ElvClient and a hard-coded private key instead. Modify `./src/stores/index.js` to use the full client. FrameClient and ElvClient should be completely interchangable.

If you modify the code to use the full ElvClient for testing, make sure to revert to the FrameClient before building. Also make sure to remove the import of ElvClient, because that adds about ~1.2MB of unnecessary code for a Fabric Browser app.

#### Fabric Browser App Arguments

When run in the fabric browser, the app will be given a number of URL parameters about the current object:

```
contentSpaceId
objectId
versionHash
action
```

`action` will either be `display` or `manage`

#### Linting 

`npm run lint`

This will lint all .js files in `./src` and all .scss files in `./src/static/stylesheets` using ESLint and Sass Linter respectively. The linters can be configured in `.eslintrc.json` and `.scss-lint.yml`

#### Building

`npm run build`

The build process will pull all scripts, HTML and assets into a single HTML file `dist/index.html`. This file can be uploaded as an app to the Fabric Browser.

#### Special Operations

When using the FrameClient in the Fabric Browser, you can tell the fabric browser to open a library or an object in a new tab:

```javascript
client.SendMessage({
  options: {
    operation: "OpenLink",
    libraryId,
    objectId,
    versionHash
  },
  noResponse: true
});
```
