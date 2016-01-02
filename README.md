# letsencrypt-cert-service
A service to automatically create and renew letsencrypt certificates.

[Available](https://hub.docker.com/r/levino/letsencrypt-cert-service/) on docker hub.

## Description

This service can be run on a webserver to obtain letsencrypt certificates. 
It can be run on the server that the A record of the domain points to, but the major benefit of this service is, that it can be run in a professional setup
with loadbalancers and in this scenario be deployed on any node behind the loadbalancer without
interrupting the live deployment.

This service has been tested in a deployment orchestrated with [Tutum](https://tutum.co) and their haproxy [image](https://github.com/tutumcloud/haproxy) but
should work fine in other setups too.

## Container configuration

As this is a docker container, all configuration is done by setting appropriate environment variables.
These are as follows:

|Variable|Explanation|Example value|
| --- | --- | --- | --- |
|CERT_DOMAINS|Domains the certificate should be issued for, comma separated | ```example.com,app.example.com```|
|CERT_EMAIL|Email for notifications (like imminent certificate expiry)|```admin@example.com```|
|VIRTUAL_HOST|optional for Tutum + HAProxy setup (telling the loadbalancer to route traffic to this service)|```*.acme.invalid,*/.well-known/*```

Usually you would want the newly generated certificates to be stored in the hosts file system
 so make sure to link the container dir ```/etc/letsencrypt``` to the host.

## General how to

We describe the usage for a domain ```example.com```.

- Deploy the service on a node (set the environment variables, see below) and link the certificate volumes to the hosts file system
- Make sure that all http traffic to ```example.com/.well-known``` goes to the letsencrypt cert service   
- Attach to the running container and start a bash:  

   ```docker exec -i -t loving_heisenberg bash```  
   
- execute ```create-cert.sh```
- scp the certificates from the server with something like:
   ```scp -r root@hostnode.whatever:/var/lib/docker/letsencryptcerts .```

Certificates for ```example.com``` will be available in the container at ```/etc/letsencrypt```

## Background

The problem with the default letsencrypt tool is that it expects to be run on port 80 on the root domain.
Or at least the server where all http traffic to the domain ```example.com``` ends up. This
means that you can either "inject" it into your one instance apache oder nginx server. If you have another setup
 which involves for example some node http servers and path based http routing + loadbalancing you need to take down
your live deployment, start a new webserver, get the certificates on port 80 and then start your deployment
again. It goes without saying that this cannot be a "workflow".

## Intent of this service

To provide a solution to the above problem, we suggest this service.

- It can be run additionally to any other docker based load balanced setup.
- It can run forever and permanently runs a http server on port 80 (important for
 load balancers that check whether the service is "alive" before routing traffic to it).

## Troubleshooting

After deploying the service make sure you get an answer from this service when you go to
http://example.com/.well-known (currently an apache 2.4.7 error message)

## Roadmap

This service is not done. Planned improvements include:

- ~~Support multiple domains for one cert (should be easy)~~ Done.
- Provide a webinterface for all commands. Needs to be done in a two step approach for security:
  1. Start a webserver on port 80 with a button "create certificate"
  2. On click create a certificate and start a webserver on port 443 with ssl termination
  3. Require login to https server (e.g. basic auth with a password from ENV)
  4. Provide buttons "renew certificates" and "download certificates" after login (maybe encrypt certs
  before download with a password from ENV)
- Provide certificates in a "haproxy friendly" .pem format (private key + cert in one file)
- Automatic update of a tutum stack with a renewed certificate (somewhat delicate)
