# backend/services/prediction.py

import torch
import numpy as np

def ensemble_predict(models, data):
    autoencoder, transformer, attention = models

    data = torch.tensor(data).float().unsqueeze(0)

    with torch.no_grad():
        p1 = autoencoder(data).item()
        p2 = transformer(data).item()
        p3 = attention(data).item()

    # 🔥 combinaison intelligente
    score = (p1 + p2 + p3) / 3

    return {
        "autoencoder": p1,
        "transformer": p2,
        "attention": p3,
        "risk_score": score,
        "is_fraud": int(score > 0.5)
    }