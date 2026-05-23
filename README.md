# Telxia

> Votre système intelligent de gestion de candidatures et de prospection.

<img width="1536" height="1024" alt="ChatGPT Image 23 mai 2026, 19_43_36" src="https://github.com/user-attachments/assets/99cdc35e-8ebb-4c49-87dd-0d5333cc579a" />


## 🚀 Présentation

Telxia est une plateforme SaaS moderne conçue pour aider les étudiants, alternants, freelances et professionnels à gérer efficacement leurs candidatures, campagnes email et opportunités professionnelles.

Le projet combine :

* suivi de candidatures
* gestion documentaire cloud
* automatisation email Gmail
* analytics avancés
* pipeline Kanban
* campagnes email intelligentes
* dashboard productivité

L’objectif est de transformer la recherche d’emploi en un workflow structuré, moderne et optimisé.

---

# ✨ Fonctionnalités principales

## 📋 Gestion des candidatures

* Création et suivi des candidatures
* Pipeline Kanban interactif
* Gestion des statuts
* Notes et commentaires
* Historique des actions
* Filtres avancés
* Vue tableau et dashboard

---

## 📁 Gestion documentaire

* Upload de CV et documents
* Stockage AWS S3
* Bibliothèque de documents
* Réutilisation dans les candidatures
* Gestion des pièces jointes
* Téléchargement sécurisé

---

## 📧 Campagnes Email

* Intégration Gmail OAuth multi-utilisateur
* Création de campagnes email
* Gestion des contacts
* Templates email
* Pièces jointes
* Logs d’envoi
* Programmation des campagnes
* Suivi progression

---

## 📊 Dashboard & Analytics

* Statistiques temps réel
* KPI candidatures
* Taux de réponses
* Répartition des contrats
* Graphiques interactifs
* Filtres temporels
* Heatmaps activité

---

## 🔐 Authentification & Sécurité

* JWT Authentication
* OAuth Google/Gmail
* Reset mot de passe
* Emails transactionnels
* Multi-utilisateur sécurisé
* Isolation des tokens Gmail

---

# 🧱 Stack Technique

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* React Query
* Lucide Icons

## Backend

* FastAPI
* Python
* SQLAlchemy Async
* Alembic
* PostgreSQL

## Infrastructure

* Docker
* Docker Compose
* AWS EC2
* AWS S3
* Caddy / Nginx

## APIs & Services

* Gmail API
* Google OAuth 2.0
* Resend Email API

---

# ☁️ Architecture

```text
Internet
↓
HTTPS Reverse Proxy (Caddy/Nginx)
↓
Frontend React (Docker)
↓
Backend FastAPI (Docker)
↓
PostgreSQL (Docker)
↓
AWS S3 + Gmail API + Resend
```

---

# 🎨 Design System

Inspirations UX/UI :

* Linear
* Notion
* Stripe
* Raycast
* Mailchimp

Palette principale :

```text
#4B8491
#8BA5AD
#C2D1D5
#8B9BAE
#344D5C
```

Philosophie design :

* SaaS premium
* Dark mode first
* Workflow centré utilisateur
* Interface minimaliste
* Navigation fluide
* Responsive design

---

# 🔧 Installation Locale

## 1. Cloner le projet

```bash
git clone https://github.com/Akramo10/talexia.git
cd talexia
```

---

## 2. Variables d’environnement

Créer un fichier `.env` :

```env
DATABASE_URL=
JWT_SECRET_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
```

---

## 3. Lancer avec Docker

```bash
docker compose up -d --build
```

---

## 4. Frontend

```text
http://localhost:5173
```

## 5. Backend API

```text
http://localhost:8000
```

---

# 🌍 Déploiement Production

Le projet est conçu pour être déployé sur :

* AWS EC2
* Docker Compose
* PostgreSQL
* AWS S3
* HTTPS avec Caddy

Fonctionnalités production :

* HTTPS automatique
* Variables sécurisées
* Dockerized architecture
* Reverse proxy
* Stockage cloud
* Emails transactionnels

---

# 📈 Fonctionnalités SaaS Avancées

* Gestion abonnements
* Trial gratuit
* Dashboard admin
* Analytics plateforme
* Monitoring utilisateurs
* Campagnes programmées
* Logs temps réel
* Notifications email

---

# 🛡️ Sécurité

* Isolation des tokens OAuth
* JWT sécurisé
* Variables d’environnement protégées
* Secrets non versionnés
* Upload sécurisé S3
* Contrôle multi-utilisateur

---

# 📸 Captures d’écran

## Dashboard

*Ajouter screenshot dashboard*

## Campagnes Email

*Ajouter screenshot campagnes*

## Analytics

*Ajouter screenshot analytics*

## Documents

*Ajouter screenshot documents*

---

# 📌 Roadmap

## En cours

* IA génération email
* IA optimisation CV
* CRM recruteurs
* Notifications temps réel
* Synchronisation agenda

## Futur

* Extension Chrome
* Mobile app
* AI assistant carrière
* Multi-organisation
* Team collaboration

---

# 👨‍💻 Auteur

## Akram Ouadghiri Bencherif

Développeur Full-Stack orienté SaaS, Productivité et Automatisation.

* GitHub : [https://github.com/Akramo10](https://github.com/Akramo10)
* Projet : [https://telxia.fr](https://telxia.fr)

---

# ⭐ Vision

> Telxia a pour ambition de devenir un véritable « Career Operating System » moderne permettant aux utilisateurs de structurer, automatiser et accélérer leur progression professionnelle.

---

# 📄 Licence

Ce projet est distribué sous licence MIT.
