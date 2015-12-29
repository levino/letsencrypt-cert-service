FROM quay.io/letsencrypt/letsencrypt

RUN apt-get update && apt-get install -y \
  apache2 \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*
RUN pip install supervisor
RUN mkdir -p /var/lock/apache2 /var/run/apache2
COPY supervisord.conf /etc/supervisord.conf
COPY create-cert.sh /opt/letsencrypt/create-cert.sh
EXPOSE 80
EXPOSE 443

ENV CERT_DOMAIN www.example.com
ENV CERT_EMAIL user@example.com
ENV VIRTUAL_HOST *.acme.invalid,*/.well-known/*

ENTRYPOINT supervisord