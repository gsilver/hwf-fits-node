FROM node:boron
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# Install app dependencies
RUN npm install
# Bundle app source
COPY . /usr/src/app
EXPOSE 8081
#CMD /bin/bash
#run start up from shell script
COPY run.sh usr/local/app/
RUN chmod +x usr/local/app/run.sh
CMD usr/local/app/run.sh
