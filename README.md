# 🚀 Copilote Intelligent pour le Support IT (SAP Delivery)

Un outil d'assistance basé sur l'Intelligence Artificielle (RAG) conçu pour aider les équipes de support IT de niveau 1 et 2 à résoudre plus rapidement les incidents SAP. Le système analyse la description du problème et suggère un *Runbook* (procédure de résolution) basé sur l'historique des tickets résolus.

![Interface du Copilote](./demo-interface.png)

## 🏗️ Architecture du Projet

Ce projet est découpé en une architecture microservices Full-Stack :

1. **Frontend (React / Vite) :** Interface utilisateur interactive permettant de soumettre des tickets.
2. **Orchestrateur (NestJS) :** Backend Node.js qui gère le routage et assure la persistance de l'historique des requêtes via une base de données **SQLite** (TypeORM).
3. **Moteur IA (Python / FastAPI) :** Service embarquant un pipeline **RAG** (Retrieval-Augmented Generation) avec **ChromaDB** pour la recherche sémantique des anciens tickets SAP pertinents.

---

## ⚙️ 1. Prérequis et Installation

Assurez-vous d'avoir installé sur votre machine :
* [Node.js](https://nodejs.org/) (v16 ou supérieur)
* [Python](https://www.python.org/) (v3.9 ou supérieur)

### Installation du Cerveau IA (Python)
Ouvrez un terminal et placez-vous à la racine du projet, puis naviguez dans le service Python :
```bash
cd ai-service-python
```

Il est fortement recommandé de créer un environnement virtuel vierge pour installer les dépendances :
```bash
# 1. Création de l'environnement virtuel
python -m venv venv

# 2. Activation de l'environnement
# Sur Windows :
venv\Scripts\activate
# Sur Mac/Linux :
source venv/bin/activate
```

Installez ensuite les dépendances exactes du projet :
```bash
pip install -r requirements.txt
```

Générez la base de données vectorielle (à faire une seule fois lors de la première installation) :
```bash
python build_vector_db.py
```

### Installation de l'Orchestrateur (NestJS)
Ouvrez un terminal et naviguez dans le dossier backend :
```bash
cd 2-backend-nestjs
```
Installez les paquets Node :
```bash
npm install
```

### Installation de l'Interface (React)
Ouvrez un terminal et naviguez dans le dossier frontend :
```bash
cd 1-frontend-react
```
Installez les dépendances Vite/React :
```bash
npm install
```

---

## 🚀 2. Comment lancer le projet au quotidien

Pour faire fonctionner l'application complète, vous devez lancer les 3 services simultanément dans **3 terminaux séparés**.

**Terminal 1 : L'IA (Moteur de recherche RAG)**
```bash
cd ai-service-python
# N'oubliez pas d'activer l'environnement virtuel (ex: venv\Scripts\activate)
python main.py
```
*(Le service tourne sur http://localhost:8000)*

**Terminal 2 : L'Orchestrateur (Base de données et API)**
```bash
cd 2-backend-nestjs
npm run start:dev
```
*(Le service tourne sur http://localhost:3000)*

**Terminal 3 : L'Interface (Dashboard Support)**
```bash
cd 1-frontend-react
npm run dev
```
*(L'interface tourne sur http://localhost:5173)*

👉 **Une fois les 3 terminaux lancés, ouvrez votre navigateur sur [http://localhost:5173](http://localhost:5173) pour utiliser le Copilote !**

---

## 🧪 3. Tests Automatisés

Le microservice Python inclut des tests d'intégration (via `pytest`) pour valider le bon fonctionnement de l'API et la robustesse des requêtes.
Pour lancer les tests, placez-vous dans le dossier `ai-service-python` (avec votre environnement virtuel activé) et exécutez :
```bash
pytest test/test_main.py -v -s
```

---
*Projet développé dans le cadre d'un PoC d'industrialisation IA pour les opérations SAP.*