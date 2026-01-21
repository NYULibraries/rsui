# Development Container

This repository includes a DevContainer configuration for consistent development environments using Docker and VS Code.

## Quick Start

1. **Open in VS Code with DevContainers**:

    ```bash
    # Clone and open in VS Code
    git clone <repository-url>
    cd rsui
    code .
    ```

2. **Open in DevContainer**:
    - Open the Command Palette (Ctrl+Shift+P)
    - Select "Dev Containers: Reopen in Container"
    - VS Code will build and connect to the container

3. **Manual Docker Setup**:

    ```bash
    # Start all services
    docker-compose up -d

    # Or run specific services
    docker-compose up app mysql redis
    ```

## Available Services

The DevContainer includes these services:

- **App**: PHP 8.4 + Laravel + Node.js 20
- **MySQL**: v8.0 (port 3306)
- **PostgreSQL**: v15 (port 5432)
- **Redis**: v7-alpine (port 6379)

## Port Forwarding

- **8000**: Laravel development server
- **5173**: Vite development server
- **3306**: MySQL database
- **5432**: PostgreSQL database
- **6379**: Redis

## Environment Variables

The container is pre-configured with:

- `APP_ENV=local`
- `APP_DEBUG=true`
- `DB_CONNECTION=sqlite` (default)
- `DB_DATABASE=/var/www/html/database/database.sqlite`

## VS Code Extensions

Pre-installed extensions for optimal development:

- PHP Intelephense (intelligent code completion)
- PHP Debug (debugging support)
- TypeScript and JavaScript language features
- Tailwind CSS IntelliSense
- ESLint and Prettier
- Docker support
- GitLens

## Development Commands

Inside the container, you can use:

```bash
# Laravel development
composer install
php artisan serve
php artisan migrate
php artisan tinker

# Frontend development
npm install
npm run dev
npm run build

# Testing
php artisan test
npm test
```

## Database Setup

You can choose between:

1. **SQLite** (default): `.env` already configured
2. **MySQL**: Update `.env`:
    ```
    DB_CONNECTION=mysql
    DB_HOST=mysql
    DB_PORT=3306
    DB_DATABASE=rsui
    DB_USERNAME=rsui
    DB_PASSWORD=rsui_password
    ```
3. **PostgreSQL**: Update `.env`:
    ```
    DB_CONNECTION=pgsql
    DB_HOST=postgres
    DB_PORT=5432
    DB_DATABASE=rsui
    DB_USERNAME=rsui
    DB_PASSWORD=rsui_password
    ```

## Performance Features

- **File System Watching**: Hot reload for both PHP and JavaScript
- **Cache Mounting**: Optimized for performance during development
- **OpCache Enabled**: PHP bytecode caching
- **Gzip Compression**: For asset delivery
- **Security Headers**: Pre-configured CORS and security headers

## Troubleshooting

1. **Container won't start**:
    - Check Docker is running
    - Verify Docker Desktop has enough memory allocated
    - Check for port conflicts

2. **Permission issues**:
    - Run `chmod -R 755 storage bootstrap/cache` inside container
    - Ensure `.env` is writable

3. **Database connection issues**:
    - Verify database service is running: `docker-compose ps`
    - Check connection strings in `.env`
    - Try recreating database container

4. **Performance issues**:
    - Increase Docker Desktop memory allocation
    - Use volume mounting for better I/O performance

## Production Notes

The `Dockerfile` includes optimizations for production:

- Multi-stage build for smaller image size
- Composer and npm optimizations
- Nginx with PHP-FPM
- Supervisor for process management

For production deployment, use:

```bash
docker build -t rsui-app .
docker run -p 80:80 rsui-app
```
