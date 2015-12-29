FROM quay.io/letsencrypt/letsencrypt

RUN apt-get update && apt-get install -y \
  apache2 \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*
RUN pip install supervisor
RUN mkdir -p /var/lock/apache2 /var/run/apache2
COPY supervisord.conf /etc
COPY create-cert.sh /opt/letsencrypt
EXPOSE 80
ENTRYPOINT supervisord