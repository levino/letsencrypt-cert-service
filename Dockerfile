FROM node:4-onbuild

VOLUME /var/www/html

RUN awk '$1 ~ "^deb" { $3 = $3 "-backports"; print; exit }' /etc/apt/sources.list > /etc/apt/sources.list.d/backports.list
RUN apt-get update && apt-get install -t jessie-backports letsencrypt -y

# You can use the below command to install some handy tools for dev purposes in the container
# RUN ./setup-dev-tools.sh

EXPOSE 80
EXPOSE 443

ENV CERT_DOMAINS www.example.com
ENV CERT_EMAIL user@example.com
ENV VIRTUAL_HOST *.acme.invalid,*/.well-known/*
