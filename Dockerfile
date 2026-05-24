FROM nginx:alpine

COPY index.html config.js app.js styles.css /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/

EXPOSE 80
