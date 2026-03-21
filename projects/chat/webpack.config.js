/**
 * CHAT REMOTE webpack.config.js
 *
 * This application acts as a Module Federation "remote". It packages its
 * components and exposes them through a remoteEntry.js file that is served
 * alongside the application bundle.
 *
 * Key fields:
 *
 *  name: 'chat'
 *    The unique identifier for this remote. Must match the key used in the
 *    shell's federation.manifest.json and in loadRemoteModule() calls.
 *
 *  exposes:
 *    A map of public "contract" names to the files that implement them.
 *    The key (e.g. './Routes') becomes the exposedModule string that the
 *    shell passes to loadRemoteModule(). The value is the file path relative
 *    to this webpack.config.js.
 *
 *    We expose two things:
 *      './Routes'        — an Angular Routes array for router integration
 *      './ChatComponent' — the component directly (for non-route use cases)
 *
 *  shared:
 *    Must mirror the shell's shared config. If the shell and this remote
 *    share @angular/core as a singleton, they will use the same instance.
 *    If they disagree on versions, webpack throws at runtime (strictVersion).
 */
const { shareAll, withModuleFederationPlugin } =
  require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  name: 'chat',

  exposes: {
    // Route-based exposure — the shell loads this as loadChildren()
    './Routes':        './src/app/app.routes.ts',
    // Direct component exposure — useful for non-route embedding
    './ChatComponent': './src/app/chat/chat.component.ts',
  },

  shared: {
    ...shareAll({
      singleton:       true,
      strictVersion:   true,
      requiredVersion: 'auto',
    }),
  },

});
