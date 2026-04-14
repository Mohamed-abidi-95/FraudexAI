# 🏦 Rapport Complet — Détection de Fraude Bancaire par Machine Learning

> **Projet :** FraudExia — Système de détection de fraude sur transactions par carte bancaire  
> **Date :** Avril 2026  
> **Dataset :** Credit Card Fraud Detection (Kaggle)  
> **Stack ML :** Python · scikit-learn · XGBoost · imbalanced-learn · pandas · seaborn

---

## 📋 Table des matières

1. [Description du Dataset](#1--description-du-dataset)
2. [Audit Qualité & Statistiques](#2--audit-qualité--statistiques-descriptives)
3. [Exploration des Données (EDA)](#3--exploration-des-données-eda)
4. [Preprocessing & Gestion du Déséquilibre](#4--preprocessing--gestion-du-déséquilibre)
5. [Les 3 Modèles de Prédiction](#5--les-3-modèles-de-prédiction)
6. [Résultats & Comparaison](#6--résultats--comparaison)
7. [Recommandation & Modèle Retenu](#7--recommandation--modèle-retenu)
8. [Intégration Plateforme FraudExia](#8--intégration-plateforme-fraudexia)
9. [Plan d'Amélioration des Performances](#9--plan-damélioration-des-performances)

---

## 1 · Description du Dataset

### Origine

Le dataset **Credit Card Fraud Detection** est un jeu de données réel fourni par des institutions bancaires européennes, rendu public sur [Kaggle](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud). Il contient des transactions par carte bancaire réalisées sur **deux jours consécutifs** en septembre 2013.

### Structure

| Caractéristique | Valeur |
|---|---|
| **Fichier source** | `creditcard.csv` / `creditcard_clean.csv` |
| **Nombre de lignes** | 284 807 transactions |
| **Après nettoyage (doublons)** | 283 726 transactions |
| **Nombre de colonnes** | 31 |
| **Taille sur disque** | ~143 MB (raw) |
| **Variable cible** | `Class` (0 = légitime, 1 = fraude) |

### Description des colonnes

| Colonne | Type | Description |
|---|---|---|
| `Time` | float64 | Secondes écoulées depuis la 1ʳᵉ transaction du dataset |
| `V1` à `V28` | float64 | **Composantes PCA** — features originales anonymisées par transformation PCA pour des raisons de confidentialité bancaire |
| `Amount` | float64 | Montant de la transaction en euros (€) |
| `Class` | float64 | **Variable cible** : `0` = transaction légitime · `1` = transaction frauduleuse |

> ⚠️ **Important :** Les colonnes `V1`–`V28` sont déjà le résultat d'une transformation **PCA (Analyse en Composantes Principales)**. Les features originales (numéro de carte, localisation, commerçant, etc.) ne sont pas disponibles pour des raisons de confidentialité RGPD. Seules `Time` et `Amount` conservent leur sens métier direct.

---

## 2 · Audit Qualité & Statistiques Descriptives

### 2.1 Qualité des données

| Vérification | Résultat | Action |
|---|---|---|
| Valeurs manquantes | ✅ **Aucune** (0 sur 31 colonnes) | Aucune |
| Doublons | ⚠️ **1 081 lignes dupliquées** | Supprimés → 283 726 lignes |
| Types de colonnes | ✅ Tous `float64` | Aucune conversion nécessaire |
| Variables catégorielles | ✅ Aucune | Pas d'encodage nécessaire |
| Outliers extrêmes | ⚠️ `Amount` jusqu'à 25 691 € | Gérés par StandardScaler |

### 2.2 Distribution de la variable cible — Déséquilibre de classes

```
Classe 0 (Légitime) : 283 253 transactions  ████████████████████████████████████████ 99.83%
Classe 1 (Fraude)   :     473 transactions  ░                                          0.17%
```

| Métrique | Valeur |
|---|---|
| Transactions légitimes | **283 253** (99.83%) |
| Transactions frauduleuses | **473** (0.17%) |
| Ratio de déséquilibre | **1 fraude pour 599 légitimes** |

> 🔴 **Déséquilibre extrême.** Un modèle naïf qui prédit toujours "légitime" atteindrait une accuracy de **99.83%** sans jamais détecter une seule fraude. L'accuracy est donc une métrique **inutilisable** ici. Les métriques pertinentes sont le **Recall**, le **F1-Score** et l'**AUC-ROC**.

### 2.3 Statistiques descriptives — Variables clés

| Statistique | Time (s) | Amount (€) | Class |
|---|---|---|---|
| **count** | 283 726 | 283 726 | 283 726 |
| **mean** | 94 811 | 88.47 € | 0.0017 |
| **std** | 47 481 | 250.40 € | 0.0408 |
| **min** | 0 | 0.00 € | 0 |
| **25%** | 54 204 | 5.60 € | 0 |
| **median** | 84 692 | 22.00 € | 0 |
| **75%** | 139 298 | 77.51 € | 0 |
| **max** | 172 792 | 25 691.16 € | 1 |

### 2.4 Comparaison des montants : Fraude vs Légitime

| Métrique | Fraudes 🔴 | Légitimes 🟢 |
|---|---|---|
| Montant moyen | **123.87 €** | 88.41 € |
| Montant médian | ~22 € | ~22 € |
| Montant maximum | 2 125.87 € | 25 691.16 € |
| Montant minimum | 0 € | 0 € |

> 💡 Les fraudes ont un montant moyen **40% plus élevé** que les légitimes, mais leur montant maximum est bien inférieur. Les très grandes transactions (>5 000 €) sont rarement frauduleuses — les fraudeurs évitent les montants qui déclencheraient des alertes manuelles immédiates.

---

## 3 · Exploration des Données (EDA)

### 3.1 Features les plus discriminantes pour la fraude

Corrélation (valeur absolue) entre chaque feature et la variable cible :

| Rang | Feature | |Corrélation| | Interprétation |
|---|---|---|---|
| 1 | `V17` | **0.3135** | Composante PCA très discriminante |
| 2 | `V14` | **0.2934** | Fortement corrélée aux patterns de fraude |
| 3 | `V12` | **0.2507** | Signal fort |
| 4 | `V10` | **0.2070** | Signal modéré-fort |
| 5 | `V16` | **0.1872** | Signal modéré |
| 6 | `V3` | **0.1823** | Signal modéré |
| 7 | `V7` | **0.1723** | Signal modéré |
| 8 | `V11` | **0.1491** | Signal faible-modéré |
| … | `Time`, `Amount` | < 0.05 | Faible corrélation directe |

> 💡 Les features `V17`, `V14`, `V12` sont les **signaux les plus forts** pour identifier une fraude. Ces composantes PCA captent probablement des patterns comportementaux liés à la localisation géographique inhabituelle, l'heure de transaction, et la catégorie du commerçant.

### 3.2 Figures générées (dossier `fraud_outputs/`)

| Fichier | Contenu |
|---|---|
| `01_class_distribution.png` | Diagramme en barres + camembert de la distribution des classes |
| `02_amount_distribution.png` | Histogramme et boxplot des montants (fraude vs légitime) |
| `03_feature_correlation.png` | Corrélation des features avec la variable cible (barplot) |
| `04_heatmap_top10.png` | Heatmap de corrélation des 10 features les plus importantes |
| `05_boxplots_top6.png` | Boxplots des 6 features les plus discriminantes par classe |
| `06_confusion_matrices.png` | Matrices de confusion des 3 modèles |
| `07_roc_curves.png` | Courbes ROC comparatives des 3 modèles |
| `08_precision_recall_curves.png` | Courbes Precision-Recall comparatives |
| `09_feature_importance_rf.png` | Importance des features — Random Forest (Top 15) |
| `10_feature_importance_xgb.png` | Importance des features — XGBoost (Top 15) |

---

## 4 · Preprocessing & Gestion du Déséquilibre

### 4.1 Pipeline de preprocessing

```
Dataset brut (284 807 lignes)
        │
        ▼
[1] Suppression des doublons          → 283 726 lignes
        │
        ▼
[2] Vérification valeurs manquantes   → Aucune action requise
        │
        ▼
[3] StandardScaler sur Time & Amount  → Time_scaled, Amount_scaled
    (V1–V28 déjà normalisés par PCA)
        │
        ▼
[4] Séparation X (features) / y (Class)
        │
        ▼
[5] Train/Test split stratifié 80/20
    ├── X_train : 226 980 samples (378 fraudes)
    └── X_test  :  56 746 samples  (95 fraudes)
        │
        ▼
[6] SMOTE sur X_train UNIQUEMENT
    ├── Avant : {0: 226 602, 1: 378}
    └── Après : {0: 226 602, 1: 226 602}  ← Classes équilibrées ✅
```

### 4.2 Pourquoi SMOTE et pas autre chose ?

| Technique | Description | Avantages | Inconvénients | Choix ? |
|---|---|---|---|---|
| **SMOTE** | Génère des fraudes synthétiques par interpolation entre voisins | Diversifie les exemples, évite l'overfitting du sur-échantillonnage naïf | Peut créer des exemples "irréalistes" | ✅ **Retenu** |
| Under-sampling | Supprime des légitimes | Simple, rapide | Perd de l'information précieuse | ❌ |
| Class weight | Pénalise les erreurs sur la fraude | Aucun nouveau sample | Moins efficace sur déséquilibre extrême | ✅ Utilisé en complément |
| ADASYN | Génère plus de samples dans les zones difficiles | Adaptatif | Plus lent | Option future |

> ⚠️ **Règle critique :** SMOTE est appliqué **uniquement sur le train set**. Appliquer SMOTE avant le split contaminerait le test set avec des données synthétiques et donnerait des métriques artificiellement gonflées.

### 4.3 Paramètres du split

| Paramètre | Valeur | Justification |
|---|---|---|
| `test_size` | 0.20 (20%) | Standard industrie — assez grand pour 95 fraudes réelles |
| `random_state` | 42 | Reproductibilité des résultats |
| `stratify=y` | ✅ Activé | Garantit le même ratio fraude/légit dans train et test |

---

## 5 · Les 3 Modèles de Prédiction

### Modèle 1 — Logistic Regression (Baseline)

```python
LogisticRegression(
    max_iter=1000,
    random_state=42,
    class_weight='balanced'   # pénalise davantage les erreurs sur la fraude
)
```

| Aspect | Détail |
|---|---|
| **Type** | Modèle linéaire probabiliste |
| **Entraîné sur** | X_train après SMOTE (453 204 samples) |
| **Complexité** | Faible — O(n·p) |
| **Interprétabilité** | ⭐⭐⭐⭐⭐ Très haute (coefficients = poids des features) |
| **Hypothèse** | Séparabilité linéaire entre fraude et légitime |
| **Rôle dans ce projet** | Baseline de référence |

**Pourquoi l'inclure ?** La LR est le modèle le plus simple et le plus interprétable. Si elle performe bien, inutile de complexifier. Si elle échoue, cela valide le besoin de modèles non-linéaires.

---

### Modèle 2 — Random Forest

```python
RandomForestClassifier(
    n_estimators=200,      # 200 arbres de décision
    max_depth=12,          # profondeur max pour éviter l'overfitting
    class_weight='balanced',
    random_state=42,
    n_jobs=-1              # parallélisation sur tous les CPU
)
```

| Aspect | Détail |
|---|---|
| **Type** | Ensemble d'arbres de décision (bagging) |
| **Entraîné sur** | X_train après SMOTE (453 204 samples) |
| **Complexité** | Moyenne — O(n·p·log(n)·T) |
| **Interprétabilité** | ⭐⭐⭐ Moyenne (feature importance disponible) |
| **Atouts** | Robuste aux outliers, gère la non-linéarité, pas de normalisation requise |
| **Rôle dans ce projet** | Modèle robuste et équilibré |

**Pourquoi l'inclure ?** Le Random Forest est particulièrement adapté aux datasets déséquilibrés grâce à son paramètre `class_weight` et à sa nature ensembliste qui réduit la variance.

---

### Modèle 3 — XGBoost

```python
XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    scale_pos_weight=599,   # ratio légit/fraude → pénalise fortement les FN
    eval_metric='logloss',
    random_state=42,
    n_jobs=-1
)
```

| Aspect | Détail |
|---|---|
| **Type** | Ensemble par boosting gradient (arbres séquentiels) |
| **Entraîné sur** | X_train après SMOTE (453 204 samples) |
| **Complexité** | Haute — O(n·p·T) itératif |
| **Interprétabilité** | ⭐⭐ Faible (boîte noire, mais SHAP disponible) |
| **Atouts** | Performances état de l'art, gère nativement le déséquilibre via `scale_pos_weight` |
| **Rôle dans ce projet** | Modèle haute performance |

**Pourquoi l'inclure ?** XGBoost domine les compétitions Kaggle de détection de fraude. Son paramètre `scale_pos_weight` est spécialement conçu pour les problèmes déséquilibrés.

---

## 6 · Résultats & Comparaison

### 6.1 Tableau comparatif — Métriques sur le Test Set (56 746 samples, 95 vraies fraudes)

| Modèle | Precision 🎯 | **Recall 🚨** | F1-Score ⚖️ | AUC-ROC 📈 |
|---|---|---|---|---|
| Logistic Regression | 0.053 | **0.874** | 0.100 | 0.962 |
| **Random Forest** ⭐ | **0.691** | 0.800 | **0.741** | **0.979** |
| XGBoost | 0.165 | 0.832 | 0.275 | 0.958 |

### 6.2 Matrices de confusion détaillées

#### Logistic Regression

```
                  Prédit Légitime   Prédit Fraude
Réel Légitime         54 914            1 737      ← 1 737 fausses alertes !
Réel Fraude               12               83      ← 12 fraudes manquées
```
- **Vrais Positifs (TP)** = 83 fraudes correctement détectées
- **Faux Négatifs (FN)** = 12 fraudes manquées ← objectif à minimiser
- **Faux Positifs (FP)** = 1 737 ← transactions légitimes bloquées à tort !

#### Random Forest ⭐

```
                  Prédit Légitime   Prédit Fraude
Réel Légitime         56 616               35      ← seulement 35 fausses alertes
Réel Fraude               19               76      ← 19 fraudes manquées
```
- **Vrais Positifs (TP)** = 76 fraudes détectées
- **Faux Négatifs (FN)** = 19 fraudes manquées
- **Faux Positifs (FP)** = 35 ← très peu de blocages injustifiés ✅

#### XGBoost

```
                  Prédit Légitime   Prédit Fraude
Réel Légitime         56 143              508      ← 508 fausses alertes
Réel Fraude               16               79      ← 16 fraudes manquées
```
- **Vrais Positifs (TP)** = 79 fraudes détectées
- **Faux Négatifs (FN)** = 16 fraudes manquées
- **Faux Positifs (FP)** = 508

### 6.3 Interprétation des métriques

| Métrique | Formule | Signification métier |
|---|---|---|
| **Precision** | TP / (TP + FP) | Sur 100 alertes fraude générées, combien sont réelles ? |
| **Recall** | TP / (TP + FN) | Sur 100 vraies fraudes, combien sont détectées ? |
| **F1-Score** | 2 × P × R / (P + R) | Compromis Precision/Recall — utile sur classes déséquilibrées |
| **AUC-ROC** | Aire sous courbe ROC | Capacité globale à distinguer fraude de légitime (1.0 = parfait) |

### 6.4 Analyse critique par modèle

**🔵 Logistic Regression — Recall 0.874, Precision 0.053**
- Détecte 87% des fraudes → excellent
- Mais génère **1 737 fausses alertes** par tranche de 56 746 transactions
- Soit ~**3%** des transactions légitimes bloquées inutilement
- ❌ **Inutilisable en production** — expérience client catastrophique

**🟢 Random Forest — Recall 0.800, Precision 0.691 ← MEILLEUR ÉQUILIBRE**
- Détecte 80% des fraudes (76/95)
- Seulement **35 fausses alertes** → Precision de 69%
- **Meilleur AUC-ROC** (0.9786) → meilleure séparation globale des classes
- **Meilleur F1-Score** (0.741) → meilleur compromis Precision/Recall
- ✅ **Recommandé pour la production**

**🟣 XGBoost — Recall 0.832, Precision 0.165**
- Détecte 83% des fraudes (79/95) → légèrement meilleur que RF en Recall
- Mais génère **508 fausses alertes** → 3x plus que Random Forest
- AUC-ROC légèrement inférieur au RF (0.958 vs 0.979)
- ⚠️ Potentiel plus élevé mais nécessite un tuning approfondi

---

## 7 · Recommandation & Modèle Retenu

### 🏆 Modèle recommandé : Random Forest

```
┌──────────────────────────────────────────────────────────────┐
│  MODÈLE RECOMMANDÉ POUR PRODUCTION : Random Forest           │
│                                                              │
│  Recall    : 0.800   (80 fraudes détectées sur 95)           │
│  Precision : 0.691   (69% des alertes sont réelles)          │
│  F1-Score  : 0.741   (meilleur équilibre global)             │
│  AUC-ROC   : 0.979   (meilleure capacité discriminante)      │
└──────────────────────────────────────────────────────────────┘
```

### Justification métier

Dans un système bancaire réel, les coûts asymétriques sont :
- **Faux Négatif (FN)** = Fraude non détectée → perte financière directe + remboursement client + réputation
- **Faux Positif (FP)** = Transaction légitime bloquée → friction client, appels au support, résiliation

Le Random Forest offre le meilleur équilibre entre ces deux risques : il détecte **4 fraudes sur 5** tout en ne générant que **35 fausses alertes** sur 56 746 transactions — soit un taux de fausse alerte de seulement **0.06%** des transactions légitimes.

---

## 8 · Intégration Plateforme FraudExia

### 8.1 Architecture d'intégration

```
[Transaction bancaire entrante]
          │
          ▼
[API FastAPI / Flask — fraud_predict.py]
          │
          ├── Preprocessing : StandardScaler(Time, Amount)
          │
          ├── Prédiction : RandomForest.predict_proba(X)
          │
          ├── Score de fraude : probabilité ∈ [0.0, 1.0]
          │
          └── Décision selon seuil :
               ├── score < 0.30  → ✅ Approuver
               ├── 0.30–0.70    → ⚠️  Vérification manuelle
               └── score > 0.70 → 🔴 Bloquer + alerte temps réel
                         │
                         ▼
              [Dashboard FraudExia Angular]
                         │
                         ├── Alerte admin en temps réel
                         ├── Historique des transactions suspectes
                         └── Métriques de performance du modèle
```

### 8.2 Endpoints API à implémenter

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/fraud/predict` | `POST` | Prédiction sur une transaction unique |
| `/api/fraud/batch` | `POST` | Prédiction sur un lot de transactions |
| `/api/fraud/score` | `GET` | Métriques de performance du modèle en production |
| `/api/fraud/alerts` | `GET` | Liste des alertes récentes (SSE / WebSocket) |
| `/api/fraud/feedback` | `POST` | Retour utilisateur (faux positif confirmé) |

### 8.3 Format des données échangées

**Requête :**
```json
{
  "transaction_id": "TXN-2026-04-13-00042",
  "time": 43200.0,
  "amount": 249.99,
  "v1": -1.359807,
  "v2": -0.072781,
  "v3": 2.536347,
  "...": "...",
  "v28": -0.021053
}
```

**Réponse :**
```json
{
  "transaction_id": "TXN-2026-04-13-00042",
  "fraud_score": 0.847,
  "decision": "BLOCKED",
  "confidence": "HIGH",
  "top_features": ["V14", "V17", "V12"],
  "processing_time_ms": 12
}
```

### 8.4 Fichiers du projet ML

| Fichier | Rôle |
|---|---|
| `fraud_analysis.py` | Script complet d'analyse + entraînement des 3 modèles |
| `fraud_outputs/` | Figures générées (10 visualisations PNG) |
| `backend/data/model_metrics.json` | Métriques stockées pour le dashboard |
| `models/` | Modèles entraînés sérialisés (.pth pour PyTorch, à compléter avec .pkl) |

---

## 9 · Plan d'Amélioration des Performances

### 9.1 Améliorations immédiates (court terme — semaine 1)

#### A. Optimisation du seuil de décision (threshold tuning)

Le seuil de 0.5 par défaut n'est pas optimal pour les classes déséquilibrées. En le baissant, on augmente le Recall au prix de la Precision.

```python
from sklearn.metrics import precision_recall_curve
import numpy as np

# Trouver le seuil optimal selon votre tolérance métier
precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba_rf)

# Seuil qui maximise le F1
f1_scores = 2 * precisions * recalls / (precisions + recalls + 1e-8)
optimal_threshold = thresholds[np.argmax(f1_scores)]
print(f"Seuil optimal : {optimal_threshold:.3f}")

# Seuil qui garantit Recall ≥ 0.92
idx = np.where(recalls >= 0.92)[0]
threshold_92_recall = thresholds[idx[-1]]
print(f"Seuil pour Recall ≥ 92% : {threshold_92_recall:.3f}")
```

**Impact estimé :** Passer le Recall de 0.80 à 0.90+ sans changer le modèle.

---

#### B. Hyperparameter Tuning — Random Forest

```python
from sklearn.model_selection import RandomizedSearchCV

param_grid = {
    'n_estimators':      [200, 300, 500],
    'max_depth':         [10, 15, 20, None],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf':  [1, 2, 4],
    'max_features':      ['sqrt', 'log2'],
    'class_weight':      ['balanced', 'balanced_subsample']
}

rf_search = RandomizedSearchCV(
    RandomForestClassifier(random_state=42, n_jobs=-1),
    param_distributions=param_grid,
    n_iter=50,
    cv=5,
    scoring='recall',    # optimiser le Recall
    random_state=42,
    n_jobs=-1
)
rf_search.fit(X_train_sm, y_train_sm)
print("Meilleurs params :", rf_search.best_params_)
```

**Impact estimé :** +3 à +8% sur le Recall.

---

#### C. Hyperparameter Tuning — XGBoost

```python
from sklearn.model_selection import RandomizedSearchCV

xgb_param_grid = {
    'n_estimators':     [200, 400, 600],
    'max_depth':        [4, 6, 8, 10],
    'learning_rate':    [0.01, 0.05, 0.1, 0.2],
    'subsample':        [0.6, 0.8, 1.0],
    'colsample_bytree': [0.6, 0.8, 1.0],
    'min_child_weight': [1, 3, 5],
    'gamma':            [0, 0.1, 0.5],
    'scale_pos_weight': [100, 200, 400, 599]
}

xgb_search = RandomizedSearchCV(
    xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss',
                      random_state=42, n_jobs=-1),
    param_distributions=xgb_param_grid,
    n_iter=60,
    cv=5,
    scoring='f1',
    random_state=42,
    n_jobs=-1
)
xgb_search.fit(X_train_sm, y_train_sm)
```

**Impact estimé :** XGBoost pourrait dépasser Random Forest avec le bon tuning.

---

### 9.2 Améliorations intermédiaires (moyen terme — semaines 2–3)

#### D. Remplacement de SMOTE par des techniques avancées

| Technique | Description | Avantage vs SMOTE |
|---|---|---|
| **SMOTE + Tomek Links** | SMOTE puis suppression des paires ambiguës aux frontières | Frontière de décision plus nette |
| **ADASYN** | Génère plus de samples dans les zones où le modèle se trompe | Adaptatif aux zones difficiles |
| **BorderlineSMOTE** | Génère des samples uniquement près de la frontière de décision | Plus pertinent que SMOTE uniforme |
| **BalancedBaggingClassifier** | Sous-échantillonnage dynamique à chaque arbre | Pas de génération artificielle |

```python
from imblearn.combine import SMOTETomek
from imblearn.over_sampling import ADASYN, BorderlineSMOTE

# Option 1 : SMOTETomek
smt = SMOTETomek(random_state=42)
X_train_smt, y_train_smt = smt.fit_resample(X_train, y_train)

# Option 2 : ADASYN
adasyn = ADASYN(random_state=42)
X_train_ada, y_train_ada = adasyn.fit_resample(X_train, y_train)
```

---

#### E. Stacking (Ensemble de modèles)

Combiner les 3 modèles en utilisant leurs prédictions comme features d'un méta-modèle :

```python
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression

stacking = StackingClassifier(
    estimators=[
        ('lr',  LogisticRegression(max_iter=1000, class_weight='balanced')),
        ('rf',  RandomForestClassifier(n_estimators=200, class_weight='balanced')),
        ('xgb', xgb.XGBClassifier(scale_pos_weight=599))
    ],
    final_estimator=LogisticRegression(),
    cv=5,
    passthrough=True    # inclut aussi les features originales
)
stacking.fit(X_train_sm, y_train_sm)
```

**Impact estimé :** +2 à +5% sur le F1-Score en exploitant la complémentarité des modèles.

---

#### F. Validation croisée stratifiée

Remplacer l'évaluation simple par une CV 5-fold pour des métriques plus robustes :

```python
from sklearn.model_selection import StratifiedKFold, cross_val_score

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_recall = cross_val_score(rf, X, y, cv=skf, scoring='recall')
cv_f1     = cross_val_score(rf, X, y, cv=skf, scoring='f1')

print(f"Recall CV moyen  : {cv_recall.mean():.4f} ± {cv_recall.std():.4f}")
print(f"F1-Score CV moyen: {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")
```

---

### 9.3 Améliorations avancées (long terme — semaines 4–6)

#### G. Feature Engineering sur Time et Amount

Extraire de nouvelles features à partir des colonnes disponibles :

```python
# Nouvelles features temporelles
df['hour_of_day']    = (df['Time'] % 86400) / 3600      # heure 0-24
df['is_night']       = ((df['hour_of_day'] < 6) | (df['hour_of_day'] > 22)).astype(int)
df['is_weekend']     = (df['Time'] // 86400 % 7 >= 5).astype(int)

# Features sur le montant
df['amount_log']     = np.log1p(df['Amount'])           # distribution log
df['amount_round']   = (df['Amount'] % 1 == 0).astype(int)  # montant rond = suspect
df['amount_bin']     = pd.cut(df['Amount'],
                              bins=[0,10,50,200,1000,99999],
                              labels=[0,1,2,3,4]).astype(int)
```

**Impact estimé :** +3 à +10% sur le Recall selon la qualité des nouvelles features.

---

#### H. Modèles de Deep Learning

Pour un dataset de cette taille (283K samples), les réseaux de neurones peuvent surpasser les modèles classiques :

```python
import torch
import torch.nn as nn

class FraudDetectionNet(nn.Module):
    def __init__(self, input_dim=30):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)
```

> Note : Le dossier `models/` contient déjà des modèles PyTorch (`attention_model.pth`, `autoencoder_model.pth`, `transformer_model.pth`) qui peuvent être intégrés dans ce pipeline.

---

#### I. Autoencoder pour la détection d'anomalies (approche non-supervisée)

Entraîner un autoencoder uniquement sur les transactions légitimes. Les fraudes auront une **erreur de reconstruction élevée** car le modèle ne les a jamais vues :

```python
# Logique : entraîner l'autoencoder sur les légitimes seulement
# Une fraude = une anomalie = erreur de reconstruction élevée
# Avantage : fonctionne même sans labels de fraude !

X_legit = X_train[y_train == 0]
# Entraîner l'autoencoder sur X_legit...
# Score de fraude = erreur de reconstruction MSE(x, decode(encode(x)))
```

> Ce modèle est particulièrement utile pour détecter des **nouveaux types de fraude** (zero-day fraud) non vus à l'entraînement.

---

#### J. Monitoring en production (MLOps)

```
Métriques à surveiller quotidiennement :
├── Data drift : distribution des V1–V28 en production vs entraînement
├── Concept drift : taux de fraude réel vs prédit
├── Latence de prédiction : < 50ms par transaction
├── Recall en production : alerte si < 0.75
└── Faux positifs : alerte si > 0.1% des transactions légitimes
```

---

### 9.4 Tableau de bord des améliorations — Impact & Effort

| Amélioration | Impact sur Recall | Complexité | Priorité |
|---|---|---|---|
| A. Threshold tuning | +++  | ⭐ Facile | 🔴 **Immédiat** |
| B. Tuning Random Forest | ++ | ⭐⭐ Moyen | 🔴 **Immédiat** |
| C. Tuning XGBoost | +++ | ⭐⭐ Moyen | 🔴 **Immédiat** |
| D. SMOTETomek / ADASYN | ++ | ⭐⭐ Moyen | 🟡 Semaine 2 |
| E. Stacking ensemble | ++ | ⭐⭐⭐ Élevé | 🟡 Semaine 2 |
| F. Cross-validation 5-fold | + (robustesse) | ⭐ Facile | 🟡 Semaine 2 |
| G. Feature engineering | +++ | ⭐⭐ Moyen | 🟡 Semaine 3 |
| H. Deep Learning (MLP) | +++ | ⭐⭐⭐⭐ Élevé | 🟢 Semaine 4+ |
| I. Autoencoder anomalie | ++++ (nouveaux types) | ⭐⭐⭐⭐ Élevé | 🟢 Semaine 5+ |
| J. MLOps monitoring | Maintenance | ⭐⭐⭐⭐⭐ Expert | 🟢 Production |

---

## 📌 Résumé Exécutif

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RÉSUMÉ — CE QU'ON SAIT                           │
├─────────────────────────────────────────────────────────────────────┤
│ Dataset     : 283 726 transactions · 0.17% de fraudes               │
│ Problème    : Déséquilibre extrême (1:599) → SMOTE appliqué         │
│ Best modèle : Random Forest                                         │
│               Recall=0.80 · Precision=0.69 · AUC=0.979            │
│ Figures     : 10 visualisations dans fraud_outputs/                 │
├─────────────────────────────────────────────────────────────────────┤
│                    CE QU'ON DOIT FAIRE ENSUITE                       │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Threshold tuning → Recall cible : 0.92+                          │
│ 2. Hyperparameter tuning RF + XGBoost (RandomizedSearchCV)          │
│ 3. SMOTETomek pour améliorer la frontière de décision               │
│ 4. Feature engineering sur Time et Amount                           │
│ 5. Intégration API dans FraudExia (backend FastAPI/Flask)           │
│ 6. Deep Learning (Autoencoder + MLP) pour les cas limites           │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Rapport généré automatiquement — FraudExia ML Pipeline v1.0 · Avril 2026*

