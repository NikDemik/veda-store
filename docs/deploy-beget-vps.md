# Deploy на Beget VPS

Инструкция рассчитана на запуск Next.js-приложения как Node.js-сервиса за Nginx reverse proxy. VPS IP: `85.198.99.82`.

## Требования

- Ubuntu/Debian VPS с SSH-доступом.
- Домен, направленный A-записью на `85.198.99.82`.
- Node.js 20 LTS или новее, но младше 25.
- MySQL/MariaDB с отдельной базой и пользователем.
- Nginx и PM2.

Для production-входа в админку нужен HTTPS: admin cookie в `NODE_ENV=production` создается с флагом `secure`, поэтому через обычный `http://85.198.99.82` авторизация может не сохраняться.

## Первичная установка на сервере

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Создайте базу и пользователя MySQL:

```sql
CREATE DATABASE veda_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'veda_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON veda_shop.* TO 'veda_user'@'localhost';
FLUSH PRIVILEGES;
```

## Переменные окружения

На сервере создайте `.env` в корне проекта:

```env
DATABASE_URL="mysql://veda_user:strong_password@127.0.0.1:3306/veda_shop"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_ADMIN_PUBLIC_PATH="/control-7f3a9c1e"
DADATA_API_KEY=""

YANDEX_STORAGE_BUCKET=""
YANDEX_STORAGE_ACCESS_KEY_ID=""
YANDEX_STORAGE_SECRET_ACCESS_KEY=""
YANDEX_STORAGE_ENDPOINT="https://storage.yandexcloud.net"
YANDEX_STORAGE_REGION="ru-central1"
YANDEX_STORAGE_PUBLIC_BASE_URL=""
YANDEX_STORAGE_FORCE_PATH_STYLE="false"
```

`AUTH_SECRET` можно сгенерировать командой:

```bash
openssl rand -base64 32
```

## Деплой приложения

```bash
git clone <repo-url> /var/www/veda-shop
cd /var/www/veda-shop
npm ci
npm run deploy:build
npm run prisma:seed
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

При следующих обновлениях:

```bash
cd /var/www/veda-shop
git pull
npm ci
npm run deploy:build
pm2 reload veda-shop
```

`npm run deploy:build` применяет Prisma migrations через `prisma migrate deploy`, затем выполняет `next build`.

## Nginx

Замените `example.ru` на реальный домен:

```nginx
server {
    listen 80;
    server_name drives-vfd.ru www.drives-vfd.ru 85.198.99.82;

    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Проверьте и примените:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

После привязки домена включите SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.ru -d www.example.ru
```

## Проверка после запуска

```bash
pm2 status
pm2 logs veda-shop --lines 100
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/health/db
```

Публичная проверка:

```bash
curl -I http://85.198.99.82
curl https://example.ru/api/health/db
```

Ожидаемый ответ health endpoint при корректной базе:

```json
{ "ok": true }
```
