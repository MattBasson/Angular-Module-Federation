/**
 * CHAT REMOTE main.ts
 *
 * Remote apps also use the async bootstrap pattern. Unlike the shell, a
 * remote does not need to call initFederation() — that is the host's job.
 *
 * The dynamic import('./bootstrap') ensures webpack can negotiate shared
 * module versions with the host before Angular starts. If this app is opened
 * standalone in the browser (e.g. for isolated development of the chat
 * component), it bootstraps normally. When loaded as a remote from the shell,
 * the shared module negotiation has already happened.
 */
import('./bootstrap').catch(err => console.error(err));
