FROM node:16
WORKDIR /server
COPY  package*.json /server
RUN mkdir Local-Images
RUN yarn install
COPY . /server
CMD ["yarn", "start"]
#CMD ["npm", "run", "dev"]