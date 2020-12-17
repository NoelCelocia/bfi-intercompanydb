FROM node:12.14.1

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN apt-get update && apt-get -y install cron

# Copy hello-cron file to the cron.d directory
COPY cronjobs /etc/cron.d/cronjobs

# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/cronjobs

# Apply cron job
RUN crontab /etc/cron.d/cronjobs

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

CMD ["cron", "-f"]

#EXPOSE 3002

#CMD ["node", "index.js"]
