FROM node:16
WORKDIR /server
COPY  package*.json /server
RUN yarn install
COPY . /server
#EXPOSE 9443
CMD ["yarn", "start"]
#CMD ["npm", "run", "dev"]