var CertService = require('./index.js');
var log = require('./lib/logger');
var zxcvbn = require('zxcvbn');
var assert = require('chai').assert;
var validator = require('validator');

var checkEnv = function() {
  if (process.env.CERT_SERVICE_PRIVATE) {
    assert.isDefined(process.env.CERT_SERVICE_PASSWORD, 'CERT_SERVICE_PASSWORD not set.');
    assert.isDefined(process.env.CERT_SERVICE_USERNAME, 'CERT_SERVICE_USERNAME not set.');
    var passwordStrength = zxcvbn(process.env.CERT_SERVICE_PASSWORD).score;
    assert.isTrue(passwordStrength >= 2, 'CERT_SERVICE_PASSWORD too weak. Result = ' + passwordStrength);
  }
  assert.isDefined(process.env.CERT_DOMAINS, 'CERT_DOMAINS not set.');
  assert.isDefined(process.env.CERT_EMAIL, 'CERT_EMAIL not set.');
  assert.isTrue(validator.isEmail(process.env.CERT_EMAIL), 'CERT_EMAIL is not a valid email address');
};

try {
  checkEnv();
} catch(err) {
  return log.error({
    error: err.message
  }, 'Missing or wrong environment variables. See error text for more details');
}

var certService = new CertService({
  privateRoutes: process.env.CERT_SERVICE_PRIVATE,
  password: process.env.CERT_SERVICE_PASSWORD,
  username: process.env.CERT_SERVICE_USERNAME,
  domains: process.env.CERT_DOMAINS.split(','),
  email: process.env.CERT_EMAIL
});

certService.start(function(err) {
   if (err) {
       return log.error('Failed to start cert service');
   }
   return log.info('Succeeded to start cert service');
});
