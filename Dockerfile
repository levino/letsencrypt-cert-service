FROM node:4.2-onbuild

VOLUME /var/www/html

RUN ./install-letsencrypt.sh

# You can use the below command to install some handy tools for dev purposes in the container
# RUN ./setup-dev-tools.sh

EXPOSE 80
EXPOSE 443

ENV CERT_DOMAINS www.example.com
ENV CERT_EMAIL user@example.com
ENV VIRTUAL_HOST *.acme.invalid,*/.well-known/*
