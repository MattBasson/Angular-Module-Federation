/**
 * SHELL webpack.config.js — Host Application
 *
 * The shell (host) orchestrates the micro-frontends. It does NOT statically
 * declare remotes here; instead it uses a federation.manifest.json loaded at
 * runtime via initFederation(). This decouples remote URLs from the build,
 * meaning you can update remote endpoints without rebuilding the shell.
 *
 * Key concepts demonstrated:
 *  - withModuleFederationPlugin: Angular-aware wrapper around webpack's
 *    ModuleFederationPlugin that handles Angular-specific settings.
 *  - shareAll: Automatically shares every package in package.json as a
 *    singleton. Critical to avoid loading duplicate copies of Angular.
 *  - singleton: true — only one copy of each shared module is loaded across
 *    all federated apps running in the same browser tab.
 *  - strictVersion: true — throws at runtime if the loaded remote requires
 *    a different version of a shared library.
 *  - requiredVersion: 'auto' — reads versions directly from package.json.
 */
const { shareAll, withModuleFederationPlugin } =
  require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  // No static 'remotes' — URLs live in federation.manifest.json so that
  // they can be changed per-environment without a rebuild.
  remotes: {},

  shared: {
    ...shareAll({
      singleton:       true,
      strictVersion:   true,
      requiredVersion: 'auto',
    }),
  },

});
