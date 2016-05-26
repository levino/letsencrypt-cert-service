## Communication

I opened a Gitter room
[![Join the chat at https://gitter.im/Levino/letsencrypt-cert-service](https://badges.gitter.im/Levino/letsencrypt-cert-service.svg)](https://gitter.im/Levino/letsencrypt-cert-service?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Bugs go to issues please.

## Node package

A service to automatically create and renew letsencrypt certificates.

### API Reference
<a name="module_letsencrypt-cert-service"></a>

## letsencrypt-cert-service
**Example**  
```js
var CertService = require("letsencrypt-cert-service");
var certService = new CertService(config);
certService.start(callback);
```

* [letsencrypt-cert-service](#module_letsencrypt-cert-service)
    * [~LetsEncryptCertService](#module_letsencrypt-cert-service..LetsEncryptCertService)
        * [new LetsEncryptCertService(config)](#new_module_letsencrypt-cert-service..LetsEncryptCertService_new)

<a name="module_letsencrypt-cert-service..LetsEncryptCertService"></a>

### letsencrypt-cert-service~LetsEncryptCertService
**Kind**: inner class of <code>[letsencrypt-cert-service](#module_letsencrypt-cert-service)</code>  
<a name="new_module_letsencrypt-cert-service..LetsEncryptCertService_new"></a>

#### new LetsEncryptCertService(config)

| Param | Type | Description |
| --- | --- | --- |
| config |  |  |
| config.domains | <code>Array.&lt;string&gt;</code> | The hostnames which the certificate is to be created for |
| config.email | <code>string</code> | Letsencrypt notification email |
| [config.private] | <code>boolean</code> | Set to true when you want private service to be running |
| [config.password] | <code>string</code> | Strong password to protect private parts - required when private true |
| [config.username] | <code>string</code> | Username of choice - required when private true |



## Docker service

[Available](https://hub.docker.com/r/levino/letsencrypt-cert-service/) on docker hub.

### Description

This service can be run on a webserver to obtain letsencrypt certificates.
It can be run on the server that the A record of the domain points to, but the major benefit of this service is, that it can be run in a professional setup
with loadbalancers and in this scenario be deployed on any node behind the loadbalancer without
interrupting the live deployment.

This service has been tested in a deployment orchestrated with [Tutum](https://tutum.co) and their haproxy [image](https://github.com/tutumcloud/haproxy) but
should work fine in other setups too.

#### Setup and certificate creation

I made a [stackfile](stackfile.yml) to get you going.

Assumptions:

- You have exactly one node "loadbalancer" in docker cloud that has the tag "loadbalancer"
- You want to issue certs for ```example.org``` and have ```certs.example.org``` and ```example.org``` properly registered and
the DNS entries resolve to the node with the tag "loadbalancer"<sup>[1](#myfootnote1)</sup>.

Steps:
1. Copy the stackfile and change the content (like domain names, passwords and such).
2. Deploy the stackfile to docker cloud. Wait for the services to start.
3. Check whether ```http://example.org/.well-known/check``` shows the correct success message ("Letsencrypt cert service reporting in! Load balancing seems to work.")
3. Check whether ```http://certs.example.org/.well-known/check``` shows the correct success message ("Letsencrypt cert service reporting in! Load balancing seems to work.")
4. Check whether ```http://certs.example.org/status``` shows success message
5. Open ```http://certs.example.com/makecert```<sup>[2](#myfootnote2)</sup>(wait a little, if you get an error, check the server logs to debug or open an issue [here](https://github.com/Levino/letsencrypt-cert-service/issues)).
6. On success go to ```https://certs.example.org:8443/status``` and authenticate (Please check that it is properly encrypted traffic!)
7. a) Get your certificate from ```https://certs.example.com:8443/certs/example.org/cert.pem```
   b) Get your private key from ```https://certs.example.com:8443/certs/example.org/privkey.pem```
   c) Get you Tutum Haproxy certificate string from ```https://certs.example.com:8443/certs/example.org/bundle.pem?haproxy=true``` (:D)


<a name="myfootnote1">1</a>: Two ways to achieve this. For ```example.org``` (root domain) you need an A-Record the ip address of the node. Do not set a CNAME for the root domain, you will break stuff, for example MX records.
For ```certs.example.org``` you can either put an A record with the ip address or you create a CNAME for ```cert``` and point it to the endpoint of the loadbalancer which will be something like ```lb.stackname.hashystring.dockercloud.com```
<a name="myfootnote2">2</a>: There are no checks on rate limit and so on. Please do not hit ```/makecert``` too often.


#### Certificat renewal

- With private service enabled and certificates in place you can hit ```https://certs.example.org/makecert``` to renew certs. On success you can retrieve the new extended certificate as above.

### Container configuration

As this is a docker container, all configuration is done by setting appropriate environment variables.
These are as follows:

#### General environment variables

|Variable|Explanation|Example value|
| --- | --- | --- | --- |
|CERT_DOMAINS|Domains the certificate should be issued for, comma separated | ```example.com,app.example.com```|
|CERT_EMAIL|Email for notifications (like imminent certificate expiry)|```admin@example.com```|
|CERT_SERVICE_PRIVATE|Flag to run private part of app (certificate hosting)|```true```|
|CERT_SERVICE_PASSWORD|Pass to authenticate against private certificate service|```SomeGoodPassword```|
|CERT_SERVICE_USERNAME|Username to authenticate against private certificate service|```michael```|

#### Tutum HAProxy specific
|Variable|Explanation|Example value|
| --- | --- | --- | --- |
|VIRTUAL_HOST|Routing all acme queries to the service|```http://*/.well-known/*```
|VIRTUAL_HOST_WEIGHT|Taking over ```example.org/.well-known/acme...``` queries. You need to set a value that is higher than the one of the "catch all" service|```1```
|EXCLUDE_PORTS|Don't route traffic to port 443|```443```

Usually you would want the newly generated certificates to be stored in the hosts file system
so make sure to link the container dir ```/etc/letsencrypt``` to the host.

### Background

The problem with the default letsencrypt tool is that it expects to be run on port 80 on the root domain.
Or at least the server where all http traffic to the domain ```example.com``` ends up. This
means that you can either "inject" it into your one instance apache or nginx server. If you have another setup
which involves for example some node http servers and path based http routing + loadbalancing you need to take down
your live deployment, start a new webserver, get the certificates on port 80 and then start your deployment
again. It goes without saying that this cannot be a "workflow".

### Intent of this service

To provide a solution to the above problem, we suggest this service.

- It can be run additionally as an additional service in any load balanced setup.
- It can run forever and permanently runs a http server on port 80 (important for
load balancers that check whether the service is "alive" before routing traffic to it).
- One can connect to the service at any time and create or renew certificates with a simple command.

### Troubleshooting

After deploying the service make sure you get an answer from this service when you go to
http://[subdomain.]example.org/.well-known/check ("Letsencrypt cert service reporting in! Load balancing seems to work.")

## Contribution

Before you open a pull request, please acknowledge the [Unlicense](UNLICENSE). You have to sign a CLA before I can merge any PRs. For further details see
the [contribution guidelines](CONTRIBUTION.md).

## License

Released under the Unlicense. See the [Unlicense](UNLICENSE)