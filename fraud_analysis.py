"""
=============================================================
  DÉTECTION DE FRAUDE BANCAIRE — ANALYSE COMPLÈTE EN 6 ÉTAPES
  Dataset : Credit Card Fraud Detection (284 807 transactions)
  Variable cible : Class (0 = légitime, 1 = fraude)
=============================================================
"""

import os
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')          # mode sans fenêtre GUI (compatible serveur/IDE)
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, roc_curve, precision_recall_curve,
    f1_score, precision_score, recall_score
)
from imblearn.over_sampling import SMOTE
import xgboost as xgb

warnings.filterwarnings('ignore')
np.random.seed(42)

# ─── Chemin base (robuste aux accents Windows) ───────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE, 'data')
OUTPUT_DIR = os.path.join(BASE, 'fraud_outputs')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_fig(name):
    path = os.path.join(OUTPUT_DIR, name)
    plt.savefig(path, dpi=120, bbox_inches='tight')
    plt.close()
    print(f"  [figure sauvegardée] → {path}")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — AUDIT QUALITÉ DU DATASET
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 1 — AUDIT QUALITÉ DU DATASET")
print("="*70)

df = pd.read_csv(os.path.join(DATA_DIR, 'creditcard_clean.csv'))

# 1.1 Dimensions & types
print(f"\n▶ Dimensions       : {df.shape[0]:,} lignes × {df.shape[1]} colonnes")
print(f"▶ Colonnes         : {list(df.columns)}")
print(f"\n▶ Types de colonnes :\n{df.dtypes.to_string()}")

# 1.2 Valeurs manquantes
missing = df.isnull().sum()
missing_pct = (missing / len(df) * 100).round(4)
missing_df = pd.DataFrame({'Count': missing, 'Percent(%)': missing_pct})
missing_df = missing_df[missing_df['Count'] > 0]
if missing_df.empty:
    print("\n✅ Aucune valeur manquante détectée dans le dataset.")
else:
    print(f"\n⚠️  Valeurs manquantes détectées :\n{missing_df}")

# 1.3 Doublons
n_dup = df.duplicated().sum()
print(f"\n▶ Doublons         : {n_dup:,} lignes dupliquées")
if n_dup > 0:
    print("  → Suppression des doublons...")
    df = df.drop_duplicates()
    print(f"  → Nouveau shape : {df.shape}")

# 1.4 Distribution de la variable cible
print("\n▶ Distribution de la variable cible (Class) :")
vc = df['Class'].value_counts()
print(f"  Classe 0 (légitime) : {vc[0]:>7,}  ({vc[0]/len(df)*100:.4f}%)")
print(f"  Classe 1 (fraude)   : {vc[1]:>7,}  ({vc[1]/len(df)*100:.4f}%)")
ratio = vc[0] / vc[1]
print(f"  Ratio déséquilibre  : 1 fraude pour {ratio:.0f} transactions légitimes")
print(f"\n⚠️  DÉSÉQUILIBRE EXTRÊME détecté → stratégie SMOTE + class_weight sera appliquée.")

# 1.5 Statistiques descriptives
print("\n▶ Statistiques descriptives (Time, Amount, Class) :")
print(df[['Time', 'Amount', 'Class']].describe().round(4).to_string())

# Visualisation distribution cible
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
fig.suptitle("Étape 1 — Distribution de la variable cible", fontsize=14, fontweight='bold')
colors = ['#2196F3', '#F44336']
axes[0].bar(['Légitime (0)', 'Fraude (1)'], [vc[0], vc[1]], color=colors)
axes[0].set_title("Nombre de transactions")
axes[0].set_ylabel("Count")
for i, v in enumerate([vc[0], vc[1]]):
    axes[0].text(i, v + 500, f'{v:,}', ha='center', fontweight='bold')
axes[1].pie([vc[0], vc[1]], labels=['Légitime', 'Fraude'],
            autopct='%1.3f%%', colors=colors, startangle=90)
axes[1].set_title("Proportion (pie chart)")
save_fig("01_class_distribution.png")

print("\n✅ Étape 1 terminée.")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — EDA ORIENTÉE FRAUDE
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 2 — EDA ORIENTÉE FRAUDE")
print("="*70)

df_fraud  = df[df['Class'] == 1]
df_legit  = df[df['Class'] == 0]

# 2.1 Distribution des montants
print(f"\n▶ Montant moyen — Fraudes   : {df_fraud['Amount'].mean():.2f} €")
print(f"▶ Montant moyen — Légitimes : {df_legit['Amount'].mean():.2f} €")
print(f"▶ Montant max   — Fraudes   : {df_fraud['Amount'].max():.2f} €")
print(f"▶ Montant max   — Légitimes : {df_legit['Amount'].max():.2f} €")

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("Étape 2 — Distribution des montants", fontsize=14, fontweight='bold')
axes[0].hist(df_legit['Amount'], bins=80, color='#2196F3', alpha=0.7, label='Légitime')
axes[0].hist(df_fraud['Amount'], bins=80, color='#F44336', alpha=0.8, label='Fraude')
axes[0].set_xlim(0, 1000)
axes[0].set_xlabel("Montant (€)"); axes[0].set_ylabel("Fréquence")
axes[0].set_title("Distribution des montants (zoom ≤ 1000€)")
axes[0].legend()
axes[1].boxplot([df_legit['Amount'], df_fraud['Amount']],
                labels=['Légitime', 'Fraude'],
                patch_artist=True,
                boxprops=dict(facecolor='#90CAF9'))
axes[1].set_title("Boxplot des montants")
axes[1].set_ylabel("Montant (€)")
save_fig("02_amount_distribution.png")

# 2.2 Corrélations features ↔ variable cible
corr_target = df.corr()['Class'].drop('Class').abs().sort_values(ascending=False)
print(f"\n▶ Top 15 features les plus corrélées à la fraude (|corr|) :")
print(corr_target.head(15).round(4).to_string())

fig, ax = plt.subplots(figsize=(10, 6))
corr_target.head(15).plot(kind='barh', color='#E91E63', ax=ax)
ax.set_title("Corrélation (valeur absolue) des features avec Class (fraude)",
             fontsize=12, fontweight='bold')
ax.set_xlabel("|Corrélation|")
ax.invert_yaxis()
save_fig("03_feature_correlation.png")

# 2.3 Heatmap de corrélation (top 10 features + Class)
top_features = list(corr_target.head(10).index) + ['Class']
fig, ax = plt.subplots(figsize=(12, 9))
sns.heatmap(df[top_features].corr(), annot=True, fmt='.2f',
            cmap='coolwarm', center=0, linewidths=0.5, ax=ax)
ax.set_title("Heatmap — Top 10 features corrélées à la fraude",
             fontsize=13, fontweight='bold')
save_fig("04_heatmap_top10.png")

# 2.4 Boxplots top 6 features vs Class
top6 = list(corr_target.head(6).index)
fig, axes = plt.subplots(2, 3, figsize=(16, 9))
fig.suptitle("Étape 2 — Boxplots Top 6 features (Fraude vs Légitime)",
             fontsize=14, fontweight='bold')
for i, feat in enumerate(top6):
    ax = axes[i // 3][i % 3]
    df.boxplot(column=feat, by='Class', ax=ax,
               patch_artist=True)
    ax.set_title(feat); ax.set_xlabel("Classe (0=légit, 1=fraude)")
plt.tight_layout()
save_fig("05_boxplots_top6.png")

print("\n✅ Étape 2 terminée.")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — PREPROCESSING
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 3 — PREPROCESSING")
print("="*70)

# 3.1 Pas de variables catégorielles (V1–V28 sont déjà PCA)
print("\n▶ Variables catégorielles : aucune (V1–V28 = composantes PCA, déjà numériques)")

# 3.2 Normalisation de Time et Amount (seules colonnes non-PCA)
print("▶ Normalisation de 'Time' et 'Amount' (StandardScaler)...")
df_proc = df.copy()
scaler_amount = StandardScaler()
scaler_time   = StandardScaler()
df_proc['Amount_scaled'] = scaler_amount.fit_transform(df_proc[['Amount']])
df_proc['Time_scaled']   = scaler_time.fit_transform(df_proc[['Time']])
df_proc.drop(['Time', 'Amount'], axis=1, inplace=True)
print(f"  → Colonnes après preprocessing : {list(df_proc.columns[-4:])}")

# 3.3 Séparation features / cible
X = df_proc.drop('Class', axis=1)
y = df_proc['Class']
print(f"\n▶ Shape X : {X.shape}  |  Shape y : {y.shape}")
print(f"▶ Distribution y avant SMOTE : {dict(y.value_counts())}")

print("\n✅ Étape 3 terminée.")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — SPLIT TRAIN / TEST STRATIFIÉ (80/20)
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 4 — SPLIT TRAIN/TEST STRATIFIÉ (80/20)")
print("="*70)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"\n▶ Taille Train  : {X_train.shape[0]:,} samples")
print(f"▶ Taille Test   : {X_test.shape[0]:,} samples")
print(f"▶ Fraudes Train : {y_train.sum():.0f}  ({y_train.mean()*100:.4f}%)")
print(f"▶ Fraudes Test  : {y_test.sum():.0f}  ({y_test.mean()*100:.4f}%)")
print("  → Stratification maintient le ratio fraude/légit dans chaque split ✅")

# 3.4 Application de SMOTE uniquement sur le TRAIN (jamais sur le test)
print("\n▶ Application de SMOTE sur le train set pour corriger le déséquilibre...")
smote = SMOTE(random_state=42, k_neighbors=5)
X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
print(f"  → Avant SMOTE : {dict(y_train.value_counts())}")
print(f"  → Après SMOTE : {dict(pd.Series(y_train_sm).value_counts())}")
print("  → Classes maintenant équilibrées pour l'entraînement ✅")

print("\n✅ Étape 4 terminée.")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 — CONSTRUCTION DES 3 MODÈLES
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 5 — CONSTRUCTION & ENTRAÎNEMENT DES 3 MODÈLES")
print("="*70)

results = {}

# ── Modèle 1 : Logistic Regression (baseline) ───────────────────────────
print("\n▶ [1/3] Logistic Regression (baseline interprétable)...")
lr = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
lr.fit(X_train_sm, y_train_sm)
y_pred_lr    = lr.predict(X_test)
y_proba_lr   = lr.predict_proba(X_test)[:, 1]
results['Logistic Regression'] = {
    'model': lr, 'y_pred': y_pred_lr, 'y_proba': y_proba_lr
}
print("  → Entraînement terminé ✅")

# ── Modèle 2 : Random Forest ─────────────────────────────────────────────
print("\n▶ [2/3] Random Forest (robuste, gère le déséquilibre)...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train_sm, y_train_sm)
y_pred_rf    = rf.predict(X_test)
y_proba_rf   = rf.predict_proba(X_test)[:, 1]
results['Random Forest'] = {
    'model': rf, 'y_pred': y_pred_rf, 'y_proba': y_proba_rf
}
print("  → Entraînement terminé ✅")

# ── Modèle 3 : XGBoost ────────────────────────────────────────────────────
print("\n▶ [3/3] XGBoost (performance maximale)...")
scale_pos = int(y_train.value_counts()[0] / y_train.value_counts()[1])
xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    scale_pos_weight=scale_pos,   # gère le déséquilibre nativement
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
    n_jobs=-1
)
xgb_model.fit(X_train_sm, y_train_sm, verbose=False)
y_pred_xgb  = xgb_model.predict(X_test)
y_proba_xgb = xgb_model.predict_proba(X_test)[:, 1]
results['XGBoost'] = {
    'model': xgb_model, 'y_pred': y_pred_xgb, 'y_proba': y_proba_xgb
}
print("  → Entraînement terminé ✅")

print("\n✅ Étape 5 terminée.")

# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 — ÉVALUATION & COMPARAISON
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("ÉTAPE 6 — ÉVALUATION & COMPARAISON DES 3 MODÈLES")
print("="*70)

# 6.1 Métriques détaillées par modèle
comparison_rows = []
print()
for model_name, res in results.items():
    yp   = res['y_pred']
    ypr  = res['y_proba']
    prec = precision_score(y_test, yp)
    rec  = recall_score(y_test, yp)
    f1   = f1_score(y_test, yp)
    auc  = roc_auc_score(y_test, ypr)

    print(f"\n{'─'*55}")
    print(f"  MODÈLE : {model_name}")
    print(f"{'─'*55}")
    print(classification_report(y_test, yp,
          target_names=['Légitime (0)', 'Fraude (1)']))
    print(f"  AUC-ROC : {auc:.4f}")

    comparison_rows.append({
        'Modèle':     model_name,
        'Precision':  round(prec, 4),
        'Recall':     round(rec, 4),
        'F1-Score':   round(f1, 4),
        'AUC-ROC':    round(auc, 4)
    })

# 6.2 Tableau comparatif
comp_df = pd.DataFrame(comparison_rows).set_index('Modèle')
print("\n" + "="*70)
print("  TABLEAU COMPARATIF — MÉTRIQUES CLÉS (classe fraude)")
print("="*70)
print(comp_df.to_string())

# 6.3 Matrices de confusion
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle("Étape 6 — Matrices de confusion (Test set)", fontsize=14, fontweight='bold')
for i, (name, res) in enumerate(results.items()):
    cm = confusion_matrix(y_test, res['y_pred'])
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[i],
                xticklabels=['Légitime', 'Fraude'],
                yticklabels=['Légitime', 'Fraude'])
    axes[i].set_title(name)
    axes[i].set_ylabel("Réel"); axes[i].set_xlabel("Prédit")
    tn, fp, fn, tp = cm.ravel()
    axes[i].set_xlabel(f"Prédit\n[TP={tp}, FP={fp}, FN={fn}]")
plt.tight_layout()
save_fig("06_confusion_matrices.png")

# 6.4 Courbes ROC comparatives
fig, ax = plt.subplots(figsize=(9, 7))
colors_roc = ['#FF9800', '#4CAF50', '#9C27B0']
for (name, res), color in zip(results.items(), colors_roc):
    fpr, tpr, _ = roc_curve(y_test, res['y_proba'])
    auc_val = roc_auc_score(y_test, res['y_proba'])
    ax.plot(fpr, tpr, color=color, linewidth=2,
            label=f'{name}  (AUC = {auc_val:.4f})')
ax.plot([0, 1], [0, 1], 'k--', linewidth=1, label='Random (AUC = 0.50)')
ax.set_xlabel("Taux de Faux Positifs (FPR)", fontsize=12)
ax.set_ylabel("Taux de Vrais Positifs (Recall / TPR)", fontsize=12)
ax.set_title("Courbes ROC — Comparaison des 3 modèles", fontsize=14, fontweight='bold')
ax.legend(fontsize=11)
ax.grid(alpha=0.3)
save_fig("07_roc_curves.png")

# 6.5 Courbes Precision–Recall (plus informatives sur classes déséquilibrées)
fig, ax = plt.subplots(figsize=(9, 7))
for (name, res), color in zip(results.items(), colors_roc):
    prec_c, rec_c, _ = precision_recall_curve(y_test, res['y_proba'])
    ax.plot(rec_c, prec_c, color=color, linewidth=2, label=name)
ax.set_xlabel("Recall (fraudes détectées)", fontsize=12)
ax.set_ylabel("Precision", fontsize=12)
ax.set_title("Courbes Precision–Recall — Comparaison des 3 modèles",
             fontsize=14, fontweight='bold')
ax.legend(fontsize=11)
ax.grid(alpha=0.3)
save_fig("08_precision_recall_curves.png")

# 6.6 Importance des features (Random Forest)
feat_imp = pd.Series(rf.feature_importances_, index=X.columns)
top_feat = feat_imp.sort_values(ascending=False).head(15)
fig, ax = plt.subplots(figsize=(10, 6))
top_feat.plot(kind='barh', color='#4CAF50', ax=ax)
ax.set_title("Importance des features — Random Forest (Top 15)",
             fontsize=13, fontweight='bold')
ax.set_xlabel("Importance")
ax.invert_yaxis()
save_fig("09_feature_importance_rf.png")

# 6.7 Importance des features (XGBoost)
xgb_imp = pd.Series(xgb_model.feature_importances_, index=X.columns)
top_xgb = xgb_imp.sort_values(ascending=False).head(15)
fig, ax = plt.subplots(figsize=(10, 6))
top_xgb.plot(kind='barh', color='#9C27B0', ax=ax)
ax.set_title("Importance des features — XGBoost (Top 15)",
             fontsize=13, fontweight='bold')
ax.set_xlabel("Importance")
ax.invert_yaxis()
save_fig("10_feature_importance_xgb.png")

# ════════════════════════════════════════════════════════════════════════════
# RECOMMANDATION FINALE
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("  RECOMMANDATION FINALE")
print("="*70)

# Choisir selon le Recall (priorité : minimiser les faux négatifs)
best_recall = comp_df['Recall'].idxmax()
best_auc    = comp_df['AUC-ROC'].idxmax()
best_f1     = comp_df['F1-Score'].idxmax()

print(f"""
  CRITÈRE DE SÉLECTION : Recall maximal sur la classe fraude
  (minimiser les faux négatifs = ne pas manquer une vraie fraude)

  ┌─────────────────────────────────────────────────────────────┐
  │ Meilleur Recall  → {best_recall:<30}  │
  │ Meilleur AUC-ROC → {best_auc:<30}  │
  │ Meilleur F1-Score→ {best_f1:<30}  │
  └─────────────────────────────────────────────────────────────┘

  ✅ MODÈLE RECOMMANDÉ : {best_recall}

  JUSTIFICATION :
  ─────────────────────────────────────────────────────────────
  Dans un contexte de détection de fraude bancaire, un faux négatif
  (fraude non détectée) a un coût métier bien plus élevé qu'un faux
  positif (transaction légitime bloquée). La métrique prioritaire est
  donc le RECALL sur la classe fraude (Classe 1).

  • Logistic Regression : modèle baseline simple, interprétable mais
    moins performant sur des patterns complexes non-linéaires.

  • Random Forest : très robuste, gère bien les outliers et le
    déséquilibre. Bonne importance des features pour l'explicabilité.

  • XGBoost : performances maximales grâce au boosting et à
    scale_pos_weight. Optimisé pour les datasets déséquilibrés.

  CONSEIL D'UTILISATION EN PRODUCTION :
  ─────────────────────────────────────────────────────────────
  1. Déployer le modèle XGBoost (ou RF selon les résultats).
  2. Ajuster le seuil de décision (threshold) de 0.5 à ~0.3
     pour augmenter encore le Recall au détriment de la Precision.
  3. Monitorer le modèle en continu (data drift sur V1–V28).
  4. Réentraîner mensuellement avec les nouvelles transactions.
""")

print(f"\n{'='*70}")
print(f"  TOUTES LES FIGURES SAUVEGARDÉES DANS : {OUTPUT_DIR}")
print(f"{'='*70}")
print("\n✅ ANALYSE COMPLÈTE TERMINÉE AVEC SUCCÈS !\n")

