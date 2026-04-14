# backend/loaders/load_models.py
import torch
from models_arch import AutoencoderModel, TransformerModel, AttentionModel
import os

def load_models():
    # Paths relative to backend directory
    base_path = "../models"
    
    autoencoder = AutoencoderModel()
    transformer = TransformerModel()
    attention = AttentionModel()

    # Load state dicts (these might still fail if the architectures don't perfectly match saved state)
    # If the .pth contains the whole object, then my previous code was fine but failed for another reason.
    # However, 'dict' object has no attribute 'eval' strongly suggests it's a state_dict.
    
    try:
        autoencoder.load_state_dict(torch.load(os.path.join(base_path, "autoencoder_model.pth"), map_location="cpu"))
        transformer.load_state_dict(torch.load(os.path.join(base_path, "transformer_model.pth"), map_location="cpu"))
        attention.load_state_dict(torch.load(os.path.join(base_path, "attention_model.pth"), map_location="cpu"))
    except Exception as e:
        print(f"Warning: Failed to load state dicts exactly: {e}")
        # If it returns the object itself, we handle that
        checkpoint = torch.load(os.path.join(base_path, "autoencoder_model.pth"), map_location="cpu")
        if not isinstance(checkpoint, dict):
             autoencoder = checkpoint
        
        checkpoint = torch.load(os.path.join(base_path, "transformer_model.pth"), map_location="cpu")
        if not isinstance(checkpoint, dict):
             transformer = checkpoint

        checkpoint = torch.load(os.path.join(base_path, "attention_model.pth"), map_location="cpu")
        if not isinstance(checkpoint, dict):
             attention = checkpoint

    autoencoder.eval()
    transformer.eval()
    attention.eval()

    return autoencoder, transformer, attention