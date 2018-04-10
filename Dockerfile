FROM node:boron
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
# Install app dependencies
RUN npm install
# Bundle app source
EXPOSE 8090
#CMD /bin/bash
#run start up from shell script
COPY run.sh /usr/local/app/
RUN chmod +x /usr/local/app/run.sh
RUN mkdir -p /opt/secrets/
RUN rm /usr/local/app/.env
RUN ln -s /opt/secrets/.env /usr/local/app/.env
CMD /usr/local/app/run.sh
