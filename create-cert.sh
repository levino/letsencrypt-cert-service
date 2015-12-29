#!/usr/bin/env bash
letsencrypt certonly --webroot -w /var/www/html -d $CERT-DOMAIN -m $CERT-EMAIL --agree-tos