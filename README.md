# Asm Application

## Prerequisites

- Java 21
- PostgreSQL
- Redis

## Setup

### 1. RSA Keys
This application requires RSA keys for JWT signing and verification.
You must generate them and place them in `src/main/resources/keys/`.

Run the following commands in the project root:

```bash
mkdir -p src/main/resources/keys
openssl genrsa -out src/main/resources/keys/private.pem 2048
openssl rsa -in src/main/resources/keys/private.pem -pubout -out src/main/resources/keys/public.pem
```

### 2. Environment Variables
The application uses the following environment variables. Default values are provided for development in `src/main/resources/application.yaml`.

- `DB_USERNAME_POSTGRES` (default: `postgres`)
- `DB_PASSWORD` (default: `password`)
- `JWT_ACCESS_EXPIRATION` (default: `1h`)
- `JWT_REFRESH_EXPIRATION` (default: `1d`)

### 3. Build and Run

```bash
./gradlew clean build
./gradlew bootRun
```
