FROM node

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY app.js ./
COPY config.json ./

RUN npm install

# Bundle app source
# COPY . .

EXPOSE 3000
CMD [ "node", "app.js" ]