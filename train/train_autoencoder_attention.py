"""
Script d'entraînement des modèles Autoencoder et Attention
=========================================================

Entraîne et sauvegarde les modèles Autoencoder et Attention 
pour compléter l'ensemble des 3 modèles.

Usage:
    python train_autoencoder_attention.py
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, classification_report
import os
import pickle
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("ENTRAÎNEMENT DES MODÈLES AUTOENCODER ET ATTENTION")
print("=" * 80)

# ===========================
# 1. CHARGEMENT ET PRÉPARATION DES DONNÉES
# ===========================
print("\n📊 Chargement des données...")
df = pd.read_csv("data/creditcard_clean.csv")
print(f"✅ {len(df):,} transactions chargées")
print(f"   Features: {df.shape[1]}")
print(f"   Fraudes: {df[df['Class']==1].shape[0]} ({df['Class'].mean()*100:.2f}%)")

# Normalisation de Amount
scaler_amount = StandardScaler()
df['Amount'] = scaler_amount.fit_transform(df[['Amount']])

# Features et cible
X = df.drop('Class', axis=1).values
y = df['Class'].values

# Normalisation des features
scaler_X = StandardScaler()
X = scaler_X.fit_transform(X)

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

# Conversion en tensors PyTorch
X_train_tensor = torch.FloatTensor(X_train)
y_train_tensor = torch.LongTensor(y_train)
X_test_tensor = torch.FloatTensor(X_test)
y_test_tensor = torch.LongTensor(y_test)

# DataLoaders
batch_size = 32
train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=batch_size)

print(f"\n📈 Données préparées:")
print(f"   Train: {X_train.shape}")
print(f"   Test: {X_test.shape}")

# ===========================
# 2. FOCAL LOSS
# ===========================
class FocalLoss(nn.Module):
    def __init__(self, alpha=0.25, gamma=2.0):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        
    def forward(self, inputs, targets):
        ce_loss = nn.CrossEntropyLoss()(inputs, targets)
        p_t = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - p_t) ** self.gamma * ce_loss
        return focal_loss.mean()

focal_loss_fn = FocalLoss(alpha=0.25, gamma=2.0)

# ===========================
# 3. MODÈLE: AUTOENCODER
# ===========================
class AutoencoderModel(nn.Module):
    def __init__(self, input_dim):
        super(AutoencoderModel, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32)
        )
        # Classifier
        self.classifier = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(16, 2)
        )
        # Decoder (reconstruction)
        self.decoder = nn.Sequential(
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, 128),
            nn.ReLU(),
            nn.Linear(128, input_dim)
        )
        
    def forward(self, x):
        encoded = self.encoder(x)
        classification = self.classifier(encoded)
        reconstruction = self.decoder(encoded)
        return classification, reconstruction

# ===========================
# 4. MODÈLE: ATTENTION MECHANISM
# ===========================
class AttentionModel(nn.Module):
    def __init__(self, input_dim):
        super(AttentionModel, self).__init__()
        self.fc1 = nn.Linear(input_dim, 128)
        self.fc2 = nn.Linear(128, 64)
        
        # Attention mechanism
        self.attention_query = nn.Linear(64, 32)
        self.attention_key = nn.Linear(64, 32)
        self.attention_value = nn.Linear(64, 32)
        
        self.fc3 = nn.Linear(32, 16)
        self.fc4 = nn.Linear(16, 2)
        
        self.dropout = nn.Dropout(0.3)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.dropout(self.relu(self.fc2(x)))
        
        # Attention
        q = self.attention_query(x)
        k = self.attention_key(x)
        v = self.attention_value(x)
        
        attention_scores = torch.matmul(q, k.t()) / np.sqrt(32)
        attention_weights = torch.softmax(attention_scores, dim=-1)
        
        if attention_scores.dim() > 1:
            context = torch.matmul(attention_weights, v)
        else:
            context = v * attention_weights
            
        x = self.dropout(self.relu(self.fc3(context)))
        x = self.fc4(x)
        return x

# ===========================
# 5. FONCTION D'ENTRAÎNEMENT
# ===========================
def train_model(model, train_loader, test_loader, num_epochs=30, model_name="Model"):
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    train_losses = []
    test_losses = []
    
    best_auc = 0
    patience = 5
    patience_counter = 0
    best_model_state = None
    
    print(f"\n{'='*80}")
    print(f"⚡ ENTRAÎNEMENT: {model_name}")
    print(f"{'='*80}")
    print(f"Epochs: {num_epochs} | Early stopping patience: {patience}\n")
    
    for epoch in range(num_epochs):
        # Training
        model.train()
        train_loss = 0
        for X_batch, y_batch in train_loader:
            optimizer.zero_grad()
            
            if model_name == "Autoencoder":
                outputs, reconstruction = model(X_batch)
                loss = focal_loss_fn(outputs, y_batch)
                # Ajouter reconstruction loss
                reconstruction_loss = nn.MSELoss()(reconstruction, X_batch)
                loss = loss + 0.1 * reconstruction_loss
            else:
                outputs = model(X_batch)
                loss = focal_loss_fn(outputs, y_batch)
            
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        train_losses.append(train_loss)
        
        # Testing
        model.eval()
        test_loss = 0
        all_preds = []
        all_probs = []
        all_labels = []
        
        with torch.no_grad():
            for X_batch, y_batch in test_loader:
                if model_name == "Autoencoder":
                    outputs, _ = model(X_batch)
                else:
                    outputs = model(X_batch)
                    
                loss = focal_loss_fn(outputs, y_batch)
                test_loss += loss.item()
                
                probs = torch.softmax(outputs, dim=1)[:, 1]
                preds = torch.argmax(outputs, dim=1)
                
                all_preds.extend(preds.numpy())
                all_probs.extend(probs.numpy())
                all_labels.extend(y_batch.numpy())
        
        test_loss /= len(test_loader)
        test_losses.append(test_loss)
        
        # Calculate AUC
        auc = roc_auc_score(all_labels, all_probs)
        
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch [{epoch+1:2d}/{num_epochs}] Loss: {train_loss:.4f} | Test: {test_loss:.4f} | AUC: {auc:.4f}")
        
        # Early stopping
        if auc > best_auc:
            best_auc = auc
            patience_counter = 0
            best_model_state = model.state_dict().copy()
        else:
            patience_counter += 1
            
        if patience_counter >= patience:
            print(f"⏹️  Early stopping à l'epoch {epoch+1} (AUC: {best_auc:.4f})")
            model.load_state_dict(best_model_state)
            break
    
    return model, best_auc

# ===========================
# 6. ENTRAÎNEMENT AUTOENCODER
# ===========================
print("\n🤖 MODÈLE 1: AUTOENCODER")
autoencoder = AutoencoderModel(input_dim=30)
autoencoder, auc_auto = train_model(autoencoder, train_loader, test_loader, 
                                     num_epochs=30, model_name="Autoencoder")

# Évaluation détaillée Autoencoder
autoencoder.eval()
auto_preds = []
auto_probs = []
auto_labels = []

with torch.no_grad():
    for X_batch, y_batch in test_loader:
        outputs, _ = autoencoder(X_batch)
        probs = torch.softmax(outputs, dim=1)[:, 1]
        preds = torch.argmax(outputs, dim=1)
        auto_preds.extend(preds.numpy())
        auto_probs.extend(probs.numpy())
        auto_labels.extend(y_batch.numpy())

print("\n✅ Autoencoder - Résultats finaux:")
print(classification_report(auto_labels, auto_preds, target_names=['Normal', 'Fraude']))
print(f"AUC-ROC: {roc_auc_score(auto_labels, auto_probs):.4f}")

# ===========================
# 7. ENTRAÎNEMENT ATTENTION
# ===========================
print("\n🤖 MODÈLE 2: ATTENTION MECHANISM")
attention = AttentionModel(input_dim=30)
attention, auc_att = train_model(attention, train_loader, test_loader, 
                                 num_epochs=30, model_name="Attention")

# Évaluation détaillée Attention
attention.eval()
att_preds = []
att_probs = []
att_labels = []

with torch.no_grad():
    for X_batch, y_batch in test_loader:
        outputs = attention(X_batch)
        probs = torch.softmax(outputs, dim=1)[:, 1]
        preds = torch.argmax(outputs, dim=1)
        att_preds.extend(preds.numpy())
        att_probs.extend(probs.numpy())
        att_labels.extend(y_batch.numpy())

print("\n✅ Attention Mechanism - Résultats finaux:")
print(classification_report(att_labels, att_preds, target_names=['Normal', 'Fraude']))
print(f"AUC-ROC: {roc_auc_score(att_labels, att_probs):.4f}")

# ===========================
# 8. SAUVEGARDE DES MODÈLES
# ===========================
print("\n" + "="*80)
print("💾 SAUVEGARDE DES MODÈLES")
print("="*80)

os.makedirs("models", exist_ok=True)

# Sauvegarder Autoencoder
autoencoder_path = "models/autoencoder_model.pth"
torch.save(autoencoder.state_dict(), autoencoder_path)
print(f"✅ Autoencoder sauvegardé: {autoencoder_path}")

# Sauvegarder Attention
attention_path = "models/attention_model.pth"
torch.save(attention.state_dict(), attention_path)
print(f"✅ Attention sauvegardé: {attention_path}")

# Sauvegarder les scalers (si pas déjà sauvegardés)
scaler_X_path = "models/scaler_X.pkl"
if not os.path.exists(scaler_X_path):
    with open(scaler_X_path, 'wb') as f:
        pickle.dump(scaler_X, f)
    print(f"✅ Scaler X sauvegardé: {scaler_X_path}")
else:
    print(f"ℹ️  Scaler X déjà existant: {scaler_X_path}")

scaler_amount_path = "models/scaler_amount.pkl"
if not os.path.exists(scaler_amount_path):
    with open(scaler_amount_path, 'wb') as f:
        pickle.dump(scaler_amount, f)
    print(f"✅ Scaler Amount sauvegardé: {scaler_amount_path}")
else:
    print(f"ℹ️  Scaler Amount déjà existant: {scaler_amount_path}")

# ===========================
# 9. CRÉATION METADATA
# ===========================
import json

metadata = {
    "training_date": datetime.now().isoformat(),
    "models": {
        "autoencoder": {
            "file": "autoencoder_model.pth",
            "auc": float(auc_auto),
            "architecture": "Encoder(30→128→64→32) + Classifier(32→16→2) + Decoder(32→64→128→30)",
            "params": sum(p.numel() for p in autoencoder.parameters())
        },
        "attention": {
            "file": "attention_model.pth",
            "auc": float(auc_att),
            "architecture": "FC(30→128→64) + MultiHeadAttention(32D) + FC(32→16→2)",
            "params": sum(p.numel() for p in attention.parameters())
        }
    },
    "dataset": {
        "total": len(df),
        "fraud_cases": int(df['Class'].sum()),
        "fraud_percentage": float(df['Class'].mean() * 100),
        "features": 30
    },
    "preprocessing": {
        "normalizer": "StandardScaler",
        "loss_function": "FocalLoss (alpha=0.25, gamma=2.0)",
        "train_test_split": "70/30"
    }
}

metadata_path = "models/metadata_ensemble.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Métadonnées sauvegardées: {metadata_path}")

# ===========================
# 10. RÉSUMÉ FINAL
# ===========================
print("\n" + "="*80)
print("📊 RÉSUMÉ - MODÈLES SAUVEGARDÉS")
print("="*80)
print(f"""
✅ Autoencoder:
   • AUC-ROC: {auc_auto:.4f}
   • Fichier: models/autoencoder_model.pth
   • Paramètres: {sum(p.numel() for p in autoencoder.parameters()):,}

✅ Attention Mechanism:
   • AUC-ROC: {auc_att:.4f}
   • Fichier: models/attention_model.pth
   • Paramètres: {sum(p.numel() for p in attention.parameters()):,}

📁 Fichiers créés dans models/:
   • autoencoder_model.pth
   • attention_model.pth
   • metadata_ensemble.json
   • scaler_X.pkl (existant)
   • scaler_amount.pkl (existant)

✨ Les 3 modèles sont maintenant prêts pour l'ensemble voting!
""")

print("="*80)
print("✅ Entraînement complété avec succès!")
print("="*80)
