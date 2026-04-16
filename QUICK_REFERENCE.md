# 🎯 QUICK REFERENCE — Modèles Deep Learning FraudExia

> **Mise à jour :** 16 Avril 2026

---

## 📊 LES 3 MODÈLES

| Modèle | Icon | Precision | Recall | F1 | AUC | Use Case |
|--------|------|-----------|--------|----|----|----------|
| **Autoencoder** | 🔄 | 0.724 | 0.856 | 0.784 | 0.982 | Zero-day fraud |
| **Attention** | 👁️ | 0.698 | 0.821 | 0.754 | 0.978 | Audit & conformité |
| **Transformer** ⭐ | 🔷 | **0.781** | **0.874** | **0.825** | **0.985** | **Production** |

---

## 🚀 ACCÈS RAPIDE

### Interface Web
```
http://localhost:4200/data-analyst
```

### Fichiers clés
```bash
# Composant Angular
frontend/src/app/components/dashboards/data-analyst.component.ts

# Modèles PyTorch
models/autoencoder_model.pth
models/attention_model.pth
models/transformer_model.pth

# Scripts entraînement
train/train_autoencoder_attention.py
train/train_transformer.py

# Documentation
FRAUD_DETECTION_REPORT.md
MIGRATION_DEEP_LEARNING.md
```

---

## 💻 COMMANDES UTILES

### Lancer l'interface
```bash
cd frontend
ng serve
# → http://localhost:4200/data-analyst
```

### Vérifier les modèles
```bash
ls -lh models/*.pth
```

### Lire le rapport
```bash
cat FRAUD_DETECTION_REPORT.md | less
```

---

## 📈 MÉTRIQUES CHAMPION (Transformer)

```
Recall     : 87.4%  ← Détecte 83 fraudes sur 95
Precision  : 78.1%  ← 78% des alertes sont réelles
F1-Score   : 0.825  ← Meilleur équilibre global
AUC-ROC    : 0.985  ← Discrimination quasi-parfaite
FP         : 23     ← Seulement 23 fausses alertes
FN         : 12     ← Seulement 12 fraudes manquées
Latence    : 18ms   ← Acceptable temps réel
```

---

## 🎨 ICÔNES PAR MODÈLE

```
🔄 Autoencoder       → Reconstruction + Classification
👁️ Attention          → Feature weighting + Explainabilité
🔷 Transformer ⭐    → Multi-head attention 4×2
```

---

## 📝 STATUT FICHIERS

| Fichier | Statut |
|---------|--------|
| `data-analyst.component.ts` | ✅ Mis à jour (3 DL models) |
| `FRAUD_DETECTION_REPORT.md` | ✅ Réécrit (sections 5-6-7) |
| `README.md` | ✅ Actualisé |
| `MIGRATION_DEEP_LEARNING.md` | ✅ Créé (guide complet) |
| `COMPLETION_SUMMARY.md` | ✅ Créé (récapitulatif) |
| Backend API | ⏳ À faire |

---

## ⚡ NEXT STEPS

```python
# 1. Charger un modèle
import torch
from models_arch import TransformerModel

model = TransformerModel(input_dim=30)
model.load_state_dict(torch.load('models/transformer_model.pth'))
model.eval()

# 2. Prédire
with torch.no_grad():
    output = model(X_tensor)
    prob = torch.softmax(output, dim=1)[0, 1].item()

# 3. Décider
if prob > 0.35:
    print("FRAUDE DÉTECTÉE")
```

---

*FraudExia Deep Learning v2.0 — Quick Reference*

