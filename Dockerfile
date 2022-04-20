FROM node:16
WORKDIR /server
COPY  package*.json /server
RUN yarn install
COPY . /server
#VOLUME [ "D:/Social-Square/Social-Square-Images/:/folder/in/container" ]
#EXPOSE 9443
CMD ["yarn", "start"]
#CMD ["npm", "run", "dev"]