# 🏦 FraudExia — Détection de Fraude Bancaire par IA

> **Système intelligent de détection et prévention de fraude sur transactions bancaires**  
> **Stack:** Java 17 Spring Boot · TypeScript Angular · Python ML · MySQL

---

## 📋 Architecture

### **Backend** — Spring Boot REST API
- **Port:** 8089
- **Fonctionnalités:** CRUD Réclamations · Validation · Persistance MySQL
- **Fichiers clés:** `backend/src/main/java/.../GestionReclamationApplication.java`

### **Frontend** — Angular SPA
- **Port:** 4200
- **Fonctionnalités:** Dashboard Admin · Fraud Reports · Data Analyst Dashboard
- **Fichiers clés:** `frontend/src/app/app.routes.ts` · `frontend/src/app/components/dashboards/`

### **ML Pipeline** — Python Micro-service
- **Port:** 5000
- **Modèles:** Random Forest · XGBoost · Logistic Regression (détection de fraude)
- **Dataset:** Credit Card Fraud Detection (283 726 transactions)
- **Fichiers clés:** `fraud_analysis.py` · `FRAUD_DETECTION_REPORT.md`

---

## 🚀 Quick Start

### Prérequis
```bash
# Backend
- Java 17+
- Maven 3.8+
- MySQL 8.0+

# Frontend
- Node.js 18+
- Angular CLI 17+

# ML
- Python 3.10+
```

### Installation

#### 1. Base de données MySQL
```sql
CREATE DATABASE gestion_reclamation;
```

#### 2. Backend
```bash
cd backend
mvn clean install
mvn spring-boot:run
# Accès: http://localhost:8089/api/reclamations
```

#### 3. Frontend
```bash
cd frontend
npm install
ng serve --open
# Accès: http://localhost:4200
```

#### 4. ML Pipeline
```bash
cd ml
pip install -r requirements.txt
python app.py
# Service: http://localhost:5000/predict
```

---

## 📊 Interface Data Analyst

Route dédiée pour explorer l'analyse ML complète :

**🔗 Accès :** `http://localhost:4200/data-analyst`

Ou via le bouton **🔬 Data Analyst** dans le Admin Dashboard.

### 4 Onglets complets :

| Onglet | Contenu |
|--------|---------|
| **📦 Dataset** | KPI · Distribution classes · Stats descriptives · Pipeline preprocessing |
| **🔍 EDA** | Corrélations features · Analyse montants · Top 3 features · Galerie 10 figures |
| **🤖 Modèles** | Comparaison 3 modèles · Métriques · Matrices de confusion · Recommandation |
| **🚀 Améliorations** | 10 axes d'amélioration · Roadmap · Code Python · Résumé exécutif |

---

## 📈 Résultats ML — Random Forest (Recommandé)

| Métrique | Valeur |
|----------|--------|
| **Recall** | 0.800 (80% fraudes détectées) |
| **Precision** | 0.691 (69% alertes réelles) |
| **F1-Score** | 0.741 (meilleur équilibre) |
| **AUC-ROC** | 0.979 (meilleure discrimination) |
| **Fausses alertes** | 35 sur 56 746 transactions |

### Modèles comparés :
- ✅ **Random Forest** — RETENU (meilleur compromis)
- 🔵 Logistic Regression — Recall élevé mais trop de faux positifs
- 🟣 XGBoost — Potentiel élevé, nécessite tuning supplémentaire

---

## 📁 Structure du Projet

```
PROGET PI/
├── backend/                    → Spring Boot API
│   ├── src/main/java/.../
│   ├── src/main/resources/application.properties
│   └── pom.xml
├── frontend/                   → Angular SPA
│   ├── src/app/
│   │   ├── components/dashboards/data-analyst.component.*
│   │   ├── components/dashboards/admin-dashboard.component.*
│   │   ├── app.routes.ts
│   │   └── ...
│   ├── package.json
│   └── angular.json
├── data/                       → Datasets
│   ├── creditcard.csv
│   └── creditcard_clean.csv
├── fraud_analysis.py           → Pipeline ML complet
├── FRAUD_DETECTION_REPORT.md   → Rapport détaillé
├── .gitignore
└── README.md
```

---

## 🔧 Configuration

### `backend/src/main/resources/application.properties`
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/gestion_reclamation
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
server.port=8089
```

### `frontend/src/environments/environment.ts`
```typescript
export const environment = {
  apiUrl: 'http://localhost:8089/api',
  mlServiceUrl: 'http://localhost:5000'
};
```

---

## 📊 Figures générées

10 visualisations sauvegardées dans `fraud_outputs/` :
- `01_class_distribution.png` — Distribution des classes
- `02_amount_distribution.png` — Montants frauduleux vs légitimes
- `03_feature_correlation.png` — Corrélation features
- `04_heatmap_top10.png` — Heatmap des 10 meilleures features
- `05_boxplots_top6.png` — Boxplots comparatifs
- `06_confusion_matrices.png` — Matrices de confusion (3 modèles)
- `07_roc_curves.png` — Courbes ROC
- `08_precision_recall_curves.png` — Courbes Precision-Recall
- `09_feature_importance_rf.png` — Importance Random Forest
- `10_feature_importance_xgb.png` — Importance XGBoost

---

## 🎯 Plan d'Amélioration

### Court terme (Semaine 1)
- [ ] A. Threshold tuning → Recall 0.92+
- [ ] B. Hyperparameter tuning Random Forest
- [ ] C. Hyperparameter tuning XGBoost

### Moyen terme (Semaines 2-3)
- [ ] D. SMOTETomek / ADASYN
- [ ] E. Stacking ensemble (LR + RF + XGB)
- [ ] F. Cross-validation 5-fold
- [ ] G. Feature engineering (hour_of_day, is_night, etc.)

### Long terme (Semaines 4+)
- [ ] H. Deep Learning MLP
- [ ] I. Autoencoder anomalie detection
- [ ] J. MLOps monitoring production

---

## 👥 Équipe

| Rôle | Personne |
|------|----------|
| **Backend Developer** | — |
| **Frontend Developer** | — |
| **Data Scientist / ML Engineer** | Mohamed Abidi |
| **DevOps** | — |

---

## 📝 Licence

Propriétaire — Projet académique PFA 4ème année

---

## 📞 Support

Pour toute question ou contribution, contacter : **abidimoham95@gmail.com**

---

*Dernière mise à jour : 14 avril 2026*

