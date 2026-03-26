const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nantes App - Main Brain API',
      version: '1.1.0',
      description: 'API du microservice brain pour la SAE S4'
    }
  },
  apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(options);
