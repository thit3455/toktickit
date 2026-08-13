# TokTickIT

TokTickIT is an IT Service Desk application for CPE 334.

## Requirements

- Node.js
- npm
- PostgreSQL

## Frontend Setup

cd client
npm install
npm run dev

Frontend: http://localhost:5173

## Backend Setup

cd server
npm install

Copy .env.example to .env and configure your local PostgreSQL connection.

npm run dev

Backend: http://localhost:3000

## Prisma

Prisma is configured to use PostgreSQL.

Validate Prisma with:

npx prisma validate

Do not commit the real .env file.
