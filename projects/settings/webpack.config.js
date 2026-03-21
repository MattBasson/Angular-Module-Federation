/**
 * SETTINGS REMOTE webpack.config.js
 *
 * Settings is loaded by the shell via Pattern A (route-based federation),
 * identical to how the Chat remote is loaded. This demonstrates that the
 * pattern is reusable across any number of feature remotes.
 *
 * Comparing Chat vs Settings remotes:
 *   - Both expose './Routes'
 *   - Both are lazy-loaded via loadRemoteModule() in the shell routes
 *   - They are developed, deployed, and versioned independently
 *   - The shell only needs to know the manifest key and the exposed module name
 */
const { shareAll, withModuleFederationPlugin } =
  require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  name: 'settings',

  exposes: {
    './Routes':            './src/app/app.routes.ts',
    './SettingsComponent': './src/app/settings/settings.component.ts',
  },

  shared: {
    ...shareAll({
      singleton:       true,
      strictVersion:   true,
      requiredVersion: 'auto',
    }),
  },

});
