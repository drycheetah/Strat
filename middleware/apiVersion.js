/**
 * API Versioning Middleware
 * Handles API version routing and backwards compatibility
 */

const logger = require('../utils/logger');

// Supported API versions
const SUPPORTED_VERSIONS = ['1.0', '2.0'];
const DEFAULT_VERSION = '1.0';
const DEPRECATED_VERSIONS = ['1.0'];

/**
 * Parse API version from request
 */
function parseVersion(req) {
  // Check header first
  let version = req.headers['x-api-version'] || req.headers['api-version'];

  // Check URL path (/api/v1/... or /api/v2/...)
  const pathMatch = req.path.match(/^\/api\/v(\d+\.?\d*)/);
  if (pathMatch) {
    version = pathMatch[1];
  }

  // Check query parameter
  if (req.query.version) {
    version = req.query.version;
  }

  // Default version
  if (!version) {
    version = DEFAULT_VERSION;
  }

  return version;
}

/**
 * API Version Middleware
 */
function apiVersionMiddleware(req, res, next) {
  const version = parseVersion(req);

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      message: `API version ${version} is not supported`,
      supportedVersions: SUPPORTED_VERSIONS,
      currentVersion: DEFAULT_VERSION
    });
  }

  // Set version info on request
  req.apiVersion = version;
  req.isDeprecatedVersion = DEPRECATED_VERSIONS.includes(version);

  // Add deprecation warning header if needed
  if (req.isDeprecatedVersion) {
    res.set('X-API-Deprecated', 'true');
    res.set('X-API-Sunset-Date', '2026-12-31');
    res.set('Warning', `299 - "API version ${version} is deprecated and will be removed on 2026-12-31"`);
  }

  // Add version headers to response
  res.set('X-API-Version', version);
  res.set('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

  logger.debug(`API request: version=${version}, path=${req.path}`);

  next();
}

/**
 * Version-specific route wrapper
 */
function versionedRoute(versions) {
  return (req, res, next) => {
    if (versions.includes(req.apiVersion)) {
      next();
    } else {
      res.status(400).json({
        error: 'Endpoint not available in this API version',
        message: `This endpoint is only available in API versions: ${versions.join(', ')}`,
        currentVersion: req.apiVersion
      });
    }
  };
}

/**
 * API version information endpoint
 */
function getVersionInfo(req, res) {
  res.json({
    currentVersion: DEFAULT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    deprecatedVersions: DEPRECATED_VERSIONS,
    apiEndpoint: `${req.protocol}://${req.get('host')}/api`,
    documentation: `${req.protocol}://${req.get('host')}/api/docs`,
    changelog: `${req.protocol}://${req.get('host')}/api/changelog`,
    versioning: {
      method: 'header',
      headerName: 'X-API-Version',
      alternativeMethods: ['URL path (/api/v1/)', 'query parameter (?version=1.0)']
    }
  });
}

module.exports = {
  apiVersionMiddleware,
  versionedRoute,
  getVersionInfo,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION
};
