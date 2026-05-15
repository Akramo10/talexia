# Deploiement Ubuntu VPS

Ce mode deploiement lance toute l'application avec Docker Compose :

- PostgreSQL
- FastAPI
- React compile et servi par Nginx
- Proxy `/api/v1` vers le backend

## 1. Se connecter au VPS

Depuis ton PC :

```bash
ssh root@IP_DU_VPS
```

Remplace `IP_DU_VPS` par l'adresse IP de ton serveur.

## 2. Installer Docker sur Ubuntu

```bash
apt update
apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${UBUNTU_CODENAME:-$VERSION_CODENAME}) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verifier :

```bash
docker --version
docker compose version
```

## 3. Envoyer le projet sur le VPS

Option simple avec Git :

```bash
git clone URL_DE_TON_REPO
cd Dashboard_alternance
```

Option depuis ton PC avec `scp`, a lancer dans PowerShell depuis le dossier parent :

```powershell
scp -r .\Dashboard_alternance root@IP_DU_VPS:/opt/Dashboard_alternance
```

Puis sur le VPS :

```bash
cd /opt/Dashboard_alternance
```

## 4. Creer le fichier `.env`

```bash
cp .env.example .env
nano .env
```

Change au minimum `POSTGRES_PASSWORD`, puis garde `DATABASE_URL` coherent avec ce mot de passe.

Exemple :

```env
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=mot_de_passe_tres_solide
POSTGRES_DB=crm_db
DATABASE_URL=postgresql+asyncpg://crm_user:mot_de_passe_tres_solide@db:5432/crm_db
```

## 5. Lancer l'application

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verifier les conteneurs :

```bash
docker compose -f docker-compose.prod.yml ps
```

Voir les logs :

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 6. Ouvrir l'application

Dans le navigateur :

```text
http://IP_DU_VPS
```

L'API est disponible via :

```text
http://IP_DU_VPS/api/v1
```

## 7. Pare-feu Ubuntu

Si `ufw` est actif :

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
ufw status
```

## Commandes utiles

Redemarrer :

```bash
docker compose -f docker-compose.prod.yml restart
```

Mettre a jour apres modification du code :

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Arreter :

```bash
docker compose -f docker-compose.prod.yml down
```

Sauvegarder la base :

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U crm_user crm_db > backup.sql
```
