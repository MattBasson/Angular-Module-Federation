/**
 * HISTORY REMOTE webpack.config.js
 *
 * This remote exposes HistoryComponent directly (not via a Route array)
 * because the shell embeds it into the sidebar using NgComponentOutlet
 * (Pattern B — component-level federation).
 *
 * There is no './Routes' exposure here because the history panel is always
 * visible; it is not navigated to via the router.
 *
 * Contrast with the chat and settings remotes, which expose './Routes' for
 * router-based lazy loading (Pattern A).
 */
const { shareAll, withModuleFederationPlugin } =
  require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  name: 'history',

  exposes: {
    // Direct component exposure — consumed via NgComponentOutlet in the shell
    './HistoryComponent': './src/app/history/history.component.ts',
  },

  shared: {
    ...shareAll({
      singleton:       true,
      strictVersion:   true,
      requiredVersion: 'auto',
    }),
  },

});
