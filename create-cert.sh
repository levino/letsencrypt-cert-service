#!/usr/bin/env bash
letsencrypt certonly --webroot -w /var/www/html -d $CERT_DOMAIN -m $CERT_EMAIL --agree-tos