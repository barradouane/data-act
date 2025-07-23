# Lancer AWS Lambda  avec Docker + Strapi + S3

Ce projet exécute localement une Lambda AWS (fichier `index.mjs`) avec Docker. Elle :
- Lit des fichiers CSV ou Excel depuis un bucket S3
- Valide et nettoie les données
- Insère ou met à jour les entrées dans une instance Strapi
- Loggue les erreurs dans une collection dédiée (`import-errors`)

---

## Prérequis

- Node.js 18+
- Docker
- Un compte AWS avec un utilisateur IAM (clé + secret)
- Une instance Strapi accessible

---

## 📁 Structure

```
lambda/
├── index.mjs
├── Dockerfile
├── package.json
├── .env.local
├── .dockerignore
```

---

## Dockerfile

```Dockerfile
FROM node:18

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "index.mjs"]
```

---

## .env.local

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-3

StrapiUrl=
StrapiToken=
LOCAL=true
```
---

## Lancer en local

```bash
docker build -t lambda-local .
docker run --env-file .env.local lambda-local
```

---

## .dockerignore

```
node_modules
.env.local
npm-debug.log
```

---
