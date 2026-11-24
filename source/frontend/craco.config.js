// craco.config.js
const path = require("path");
require("dotenv").config();

const isDevServer = process.env.NODE_ENV === "development";
if (process.env.NODE_ENV === "production") {
  // The site serves external scripts and leaves debug sources out of the public build.
  process.env.INLINE_RUNTIME_CHUNK = "false";
  process.env.GENERATE_SOURCEMAP = "false";
}

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

function makeDevServerV5Compatible(devServerConfig) {
  const {
    https,
    onAfterSetupMiddleware,
    onBeforeSetupMiddleware,
    onListening,
    setupMiddlewares,
    ...compatibleConfig
  } = devServerConfig;

  compatibleConfig.server =
    typeof https === "object"
      ? { type: "https", options: https }
      : https
        ? "https"
        : "http";
  compatibleConfig.headers = {
    ...compatibleConfig.headers,
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (process.env.PURRADOX_LOCAL_CHECKOUT) {
    compatibleConfig.headers["X-Purradox-Checkout"] = process.env.PURRADOX_LOCAL_CHECKOUT;
  }

  if (onBeforeSetupMiddleware || setupMiddlewares) {
    compatibleConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }

      return setupMiddlewares
        ? setupMiddlewares(middlewares, devServer)
        : middlewares;
    };
  }

  compatibleConfig.onListening = (devServer) => {
    devServer.close ??= (callback) => devServer.stopCallback(callback);

    if (onListening) {
      onListening(devServer);
    }
    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }
  };

  return compatibleConfig;
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

// Branded error overlay + preview health probe, dev server only. Fails open: a broken
// overlay must degrade to "no overlay", never to "no dev server".
let emergentOverlay;
let visualEditsEnabled = false;
if (isDevServer && process.env.DISABLE_EMERGENT_OVERLAY !== "true") {
  try {
    emergentOverlay = require("@emergentbase/overlay/craco").emergentOverlayCraco({
      root: __dirname,
    });
    // A wrong shape would otherwise TypeError at dev-server config time, past this catch.
    if (
      typeof emergentOverlay.devServer !== "function" ||
      typeof emergentOverlay.attach !== "function" ||
      typeof emergentOverlay.webpackPlugin?.apply !== "function"
    ) {
      throw new Error("unexpected adapter shape");
    }
  } catch (err) {
    emergentOverlay = undefined;
    console.warn(
      "[emergent-overlay] not loaded — overlay disabled:",
      err instanceof Error ? err.message : err,
    );
  }
}

function getBackendOrigin() {
  const configuredUrl = process.env.REACT_APP_BACKEND_URL;
  if (!configuredUrl) return null;

  const url = URL.canParse(configuredUrl) ? new URL(configuredUrl) : null;
  if (
    !url || !/^https?:\/\/[^/]/i.test(configuredUrl) || /[?#\s\\]/u.test(configuredUrl) ||
    !/^https?:\/\/(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::[0-9]+)?$/i.test(url.origin) || url.username || url.password
  ) {
    throw new Error("REACT_APP_BACKEND_URL must be an absolute HTTP(S) URL without credentials, query, or fragment.");
  }
  return url.origin;
}

function contentSecurityPolicy() {
  const connections = ["'self'", getBackendOrigin()];
  if (isDevServer) connections.push("ws:", "wss:"); // Webpack HMR, including HTTPS previews.
  const scripts = isDevServer && (emergentOverlay || visualEditsEnabled)
    ? "'self' 'unsafe-inline'"
    : "'self'";

  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src ${connections.filter(Boolean).join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      const html = webpackConfig.plugins.find((plugin) => plugin.constructor.name === "HtmlWebpackPlugin");
      html.options.contentSecurityPolicy = contentSecurityPolicy();

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      // Overlay's HTML injection + compile-error capture; self-gates on mode !== development.
      if (emergentOverlay) {
        webpackConfig.plugins.push(emergentOverlay.webpackPlugin);
      }
      return webpackConfig;
    },
  },
  jest: {
    configure: {
      // Relative globs also work with CRA's escaped worktree paths on Windows.
      testMatch: ["**/__tests__/**/*.{js,jsx,ts,tsx}", "**/*.{spec,test}.{js,jsx,ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  devServerConfig.static = [devServerConfig.static, {
    directory: path.join(__dirname, "src/style-lab/art"),
    publicPath: "/art/cute-style-lab-20261106/",
    watch: false,
  }];

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Visual Edits adds the Babel plugin, dev server and an iframe overlay.
if (isDevServer && process.env.ENABLE_VISUAL_EDITS === "true") {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig, { tailwindCdn: false });
    visualEditsEnabled = true;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

// Overlay wraps last: visual-edits assigns setupMiddlewares instead of chaining onto it,
// so anything registered before it is dropped.
if (emergentOverlay) {
  const devServerBeforeOverlay = webpackConfig.devServer;

  // Fail open at each call site too: a throw inside the adapter costs the overlay, never
  // the dev server. Warns once, then this path stops calling it.
  let overlay = emergentOverlay;
  const overlayFailed = (site, err) => {
    overlay = undefined;
    console.warn(
      `[emergent-overlay] ${site} failed — overlay disabled:`,
      err instanceof Error ? err.message : err,
    );
  };

  webpackConfig.devServer = (devServerConfig) => {
    devServerConfig = devServerBeforeOverlay(devServerConfig);

    // Overlay owns runtime errors; webpack keeps compile errors.
    try {
      devServerConfig = overlay.devServer(devServerConfig);
    } catch (err) {
      overlayFailed("devServer config", err);
    }

    const previousSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Registered ahead of the chain's own body parsers, which would consume the raw stream
      // the overlay reads. Adapter taking a pre-parsed req.body is the overlay-side fix.
      try {
        if (overlay) overlay.attach(devServer);
      } catch (err) {
        overlayFailed("attach", err);
      }

      if (previousSetupMiddlewares) {
        middlewares = previousSetupMiddlewares(middlewares, devServer);
      }

      return middlewares;
    };

    return devServerConfig;
  };
}

const configureDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) =>
  makeDevServerV5Compatible(configureDevServer(devServerConfig));

module.exports = webpackConfig;
