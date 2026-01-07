/**
 * API Documentation Routes
 * Swagger UI and OpenAPI specification endpoints
 */

const express = require('express');
const router = express.Router();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { swaggerOptions } = require('../config/swagger');

// Generate Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'STRAT API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Serve OpenAPI JSON spec
router.get('/openapi.json', (req, res) => {
  res.json(swaggerDocs);
});

// Serve OpenAPI YAML spec
router.get('/openapi.yaml', (req, res) => {
  const yaml = require('js-yaml');
  res.type('yaml');
  res.send(yaml.dump(swaggerDocs));
});

// API health endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    version: swaggerDocs.info.version,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
