import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface FeatureCorr { name: string; value: number; }
interface ModelResult {
  name: string; icon: string; color: string;
  precision: number; recall: number; f1: number; auc: number;
  tp: number; fp: number; fn: number; tn: number;
  verdict: string; verdictColor: string;
}
interface Improvement {
  id: string; title: string; impact: string; complexity: string;
  priority: 'immediate' | 'medium' | 'advanced'; description: string;
  code?: string;
}

@Component({
  selector: 'app-data-analyst',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-analyst.component.html',
  styleUrls: ['./data-analyst.component.scss']
})
export class DataAnalystComponent implements OnInit {
  activeTab: 'dataset' | 'eda' | 'models' | 'improvements' = 'dataset';

  // ── Dataset stats ──────────────────────────────────────────────────────────
  datasetStats = {
    rawRows: 284807, cleanRows: 283726, columns: 31,
    duplicates: 1081, missing: 0,
    fraudCount: 473, legitCount: 283253,
    fraudPct: 0.1667, legitPct: 99.8333,
    ratio: 599,
    fraudAmountMean: 123.87, legitAmountMean: 88.41,
    fraudAmountMax: 2125.87, legitAmountMax: 25691.16
  };

  descriptiveStats = [
    { stat: 'count',  time: '283 726', amount: '283 726', cls: '283 726' },
    { stat: 'mean',   time: '94 811',  amount: '88.47 €',  cls: '0.0017' },
    { stat: 'std',    time: '47 481',  amount: '250.40 €', cls: '0.0408' },
    { stat: 'min',    time: '0',       amount: '0.00 €',   cls: '0' },
    { stat: '25%',    time: '54 204',  amount: '5.60 €',   cls: '0' },
    { stat: 'median', time: '84 692',  amount: '22.00 €',  cls: '0' },
    { stat: '75%',    time: '139 298', amount: '77.51 €',  cls: '0' },
    { stat: 'max',    time: '172 792', amount: '25 691 €', cls: '1' }
  ];

  // ── EDA ────────────────────────────────────────────────────────────────────
  featureCorrelations: FeatureCorr[] = [
    { name: 'V17', value: 0.3135 }, { name: 'V14', value: 0.2934 },
    { name: 'V12', value: 0.2507 }, { name: 'V10', value: 0.2070 },
    { name: 'V16', value: 0.1872 }, { name: 'V3',  value: 0.1823 },
    { name: 'V7',  value: 0.1723 }, { name: 'V11', value: 0.1491 },
    { name: 'V4',  value: 0.1293 }, { name: 'V18', value: 0.1053 },
    { name: 'V1',  value: 0.0945 }, { name: 'V9',  value: 0.0940 },
    { name: 'V5',  value: 0.0878 }, { name: 'V2',  value: 0.0846 },
    { name: 'V6',  value: 0.0439 }
  ];

  get maxCorr(): number { return this.featureCorrelations[0].value; }
  corrBarWidth(val: number): number { return (val / this.maxCorr) * 100; }

  // ── Models (Deep Learning) ────────────────────────────────────────────────
  models: ModelResult[] = [
    {
      name: 'Autoencoder', icon: '🔄', color: '#ff9500',
      precision: 0.724, recall: 0.856, f1: 0.784, auc: 0.982,
      tp: 81, fp: 31, fn: 14, tn: 56620,
      verdict: 'Détection anomalies — excellente reconstruction', verdictColor: '#ff9500'
    },
    {
      name: 'Attention Mechanism', icon: '👁️', color: '#00bfa5',
      precision: 0.698, recall: 0.821, f1: 0.754, auc: 0.978,
      tp: 78, fp: 34, fn: 17, tn: 56617,
      verdict: 'RECOMMANDÉ — features weighting optimal', verdictColor: '#00ff88'
    },
    {
      name: 'Transformer', icon: '🔷', color: '#7c3aed',
      precision: 0.781, recall: 0.874, f1: 0.825, auc: 0.985,
      tp: 83, fp: 23, fn: 12, tn: 56628,
      verdict: 'CHAMPION — meilleure performance globale', verdictColor: '#00ff88'
    }
  ];

  selectedModel: ModelResult | null = null;

  cmCellColor(tp: number, fp: number, fn: number, tn: number, cell: 'tp'|'fp'|'fn'|'tn'): string {
    if (cell === 'tp') return '#00ff8833';
    if (cell === 'tn') return '#1a1a3e';
    if (cell === 'fp') return '#ff990033';
    if (cell === 'fn') return '#ff005533';
    return '#1a1a3e';
  }

  // SVG ROC curves (simplified polyline points)
  rocPoints(model: ModelResult): string {
    const auc = model.auc;
    const pts: string[] = [
      '0,200', `${Math.round(10*(1-auc)*2)},${Math.round(200-auc*160)}`,
      `${Math.round(200*(1-auc)*0.5)},${Math.round(200-auc*190)}`, '200,0'
    ];
    return pts.join(' ');
  }

  // ── Improvements ─────────────────────────────────────────────────────────
  improvements: Improvement[] = [
    {
      id: 'A', title: 'Threshold Tuning Ensemble', impact: '+++', complexity: '⭐ Facile',
      priority: 'immediate',
      description: 'Optimiser les seuils individuels des 3 modèles + voting pondéré pour Recall 0.92+.',
      code: `# Seuils optimaux par modèle\nthreshold_auto = 0.42  # Autoencoder\nthreshold_att = 0.38   # Attention\nthreshold_trans = 0.35 # Transformer\n\n# Voting pondéré\nweights = [0.25, 0.30, 0.45]  # Transformer = poids max\nfinal_score = np.average([auto_prob, att_prob, trans_prob], weights=weights)`
    },
    {
      id: 'B', title: 'Augmentation données SMOTE', impact: '++', complexity: '⭐⭐ Moyen',
      priority: 'immediate',
      description: 'Appliquer BorderlineSMOTE pour générer des fraudes synthétiques plus réalistes à la frontière de décision.',
      code: `from imblearn.over_sampling import BorderlineSMOTE\n\nsmote = BorderlineSMOTE(random_state=42, kind='borderline-1')\nX_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)`
    },
    {
      id: 'C', title: 'Attention Interpretability', impact: '+++', complexity: '⭐⭐ Moyen',
      priority: 'immediate',
      description: 'Extraire et visualiser les poids d\'attention pour identifier les features critiques par transaction.',
      code: `# Extraire attention weights\nattention_weights = model.attention_weights.detach().numpy()\ntop_features = np.argsort(attention_weights)[-5:]  # Top 5\n\n# Visualisation\nplt.barh(feature_names[top_features], attention_weights[top_features])`
    },
    {
      id: 'D', title: 'Ensemble Stacking Deep', impact: '+++', complexity: '⭐⭐⭐ Élevé',
      priority: 'medium',
      description: 'Combiner les 3 modèles dans un méta-modèle (stacking) avec leurs probabilités comme features.',
      code: `# Meta-learner\nmeta_features = np.column_stack([auto_probs, att_probs, trans_probs])\nmeta_model = LogisticRegression(class_weight='balanced')\nmeta_model.fit(meta_features, y_train)`
    },
    {
      id: 'E', title: 'Anomaly Score Calibration', impact: '++', complexity: '⭐⭐⭐ Élevé',
      priority: 'medium',
      description: 'Calibrer le score d\'anomalie de l\'Autoencoder avec Platt Scaling pour probabilités fiables.',
      code: `from sklearn.calibration import CalibratedClassifierCV\n\ncalibrated = CalibratedClassifierCV(autoencoder, method='sigmoid', cv=5)\ncalibrated.fit(X_train, y_train)`
    },
    {
      id: 'F', title: 'Cross-Validation Stratifiée', impact: '+', complexity: '⭐ Facile',
      priority: 'medium',
      description: 'Évaluer avec StratifiedKFold(5) pour métriques robustes sur classes déséquilibrées.',
      code: `from sklearn.model_selection import StratifiedKFold\n\nskf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\nscores = cross_val_score(model, X, y, cv=skf, scoring='f1')`
    },
    {
      id: 'G', title: 'Multi-Head Attention', impact: '+++', complexity: '⭐⭐⭐ Élevé',
      priority: 'medium',
      description: 'Passer de 1 à 4 têtes d\'attention pour capturer plusieurs patterns simultanément.',
      code: `self.multihead_attn = nn.MultiheadAttention(\n    embed_dim=64, num_heads=4, dropout=0.1, batch_first=True\n)\ncontext, attn_weights = self.multihead_attn(q, k, v)`
    },
    {
      id: 'H', title: 'Adversarial Training', impact: '++++', complexity: '⭐⭐⭐⭐ Élevé',
      priority: 'advanced',
      description: 'Générer des exemples adversaires (FGSM) pour robustifier les modèles contre fraudes sophistiquées.',
      code: `# Fast Gradient Sign Method\nepsilon = 0.1\nloss.backward()\nadv_X = X + epsilon * X.grad.sign()\noutput_adv = model(adv_X)`
    },
    {
      id: 'I', title: 'Reconstruction Loss Threshold', impact: '++++', complexity: '⭐⭐⭐⭐ Élevé',
      priority: 'advanced',
      description: 'Utiliser l\'erreur de reconstruction MSE de l\'Autoencoder comme score anomalie indépendant.',
      code: `reconstruction_error = torch.nn.MSELoss()(reconstructed, original)\nif reconstruction_error > threshold:\n    return "FRAUDE_ANOMALIE"`
    },
    {
      id: 'J', title: 'MLOps Monitoring Production', impact: 'maintenance', complexity: '⭐⭐⭐⭐⭐ Expert',
      priority: 'advanced',
      description: 'Surveiller data drift, concept drift, latence (<20ms), Recall prod, distribution attention weights.',
      code: `# Monitoring dashboard\nmetrics = {\n    'data_drift': kl_divergence(prod_dist, train_dist),\n    'latency_p95': np.percentile(latencies, 95),\n    'recall': recall_score(y_true_prod, y_pred)\n}`
    }
  ];

  activeImprovement: Improvement | null = null;

  priorityLabel(p: string): string {
    if (p === 'immediate') return '🔴 Immédiat';
    if (p === 'medium')    return '🟡 Semaine 2-3';
    return '🟢 Long terme';
  }

  constructor(private router: Router) {}

  ngOnInit() {
    this.selectedModel = this.models[2]; // Transformer par défaut (meilleur modèle)
    this.activeImprovement = this.improvements[0];
  }

  setTab(tab: 'dataset' | 'eda' | 'models' | 'improvements') {
    this.activeTab = tab;
  }

  goBack() { this.router.navigate(['/admin-dashboard']); }
}

