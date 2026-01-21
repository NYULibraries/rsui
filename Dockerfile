# Use the official PHP 8.4 image
FROM php:8.4-fpm

# Set working directory
WORKDIR /var/www/html

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libmcrypt-dev \
    libreadline-dev \
    libssl-dev \
    libxslt1-dev \
    supervisor \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_mysql \
    pdo_sqlite \
    pdo_pgsql \
    bcmath \
    ctype \
    json \
    mbstring \
    openssl \
    tokenizer \
    xml \
    curl \
    zip \
    gd \
    xsl \
    opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js and npm
COPY --from=node:20 /usr/local/bin/node /usr/local/bin/node
COPY --from=node:20 /usr/local/bin/npm /usr/local/bin/npm

# Copy existing application directory permissions
COPY --chown=www-data:www-data . /var/www/html

# Install PHP dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Install Node dependencies
RUN npm install

# Build frontend assets
RUN npm run build

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Expose ports
EXPOSE 9000

# Configure PHP-FPM
RUN sed -i "s/listen = 127.0.0.1:9000/listen = 0.0.0.0:9000/" /usr/local/etc/php-fpm.d/www.conf

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Create supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]