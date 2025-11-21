// Artillery test helpers
// This file provides utility functions for Artillery tests

module.exports = {
  // Generate random string for unique test data
  generateRandomString: function(context, events, done) {
    context.vars.randomString = Math.random().toString(36).substring(7);
    return done();
  },

  // Generate random email
  generateRandomEmail: function(context, events, done) {
    const randomString = Math.random().toString(36).substring(7);
    context.vars.randomEmail = `test-${randomString}@example.com`;
    return done();
  },

  // Generate random number
  generateRandomNumber: function(context, events, done) {
    context.vars.randomNumber = Math.floor(Math.random() * 1000);
    return done();
  },

  // Log response for debugging
  logResponse: function(requestParams, response, context, ee, next) {
    console.log('Response status:', response.statusCode);
    if (response.statusCode >= 400) {
      console.log('Error response:', response.body);
    }
    return next();
  },

  // Track custom metrics
  trackMetric: function(requestParams, response, context, ee, next) {
    const responseTime = Date.now() - context.vars.$startTime;
    if (responseTime > 1000) {
      ee.emit('counter', 'slow_requests', 1);
    }
    return next();
  },

  // Before scenario hook
  beforeScenario: function(context, ee, next) {
    context.vars.$startTime = Date.now();
    return next();
  },

  // After scenario hook
  afterScenario: function(context, ee, next) {
    const duration = Date.now() - context.vars.$startTime;
    ee.emit('histogram', 'scenario_duration', duration);
    return next();
  }
};
