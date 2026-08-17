#!/usr/bin/env node
/**
 * Regenerates the Expo Router typed-routes declaration (`.expo/types/router.d.ts`)
 * without booting Metro.
 *
 * Expo SDK 54 only writes this file as a side effect of the dev server, and `.expo/`
 * is gitignored. That leaves two failure modes, both silent:
 *   - fresh checkout (CI): the file is missing, `Href` degrades to `string`, and real
 *     route mistakes typecheck clean.
 *   - long-lived checkout: the file predates newly added routes and `tsc` reports
 *     errors for routes that do exist.
 *
 * Running this before `tsc` removes both. It is wired as `pretypecheck`, so
 * `npm run typecheck` always sees fresh route types.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const typesDir = path.join(projectRoot, ".expo", "types");
const routerDts = path.join(typesDir, "router.d.ts");

// `tsconfig.json` includes this file; the dev server writes it and it is gitignored,
// so a fresh checkout would typecheck without Expo's global types.
const expoEnvDts = path.join(projectRoot, "expo-env.d.ts");
const expoEnvContents = `/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore`;

function fail(message) {
  console.error(`[router-types] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(appRoot)) {
  fail(`expo-router app directory not found: ${appRoot}`);
}

// expo-router reads the app root from this env var whenever it runs outside Metro,
// where the `require.context` call would normally be compiled away.
process.env.EXPO_ROUTER_APP_ROOT = appRoot;

// Options the expo-router config plugin would pass through (`expo.extra.router`).
// app.json is static, so read it directly instead of pulling in @expo/config.
function readRouterPluginOptions() {
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "app.json"), "utf8"));
    return appJson?.expo?.extra?.router ?? {};
  } catch {
    return {};
  }
}

let regenerateDeclarations;
try {
  ({ regenerateDeclarations } = require("expo-router/build/typed-routes"));
} catch (error) {
  fail(`could not load expo-router's type generator, are dependencies installed? (${error.message})`);
}

fs.mkdirSync(typesDir, { recursive: true });
fs.writeFileSync(expoEnvDts, expoEnvContents);
regenerateDeclarations(typesDir, readRouterPluginOptions());

// `regenerateDeclarations` is debounced, so the write lands on a later tick.
const deadline = Date.now() + 5000;
const poll = setInterval(() => {
  if (fs.existsSync(routerDts)) {
    clearInterval(poll);
    console.log(`[router-types] wrote ${path.relative(projectRoot, routerDts)}`);
  } else if (Date.now() > deadline) {
    clearInterval(poll);
    fail(`timed out waiting for ${path.relative(projectRoot, routerDts)} to be written`);
  }
}, 25);
