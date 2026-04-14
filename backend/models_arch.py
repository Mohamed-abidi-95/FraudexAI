# backend/models_arch.py
import torch
import torch.nn as nn
import numpy as np

class TransformerModel(nn.Module):
    def __init__(self, input_dim=30, hidden_dim=64, num_heads=4, num_layers=2):
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
        x = self.embedding(x)
        x = self.transformer(x)
        x = x.mean(dim=1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.fc2(x)
        return x

class AutoencoderModel(nn.Module):
    def __init__(self, input_dim=30):
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
        
    def forward(self, x):
        encoded = self.encoder(x)
        classification = self.classifier(encoded)
        return classification

class AttentionModel(nn.Module):
    def __init__(self, input_dim=30):
        super(AttentionModel, self).__init__()
        self.fc1 = nn.Linear(input_dim, 128)
        self.fc2 = nn.Linear(128, 64)
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
        q = self.attention_query(x)
        k = self.attention_key(x)
        v = self.attention_value(x)
        attention_scores = torch.matmul(q, k.t()) / np.sqrt(32)
        attention_weights = torch.softmax(attention_scores, dim=-1)
        context = torch.matmul(attention_weights, v)
        x = self.dropout(self.relu(self.fc3(context)))
        x = self.fc4(x)
        return x
