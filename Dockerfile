FROM node:20.8-alpine as build

WORKDIR /app/

COPY aspnetcore-https.js ./
COPY aspnetcore-react.js ./

COPY package.json package-lock.json ./
RUN npm install

COPY public/ ./public
COPY src/ ./src

RUN npm run build


FROM nginx:1.19.0

COPY --from=build /app/build /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/nginx.conf

EXPOSE 80/tcp

CMD ["/usr/sbin/nginx", "-g", "daemon off;"]