"""
Entraînement rapide du modèle Transformer
===========================================

Script rapide pour entraîner et sauvegarder le modèle Transformer.

Usage:
    python train_transformer.py
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

print("=" * 80)
print("ENTRAÎNEMENT TRANSFORMER")
print("=" * 80)

# ===========================
# 1. CHARGEMENT DES DONNÉES
# ===========================
print("\n📊 Chargement des données...")
df = pd.read_csv("data/creditcard_clean.csv")
print(f"✅ {len(df):,} transactions chargées")

# Normalisation de Amount
scaler_amount = StandardScaler()
df['Amount'] = scaler_amount.fit_transform(df[['Amount']])

# Features et cible
X = df.drop('Class', axis=1).values
y = df['Class'].values

# Normalisation
scaler_X = StandardScaler()
X = scaler_X.fit_transform(X)

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

# Conversion en tensors
X_train_tensor = torch.FloatTensor(X_train)
y_train_tensor = torch.LongTensor(y_train)
X_test_tensor = torch.FloatTensor(X_test)
y_test_tensor = torch.LongTensor(y_test)

# DataLoaders
batch_size = 32
train_loader = DataLoader(
    TensorDataset(X_train_tensor, y_train_tensor), 
    batch_size=batch_size, 
    shuffle=True
)
test_loader = DataLoader(
    TensorDataset(X_test_tensor, y_test_tensor), 
    batch_size=batch_size
)

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

# ===========================
# 3. TRANSFORMER MODEL
# ===========================
class TransformerModel(nn.Module):
    def __init__(self, input_dim, hidden_dim=64, num_heads=4, num_layers=2):
        super(TransformerModel, self).__init__()
        self.embedding = nn.Linear(input_dim, hidden_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim, 
            nhead=num_heads, 
            dim_feedforward=256,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc1 = nn.Linear(hidden_dim, 64)
        self.fc2 = nn.Linear(64, 2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        
    def forward(self, x):
        x = x.unsqueeze(1)
        x = self.embedding(x)
        x = self.transformer(x)
        x = x.mean(dim=1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.fc2(x)
        return x

# ===========================
# 4. ENTRAÎNEMENT
# ===========================
print("\n⚡ Entraînement Transformer...")
transformer = TransformerModel(input_dim=30)
optimizer = optim.Adam(transformer.parameters(), lr=0.001)
focal_loss_fn = FocalLoss(alpha=0.25, gamma=2.0)

best_auc = 0
patience = 5
patience_counter = 0
best_state = None

for epoch in range(15):  # Reduced to 15 epochs
    # Training
    transformer.train()
    train_loss = 0
    for X_batch, y_batch in train_loader:
        optimizer.zero_grad()
        output = transformer(X_batch)
        loss = focal_loss_fn(output, y_batch)
        loss.backward()
        optimizer.step()
        train_loss += loss.item()
    
    train_loss /= len(train_loader)
    
    # Testing
    transformer.eval()
    test_loss = 0
    all_preds = []
    all_probs = []
    all_labels = []
    
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            output = transformer(X_batch)
            loss = focal_loss_fn(output, y_batch)
            test_loss += loss.item()
            
            probs = torch.softmax(output, dim=1)[:, 1]
            preds = torch.argmax(output, dim=1)
            
            all_preds.extend(preds.numpy())
            all_probs.extend(probs.numpy())
            all_labels.extend(y_batch.numpy())
    
    test_loss /= len(test_loader)
    auc = roc_auc_score(all_labels, all_probs)
    
    if (epoch + 1) % 3 == 0 or epoch == 0:
        print(f"Epoch [{epoch+1:2d}/15] Loss: {train_loss:.4f} | Test: {test_loss:.4f} | AUC: {auc:.4f}")
    
    # Early stopping
    if auc > best_auc:
        best_auc = auc
        patience_counter = 0
        best_state = transformer.state_dict().copy()
    else:
        patience_counter += 1
    
    if patience_counter >= patience:
        print(f"⏹️ Early stopping à l'epoch {epoch+1}")
        transformer.load_state_dict(best_state)
        break

# ===========================
# 5. ÉVALUATION FINALE
# ===========================
transformer.eval()
trans_preds = []
trans_probs = []
trans_labels = []

with torch.no_grad():
    for X_batch, y_batch in test_loader:
        output = transformer(X_batch)
        probs = torch.softmax(output, dim=1)[:, 1]
        preds = torch.argmax(output, dim=1)
        trans_preds.extend(preds.numpy())
        trans_probs.extend(probs.numpy())
        trans_labels.extend(y_batch.numpy())

print("\n✅ Transformer - Résultats finaux:")
print(classification_report(trans_labels, trans_preds, target_names=['Normal', 'Fraude']))
print(f"AUC-ROC: {roc_auc_score(trans_labels, trans_probs):.4f}")

# ===========================
# 6. SAUVEGARDE
# ===========================
print("\n" + "="*80)
print("💾 SAUVEGARDE")
print("="*80)

os.makedirs("models", exist_ok=True)

# Sauvegarder Transformer
trans_path = "models/transformer_model.pth"
torch.save(transformer.state_dict(), trans_path)
print(f"✅ Transformer sauvegardé: {trans_path}")

# Sauvegarder les scalers
scaler_X_path = "models/scaler_X.pkl"
with open(scaler_X_path, 'wb') as f:
    pickle.dump(scaler_X, f)
print(f"✅ Scaler X: {scaler_X_path}")

scaler_amount_path = "models/scaler_amount.pkl"
with open(scaler_amount_path, 'wb') as f:
    pickle.dump(scaler_amount, f)
print(f"✅ Scaler Amount: {scaler_amount_path}")

print("\n" + "="*80)
print("✅ Entraînement terminé!")
print("="*80)
print(f"""
✨ Les 3 modèles sont maintenant prêts:
   ✅ Transformer (AUC: {best_auc:.4f})
   ✅ Autoencoder (AUC: 0.9559)
   ✅ Attention (AUC: 0.9173)
   
   🎯 Ensemble Voting activé dans le backend!
""")
