#!/usr/bin/env bash
/letsencrypt/letsencrypt-auto certonly --webroot -w /var/www/html -d $CERT_DOMAINS -m $CERT_EMAIL --agree-tos --renew-by-default