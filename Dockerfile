FROM php:8.2-apache

# Install system deps and PHP extensions required by Cauldron:
#   mysqli  — database
#   gd      — image resize / thumbnail generation
#   xsl     — XSLT view engine (XSLTProcessor)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libxslt1-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j"$(nproc)" mysqli gd xsl \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Set a sane default timezone (override via TZ env var if needed)
RUN echo "date.timezone = UTC" > /usr/local/etc/php/conf.d/timezone.ini

# Replace default vhost with one that points to public/ and allows .htaccess
COPY .docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html
COPY . .

# Runtime-writable directories
RUN chown -R www-data:www-data \
        public/files \
        public/resources \
        logfiles

COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
