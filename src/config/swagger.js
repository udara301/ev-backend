const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EV Charger Management API',
      version: '1.0.0',
      description: 'API documentation for the EV charger distribution system',
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Local server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to your route files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };