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
        url: 'https://drivewithev.com',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
       
    ],
     components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Fixed path
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };