// Machine learning-like pattern recognition and prediction
const fs = require('fs').promises;
const path = require('path');

class PatternLearner {
  constructor(options = {}) {
    this.options = {
      minConfidence: 0.7,
      learningRate: 0.1,
      maxPatterns: 1000,
      featureExtraction: true,
      modelFile: 'pattern-model.json',
      ...options
    };

    // Pattern model storage
    this.model = {
      features: {},          // Feature weights for different patterns
      patterns: {},          // Learned patterns by data type
      correlations: {},      // Correlations between features
      performance: {},       // Model performance metrics
      version: '1.0',
      lastTrained: null
    };

    // Feature definitions
    this.featureDefinitions = {
      structural: [
        'tagName',
        'className',
        'idPattern',
        'depth',
        'childCount',
        'textLength',
        'hasNumbers',
        'hasCurrency',
        'position'
      ],
      contextual: [
        'nearbyLabels',
        'parentType',
        'siblingTypes',
        'ancestorClasses',
        'dataAttributes'
      ],
      content: [
        'textPattern',
        'valueType',
        'formatting',
        'language'
      ]
    };

    this.loadModel();
  }

  /**
   * Load trained model from file
   */
  async loadModel() {
    try {
      const modelPath = path.join(process.cwd(), 'data', 'scraping', this.options.modelFile);
      const data = await fs.readFile(modelPath, 'utf8');
      this.model = JSON.parse(data);
      console.log('🧠 Loaded pattern learning model');
    } catch (error) {
      console.log('🧠 No existing model found, starting fresh');
    }
  }

  /**
   * Save model to file
   */
  async saveModel() {
    try {
      const modelPath = path.join(process.cwd(), 'data', 'scraping', this.options.modelFile);
      const dir = path.dirname(modelPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(modelPath, JSON.stringify(this.model, null, 2));
    } catch (error) {
      console.error('Failed to save pattern model:', error);
    }
  }

  /**
   * Train on successful extraction
   */
  async trainOnSuccess(element, dataType, value, $) {
    console.log(`🎓 Training on successful ${dataType} extraction`);
    
    // Extract features from the successful element
    const features = this.extractFeatures(element, $);
    
    // Initialize pattern storage for this data type
    if (!this.model.patterns[dataType]) {
      this.model.patterns[dataType] = {
        featureWeights: {},
        examples: [],
        successCount: 0,
        totalCount: 0
      };
    }

    const pattern = this.model.patterns[dataType];
    pattern.successCount++;
    pattern.totalCount++;

    // Update feature weights using simple learning algorithm
    for (const [feature, value] of Object.entries(features)) {
      if (!pattern.featureWeights[feature]) {
        pattern.featureWeights[feature] = 0.5; // Initial weight
      }

      // Increase weight for features present in successful extraction
      pattern.featureWeights[feature] = this.updateWeight(
        pattern.featureWeights[feature],
        value ? 1 : 0,
        true // positive example
      );
    }

    // Store example for future reference
    pattern.examples.push({
      features: features,
      selector: this.generateSelectorFromElement(element, $),
      value: value,
      timestamp: new Date().toISOString(),
      confidence: this.calculateConfidence(features, pattern.featureWeights)
    });

    // Keep only recent examples
    if (pattern.examples.length > 100) {
      pattern.examples = pattern.examples.slice(-100);
    }

    // Update correlations
    await this.updateCorrelations(dataType, features);

    // Save model periodically
    if (Math.random() < 0.1) {
      this.model.lastTrained = new Date().toISOString();
      await this.saveModel();
    }
  }

  /**
   * Train on failed extraction
   */
  async trainOnFailure(element, dataType, $) {
    if (!this.model.patterns[dataType]) return;

    const pattern = this.model.patterns[dataType];
    pattern.totalCount++;

    // Extract features from failed element
    const features = this.extractFeatures(element, $);

    // Decrease weights for features in failed extraction
    for (const [feature, value] of Object.entries(features)) {
      if (pattern.featureWeights[feature]) {
        pattern.featureWeights[feature] = this.updateWeight(
          pattern.featureWeights[feature],
          value ? 1 : 0,
          false // negative example
        );
      }
    }
  }

  /**
   * Predict likely selectors for a data type
   */
  async predictLikelySelectors($, dataType, maxPredictions = 5) {
    console.log(`🔮 Predicting selectors for ${dataType}...`);
    
    if (!this.model.patterns[dataType]) {
      console.log('  ❌ No training data available');
      return [];
    }

    const pattern = this.model.patterns[dataType];
    const candidates = [];

    // Analyze all elements on the page
    $('*').each((i, elem) => {
      // Skip elements with too many children or too much text
      if ($(elem).children().length > 5 || $(elem).text().length > 500) return;

      const features = this.extractFeatures(elem, $);
      const score = this.calculatePredictionScore(features, pattern.featureWeights);

      if (score > this.options.minConfidence) {
        candidates.push({
          element: elem,
          selector: this.generateSelectorFromElement(elem, $),
          confidence: score,
          features: features,
          dataType: dataType
        });
      }
    });

    // Sort by confidence and return top predictions
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    const predictions = candidates.slice(0, maxPredictions).map(c => ({
      selector: c.selector,
      confidence: Math.round(c.confidence * 100),
      dataType: dataType,
      reasoning: this.explainPrediction(c.features, pattern.featureWeights)
    }));

    console.log(`  ✅ Generated ${predictions.length} predictions`);
    return predictions;
  }

  /**
   * Extract features from an element
   */
  extractFeatures(element, $) {
    const $elem = $(element);
    const features = {};

    // Structural features
    features.tagName = element.tagName?.toLowerCase() || 'unknown';
    features.hasId = !!$elem.attr('id');
    features.classCount = ($elem.attr('class') || '').split(' ').filter(c => c).length;
    features.depth = this.getElementDepth($elem);
    features.childCount = $elem.children().length;
    features.textLength = $elem.text().trim().length;
    features.hasNumbers = /\d/.test($elem.text());
    features.hasCurrency = /[$£€¥]/.test($elem.text());
    
    // Position features
    const siblings = $elem.siblings();
    features.siblingCount = siblings.length;
    features.isFirstChild = $elem.is(':first-child');
    features.isLastChild = $elem.is(':last-child');
    
    // Content features
    const text = $elem.text().trim();
    features.isPrice = /\$[\d,]+/.test(text);
    features.isTitle = text.length >= 10 && text.length <= 100 && /^[A-Z]/.test(text);
    features.hasDataAttribute = $elem.get(0).attributes.length > 2;
    
    // Contextual features
    features.hasNearbyLabel = this.hasNearbyLabel($elem);
    features.parentTag = $elem.parent().prop('tagName')?.toLowerCase() || 'none';
    features.insideList = $elem.closest('ul, ol, dl').length > 0;
    features.insideTable = $elem.closest('table').length > 0;
    features.hasStrongAncestor = $elem.parents('strong, b, em').length > 0;
    
    // Class pattern features
    const classes = $elem.attr('class') || '';
    features.hasDataClass = /data|info|value|metric/.test(classes);
    features.hasPriceClass = /price|cost|amount/.test(classes);
    features.hasTitleClass = /title|name|heading/.test(classes);
    
    return features;
  }

  /**
   * Calculate prediction score based on features and weights
   */
  calculatePredictionScore(features, weights) {
    let score = 0;
    let totalWeight = 0;

    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        // Convert boolean features to 0/1
        const featureValue = typeof features[feature] === 'boolean' ? 
          (features[feature] ? 1 : 0) : features[feature];
        
        // Normalize numeric features
        const normalizedValue = this.normalizeFeatureValue(feature, featureValue);
        
        score += normalizedValue * weight;
        totalWeight += Math.abs(weight);
      }
    }

    // Normalize score to 0-1 range
    return totalWeight > 0 ? Math.min(1, Math.max(0, score / totalWeight)) : 0;
  }

  /**
   * Update feature weight based on example
   */
  updateWeight(currentWeight, featureValue, isPositive) {
    const target = isPositive ? 1 : 0;
    const error = target - (currentWeight * featureValue);
    const newWeight = currentWeight + (this.options.learningRate * error * featureValue);
    
    // Keep weights in reasonable range
    return Math.min(1, Math.max(0, newWeight));
  }

  /**
   * Update feature correlations
   */
  async updateCorrelations(dataType, features) {
    if (!this.model.correlations[dataType]) {
      this.model.correlations[dataType] = {};
    }

    const correlations = this.model.correlations[dataType];
    const featureKeys = Object.keys(features);

    // Update pairwise correlations
    for (let i = 0; i < featureKeys.length; i++) {
      for (let j = i + 1; j < featureKeys.length; j++) {
        const key = `${featureKeys[i]}-${featureKeys[j]}`;
        
        if (!correlations[key]) {
          correlations[key] = {
            count: 0,
            cooccurrence: 0
          };
        }

        correlations[key].count++;
        if (features[featureKeys[i]] && features[featureKeys[j]]) {
          correlations[key].cooccurrence++;
        }
      }
    }
  }

  /**
   * Explain why a prediction was made
   */
  explainPrediction(features, weights) {
    const importantFeatures = [];
    
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] && weight > 0.7) {
        importantFeatures.push({
          feature: feature,
          value: features[feature],
          importance: weight
        });
      }
    }

    importantFeatures.sort((a, b) => b.importance - a.importance);
    
    const topFeatures = importantFeatures.slice(0, 3);
    return topFeatures.map(f => `${f.feature}=${f.value}`).join(', ');
  }

  /**
   * Retrain models based on accumulated data
   */
  async retrainModels() {
    console.log('🔄 Retraining pattern models...');
    
    for (const [dataType, pattern] of Object.entries(this.model.patterns)) {
      if (pattern.examples.length < 10) continue;
      
      console.log(`  → Retraining ${dataType} model with ${pattern.examples.length} examples`);
      
      // Reset weights
      pattern.featureWeights = {};
      
      // Retrain on all examples
      for (const example of pattern.examples) {
        for (const [feature, value] of Object.entries(example.features)) {
          if (!pattern.featureWeights[feature]) {
            pattern.featureWeights[feature] = 0.5;
          }
          
          // Adjust weight based on example confidence
          const adjustment = example.confidence > 0.8 ? 0.15 : 0.05;
          pattern.featureWeights[feature] += value ? adjustment : -adjustment;
        }
      }
      
      // Normalize weights
      const maxWeight = Math.max(...Object.values(pattern.featureWeights));
      if (maxWeight > 0) {
        for (const feature in pattern.featureWeights) {
          pattern.featureWeights[feature] /= maxWeight;
        }
      }
    }
    
    this.model.lastTrained = new Date().toISOString();
    await this.saveModel();
    
    console.log('✅ Model retraining completed');
  }

  /**
   * Get model insights
   */
  getModelInsights() {
    const insights = {
      dataTypes: {},
      overallPerformance: {
        totalExamples: 0,
        averageConfidence: 0
      },
      topFeatures: {},
      recommendations: []
    };

    for (const [dataType, pattern] of Object.entries(this.model.patterns)) {
      const successRate = pattern.totalCount > 0 ? 
        pattern.successCount / pattern.totalCount : 0;
      
      insights.dataTypes[dataType] = {
        examples: pattern.examples.length,
        successRate: (successRate * 100).toFixed(1) + '%',
        topFeatures: this.getTopFeatures(pattern.featureWeights),
        averageConfidence: this.calculateAverageConfidence(pattern.examples)
      };
      
      insights.overallPerformance.totalExamples += pattern.examples.length;
    }

    // Generate recommendations
    for (const [dataType, info] of Object.entries(insights.dataTypes)) {
      if (parseFloat(info.successRate) < 70) {
        insights.recommendations.push({
          type: 'low-success-rate',
          dataType: dataType,
          message: `Consider collecting more training data for ${dataType}`
        });
      }
    }

    return insights;
  }

  /**
   * Helper methods
   */
  getElementDepth($elem) {
    let depth = 0;
    let current = $elem;
    
    while (current.parent().length && depth < 20) {
      current = current.parent();
      depth++;
    }
    
    return depth;
  }

  hasNearbyLabel($elem) {
    // Check previous siblings for label-like elements
    const prevText = $elem.prev().text().toLowerCase();
    const parentText = $elem.parent().text().toLowerCase();
    
    const labelKeywords = ['price', 'revenue', 'profit', 'name', 'title', 'value'];
    
    return labelKeywords.some(keyword => 
      prevText.includes(keyword) || parentText.includes(keyword)
    );
  }

  normalizeFeatureValue(feature, value) {
    // Normalize numeric features to 0-1 range
    const numericFeatures = {
      depth: { min: 0, max: 20 },
      childCount: { min: 0, max: 10 },
      textLength: { min: 0, max: 200 },
      siblingCount: { min: 0, max: 20 },
      classCount: { min: 0, max: 10 }
    };

    if (numericFeatures[feature]) {
      const { min, max } = numericFeatures[feature];
      return Math.min(1, Math.max(0, (value - min) / (max - min)));
    }

    // Boolean features are already 0 or 1
    return value;
  }

  generateSelectorFromElement(element, $) {
    const $elem = $(element);
    const tag = element.tagName?.toLowerCase();
    const id = $elem.attr('id');
    const classes = $elem.attr('class');
    
    if (id) return `#${id}`;
    
    if (classes) {
      const mainClass = classes.split(' ').filter(c => c && !c.match(/active|hover/))[0];
      if (mainClass) return `${tag}.${mainClass}`;
    }
    
    return tag;
  }

  getTopFeatures(weights, count = 5) {
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([feature, weight]) => ({
        feature: feature,
        weight: (weight * 100).toFixed(1) + '%'
      }));
  }

  calculateAverageConfidence(examples) {
    if (examples.length === 0) return 0;
    
    const sum = examples.reduce((acc, ex) => acc + (ex.confidence || 0), 0);
    return (sum / examples.length * 100).toFixed(1) + '%';
  }

  calculateConfidence(features, weights) {
    return this.calculatePredictionScore(features, weights);
  }

  /**
   * Export model for analysis
   */
  async exportModel() {
    const exportData = {
      model: this.model,
      insights: this.getModelInsights(),
      exportedAt: new Date().toISOString()
    };

    const exportPath = path.join(
      process.cwd(),
      'data',
      'scraping',
      `pattern-model-export-${Date.now()}.json`
    );

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`🧠 Model exported to: ${exportPath}`);
    return exportPath;
  }
}

module.exports = PatternLearner;