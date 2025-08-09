// personas.ts
// User personas with different browsing habits and interests

export interface BrowsingPersona {
  id: string;
  name: string;
  profile: {
    age: number;
    profession: string;
    interests: string[];
    experience: 'beginner' | 'intermediate' | 'expert';
    investmentRange: { min: number; max: number };
    preferredCategories: string[];
    timezone: string;
    location: string;
  };
  behavior: {
    readingSpeed: number; // words per minute
    scrollPattern: 'fast' | 'moderate' | 'thorough';
    clickProbability: number; // 0-1
    dwellTime: { min: number; max: number }; // seconds per page
    sessionDuration: { min: number; max: number }; // minutes
    breakFrequency: number; // breaks per hour
    breakDuration: { min: number; max: number }; // seconds
    focusAreas: string[]; // what they look at first
    distractionLevel: 'low' | 'medium' | 'high';
  };
  interaction: {
    mouseMovement: {
      speed: 'slow' | 'normal' | 'fast';
      precision: 'precise' | 'natural' | 'erratic';
      hovering: boolean;
      jitter: number; // 0-10
    };
    scrolling: {
      smoothness: number; // 1-10
      readAhead: boolean;
      backtracking: boolean;
      speedVariation: number; // 0-1
    };
    clicking: {
      doubleClickProbability: number;
      rightClickProbability: number;
      missClickProbability: number;
      hesitation: boolean;
    };
  };
  preferences: {
    sortBy: 'price' | 'revenue' | 'age' | 'category';
    filterPreferences: {
      priceRange?: { min: number; max: number };
      revenueRange?: { min: number; max: number };
      categories?: string[];
      businessAge?: 'new' | 'established' | 'any';
    };
    detailLevel: 'quick' | 'moderate' | 'detailed';
  };
}

export const PERSONA_TEMPLATES: BrowsingPersona[] = [
  {
    id: 'novice-investor',
    name: 'Sarah - Novice Investor',
    profile: {
      age: 28,
      profession: 'Marketing Manager',
      interests: ['e-commerce', 'dropshipping', 'affiliate marketing'],
      experience: 'beginner',
      investmentRange: { min: 5000, max: 25000 },
      preferredCategories: ['E-commerce', 'Content', 'Service'],
      timezone: 'America/New_York',
      location: 'New York, NY'
    },
    behavior: {
      readingSpeed: 200,
      scrollPattern: 'thorough',
      clickProbability: 0.7,
      dwellTime: { min: 45, max: 120 },
      sessionDuration: { min: 20, max: 45 },
      breakFrequency: 3,
      breakDuration: { min: 60, max: 300 },
      focusAreas: ['price', 'revenue', 'description'],
      distractionLevel: 'high'
    },
    interaction: {
      mouseMovement: {
        speed: 'normal',
        precision: 'natural',
        hovering: true,
        jitter: 3
      },
      scrolling: {
        smoothness: 7,
        readAhead: true,
        backtracking: true,
        speedVariation: 0.4
      },
      clicking: {
        doubleClickProbability: 0.05,
        rightClickProbability: 0.02,
        missClickProbability: 0.03,
        hesitation: true
      }
    },
    preferences: {
      sortBy: 'price',
      filterPreferences: {
        priceRange: { min: 5000, max: 25000 },
        categories: ['E-commerce', 'Content'],
        businessAge: 'any'
      },
      detailLevel: 'detailed'
    }
  },
  {
    id: 'experienced-flipper',
    name: 'Mike - Experienced Flipper',
    profile: {
      age: 42,
      profession: 'Business Broker',
      interests: ['SaaS', 'marketplaces', 'high-revenue businesses'],
      experience: 'expert',
      investmentRange: { min: 50000, max: 500000 },
      preferredCategories: ['SaaS', 'Marketplace', 'Service'],
      timezone: 'America/Los_Angeles',
      location: 'San Francisco, CA'
    },
    behavior: {
      readingSpeed: 350,
      scrollPattern: 'fast',
      clickProbability: 0.4,
      dwellTime: { min: 20, max: 60 },
      sessionDuration: { min: 45, max: 120 },
      breakFrequency: 1,
      breakDuration: { min: 30, max: 120 },
      focusAreas: ['financials', 'traffic', 'growth metrics'],
      distractionLevel: 'low'
    },
    interaction: {
      mouseMovement: {
        speed: 'fast',
        precision: 'precise',
        hovering: false,
        jitter: 1
      },
      scrolling: {
        smoothness: 9,
        readAhead: false,
        backtracking: false,
        speedVariation: 0.2
      },
      clicking: {
        doubleClickProbability: 0.01,
        rightClickProbability: 0.05,
        missClickProbability: 0.01,
        hesitation: false
      }
    },
    preferences: {
      sortBy: 'revenue',
      filterPreferences: {
        priceRange: { min: 50000, max: 500000 },
        revenueRange: { min: 5000, max: 100000 },
        categories: ['SaaS', 'Marketplace'],
        businessAge: 'established'
      },
      detailLevel: 'quick'
    }
  },
  {
    id: 'casual-browser',
    name: 'Emma - Casual Browser',
    profile: {
      age: 35,
      profession: 'Freelance Designer',
      interests: ['creative businesses', 'content sites', 'blogs'],
      experience: 'intermediate',
      investmentRange: { min: 10000, max: 50000 },
      preferredCategories: ['Content', 'Service', 'Blog'],
      timezone: 'America/Chicago',
      location: 'Austin, TX'
    },
    behavior: {
      readingSpeed: 250,
      scrollPattern: 'moderate',
      clickProbability: 0.6,
      dwellTime: { min: 30, max: 90 },
      sessionDuration: { min: 15, max: 40 },
      breakFrequency: 4,
      breakDuration: { min: 120, max: 600 },
      focusAreas: ['description', 'category', 'age'],
      distractionLevel: 'medium'
    },
    interaction: {
      mouseMovement: {
        speed: 'normal',
        precision: 'natural',
        hovering: true,
        jitter: 5
      },
      scrolling: {
        smoothness: 6,
        readAhead: true,
        backtracking: true,
        speedVariation: 0.5
      },
      clicking: {
        doubleClickProbability: 0.08,
        rightClickProbability: 0.03,
        missClickProbability: 0.05,
        hesitation: true
      }
    },
    preferences: {
      sortBy: 'age',
      filterPreferences: {
        priceRange: { min: 10000, max: 50000 },
        categories: ['Content', 'Blog', 'Service']
      },
      detailLevel: 'moderate'
    }
  },
  {
    id: 'tech-savvy-developer',
    name: 'Alex - Tech-Savvy Developer',
    profile: {
      age: 31,
      profession: 'Software Developer',
      interests: ['SaaS', 'apps', 'tech startups', 'APIs'],
      experience: 'expert',
      investmentRange: { min: 20000, max: 150000 },
      preferredCategories: ['SaaS', 'App', 'Software'],
      timezone: 'America/Denver',
      location: 'Denver, CO'
    },
    behavior: {
      readingSpeed: 400,
      scrollPattern: 'fast',
      clickProbability: 0.3,
      dwellTime: { min: 15, max: 45 },
      sessionDuration: { min: 30, max: 90 },
      breakFrequency: 2,
      breakDuration: { min: 30, max: 90 },
      focusAreas: ['tech stack', 'code quality', 'scalability'],
      distractionLevel: 'low'
    },
    interaction: {
      mouseMovement: {
        speed: 'fast',
        precision: 'precise',
        hovering: false,
        jitter: 0
      },
      scrolling: {
        smoothness: 10,
        readAhead: false,
        backtracking: false,
        speedVariation: 0.1
      },
      clicking: {
        doubleClickProbability: 0,
        rightClickProbability: 0.1,
        missClickProbability: 0,
        hesitation: false
      }
    },
    preferences: {
      sortBy: 'category',
      filterPreferences: {
        categories: ['SaaS', 'App', 'Software'],
        businessAge: 'any'
      },
      detailLevel: 'quick'
    }
  },
  {
    id: 'retired-investor',
    name: 'Robert - Retired Investor',
    profile: {
      age: 65,
      profession: 'Retired Executive',
      interests: ['stable businesses', 'established revenue', 'passive income'],
      experience: 'intermediate',
      investmentRange: { min: 100000, max: 1000000 },
      preferredCategories: ['E-commerce', 'Service', 'Marketplace'],
      timezone: 'America/Phoenix',
      location: 'Phoenix, AZ'
    },
    behavior: {
      readingSpeed: 180,
      scrollPattern: 'thorough',
      clickProbability: 0.5,
      dwellTime: { min: 60, max: 180 },
      sessionDuration: { min: 60, max: 150 },
      breakFrequency: 2,
      breakDuration: { min: 300, max: 900 },
      focusAreas: ['history', 'stability', 'revenue consistency'],
      distractionLevel: 'medium'
    },
    interaction: {
      mouseMovement: {
        speed: 'slow',
        precision: 'natural',
        hovering: true,
        jitter: 4
      },
      scrolling: {
        smoothness: 5,
        readAhead: false,
        backtracking: true,
        speedVariation: 0.3
      },
      clicking: {
        doubleClickProbability: 0.1,
        rightClickProbability: 0.05,
        missClickProbability: 0.08,
        hesitation: true
      }
    },
    preferences: {
      sortBy: 'revenue',
      filterPreferences: {
        priceRange: { min: 100000, max: 1000000 },
        revenueRange: { min: 10000, max: 500000 },
        businessAge: 'established'
      },
      detailLevel: 'detailed'
    }
  }
];

export class PersonaManager {
  private activePersona: BrowsingPersona;
  private personaHistory: Map<string, { lastUsed: Date; usageCount: number }> = new Map();
  
  constructor() {
    this.activePersona = this.selectRandomPersona();
  }

  selectRandomPersona(): BrowsingPersona {
    const weights = this.calculatePersonaWeights();
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { persona, weight } of weights) {
      random -= weight;
      if (random <= 0) {
        this.updatePersonaHistory(persona.id);
        return persona;
      }
    }
    
    return PERSONA_TEMPLATES[0];
  }

  private calculatePersonaWeights(): Array<{ persona: BrowsingPersona; weight: number }> {
    return PERSONA_TEMPLATES.map(persona => {
      const history = this.personaHistory.get(persona.id);
      let weight = 1;
      
      // Reduce weight if recently used
      if (history) {
        const hoursSinceLastUse = (Date.now() - history.lastUsed.getTime()) / (1000 * 60 * 60);
        weight = Math.min(1, hoursSinceLastUse / 24); // Full weight after 24 hours
      }
      
      return { persona, weight };
    });
  }

  private updatePersonaHistory(personaId: string) {
    const history = this.personaHistory.get(personaId) || { lastUsed: new Date(), usageCount: 0 };
    history.lastUsed = new Date();
    history.usageCount++;
    this.personaHistory.set(personaId, history);
  }

  getActivePersona(): BrowsingPersona {
    return this.activePersona;
  }

  switchPersona(personaId?: string): BrowsingPersona {
    if (personaId) {
      const persona = PERSONA_TEMPLATES.find(p => p.id === personaId);
      if (persona) {
        this.activePersona = persona;
        this.updatePersonaHistory(personaId);
        return persona;
      }
    }
    
    this.activePersona = this.selectRandomPersona();
    return this.activePersona;
  }

  // Adjust persona behavior based on time of day
  adjustForTimeOfDay(persona: BrowsingPersona): BrowsingPersona {
    const hour = new Date().getHours();
    const adjusted = JSON.parse(JSON.stringify(persona)) as BrowsingPersona;
    
    // Early morning (5-8 AM) - slower, more breaks
    if (hour >= 5 && hour < 8) {
      adjusted.behavior.readingSpeed *= 0.8;
      adjusted.behavior.breakFrequency *= 1.5;
      adjusted.interaction.mouseMovement.speed = 'slow';
    }
    // Late night (10 PM - 2 AM) - more erratic, faster but less precise
    else if (hour >= 22 || hour < 2) {
      adjusted.behavior.distractionLevel = 'high';
      adjusted.interaction.clicking.missClickProbability *= 2;
      adjusted.interaction.mouseMovement.jitter += 2;
    }
    // Peak hours (10 AM - 12 PM, 2-4 PM) - optimal performance
    else if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 16)) {
      adjusted.behavior.readingSpeed *= 1.1;
      adjusted.behavior.distractionLevel = 'low';
    }
    
    return adjusted;
  }
}

export default PersonaManager;