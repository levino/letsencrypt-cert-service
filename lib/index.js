'use strict';

var basicAuth = require('basic-auth-connect');
var log = require('./logger');
var express = require('express');
var child_process = require('child_process');
var fs = require('fs');
var https = require('https');
var http = require('http');
var async = require('async');
var _ = require('lodash');
var enableDestroy = require('server-destroy');

var goodCiphers = [
    "ECDHE-RSA-AES256-SHA384",
    "DHE-RSA-AES256-SHA384",
    "ECDHE-RSA-AES256-SHA256",
    "DHE-RSA-AES256-SHA256",
    "ECDHE-RSA-AES128-SHA256",
    "DHE-RSA-AES128-SHA256",
    "HIGH",
    "!aNULL",
    "!eNULL",
    "!EXPORT",
    "!DES",
    "!RC4",
    "!MD5",
    "!PSK",
    "!SRP",
    "!CAMELLIA"
  ].join(':');
/**
 @module letsencrypt-cert-service
 @example
var CertService = require("letsencrypt-cert-service");
var certService = new CertService(config);
certService.start(callback);
 */




/**
 * @class
 * @param config
 * @param {string[]} config.domains The hostnames which the certificate is to be created for
 * @param {string} config.email Letsencrypt notification email
 * @param {boolean} [config.private] Set to true when you want private service to be running
 * @param {string} [config.password] Strong password to protect private parts - required when private true
 * @param {string} [config.username] Username of choice - required when private true
 */
function LetsEncryptCertService(config) {
  _.extend(this, config);
  this.privKeyPath = '/etc/letsencrypt/live/' + this.domains[0] + '/privkey.pem';
  this.certPath = '/etc/letsencrypt/live/' + this.domains[0] + '/fullchain.pem';
}

LetsEncryptCertService.prototype._publicApp = function () {
  var app = express();
  app.use('/', express.static('/var/www/html'));
  app.get('/test', function (req, res) {
    return res.status(200).send('Letsencrypt cert service reporting in!');
  });
  return app;
};

LetsEncryptCertService.prototype._privateApp = function () {
  var self = this;
  var app = express();
  app.use(basicAuth(self.username, self.password));
  app.get('/', function (req, res) {
    return res.status(200).send('Letsencrypt cert service reporting in! Private features enabled');
  });
  app.use('/certs', express.static('/etc/letsencrypt/live'));
  app.use('/certs/:hostname/bundle.pem', function (req, res) {
    var privateKey = fs.readFileSync(self.privKeyPath, {
      encoding: 'utf8'
    });
    var certificate = fs.readFileSync(self.certPath, {
      encoding: 'utf8'
    });
    var result = privateKey + certificate;
    if (req.query.haproxy) {
      result = result.split('\n').join('\\n');
    }
    return res.status(200).send(result);
  });
  return app;
};

LetsEncryptCertService.prototype._addMakeCertRoute = function (app) {
  var self = this;
  app.get('/makecert', function (req, res, next) {
    log.debug({
      domains: self.domains
    }, 'Creating certificates');
    child_process.execFile('./create-cert.sh', function (error, stdout, stderr) {
      log.debug('stdout: ' + stdout);
      log.debug('stderr: ' + stderr);
      if (error !== null) {
        log.error('exec error: ' + error);
        return res.sendStatus(500);
      }
      if (!self.ssl) {
        res.status(200).send('Created certificates, restarting server');
        log.debug('Restarting servers');
        self._restart(function (err) {
          if (err) {
            return log.error({
              error: err
            }, 'Http server restarts failed');
          }
          log.info('Restarted webservers');
        });
      } else {
        return res.status(200).send('Renewed certificates');
      }
    });
  });
};

LetsEncryptCertService.prototype._restart = function (callback) {
  var self = this;
  async.parallel([
    function (callback) {
      if (self.privateServer) {
        log.debug('Stopping private server');
        return self.privateServer.destroy(callback);
      }
      return callback();
    }, function (callback) {
      log.debug('Stopping public server');
      self.publicServer.destroy(callback);
    }], function (err) {
    log.debug('Servers stopped');
    if (err) {
      return callback(err);
    }
    log.debug('Starting servers');
    return self.start(callback);
  });
};

LetsEncryptCertService.prototype.start = function (callback) {
  var self = this;
  if (!self.keepAlive) {
    self.keepAlive = http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Nothing to see');
    }).listen(3000);
  }

  try {
    fs.accessSync(self.privKeyPath);
    self.ssl = true;
  } catch (err) {
    log.debug({
      path: self.privKeyPath
    }, 'No private key found');
    self.ssl = false;
  }
  var publicApp = self._publicApp();
  var startScripts = [];
  if (self.ssl && self.privateRoutes) {
    var privateApp = self._privateApp();
    self._addMakeCertRoute(privateApp);
    startScripts.push(function(callback) {
      log.debug('Starting private server');
      self.privateServer = https.createServer({
        key: fs.readFileSync(self.privKeyPath),
        cert: fs.readFileSync(self.certPath),
        ciphers: goodCiphers
      }, privateApp).listen(443, callback);
      enableDestroy(self.privateServer);
    });
  } else {
    self._addMakeCertRoute(publicApp);
  }
  startScripts.push(function(callback) {
    log.debug('Starting public server');
    self.publicServer = publicApp.listen(80, callback);
    enableDestroy(self.publicServer);
  });
  async.parallel(startScripts, callback);
};

module.exports = LetsEncryptCertService;
