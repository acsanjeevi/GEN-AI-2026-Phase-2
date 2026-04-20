/**
 * In-Memory Feature Repository
 * Dummy implementation for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { Feature, FeatureTag, createFeature } from '../../../domain/models/Feature';
import { 
  IFeatureRepository, 
  FindFeaturesOptions,
  PaginatedResult 
} from '../../../domain/repositories/IFeatureRepository';

/**
 * In-Memory Feature Repository
 * Stores features in memory for development and testing
 */
export class InMemoryFeatureRepository implements IFeatureRepository {
  private features: Map<string, Feature> = new Map();

  async create(feature: Feature): Promise<Feature> {
    // Generate ID if not provided
    const id = feature.id || uuidv4();
    
    const newFeature = createFeature({
      ...feature,
      id,
      metadata: {
        ...feature.metadata,
        parsedAt: feature.metadata.parsedAt || new Date(),
      },
    });

    this.features.set(id, newFeature);
    return newFeature;
  }

  async findById(id: string): Promise<Feature | null> {
    return this.features.get(id) || null;
  }

  async findByName(name: string): Promise<Feature | null> {
    for (const feature of this.features.values()) {
      if (feature.name === name) {
        return feature;
      }
    }
    return null;
  }

  async find(options?: FindFeaturesOptions): Promise<PaginatedResult<Feature>> {
    let features = Array.from(this.features.values());
    
    // Apply filters
    if (options?.tags && options.tags.length > 0) {
      features = features.filter(f => 
        f.tags.some((tag: FeatureTag) => options.tags?.includes(tag.name))
      );
    }
    
    if (options?.nameContains) {
      const searchTerm = options.nameContains.toLowerCase();
      features = features.filter(f => 
        f.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort
    const sortBy = options?.sortBy || 'name';
    const sortOrder = options?.sortOrder || 'asc';
    
    features.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'createdAt') {
        const aDate = a.metadata.parsedAt?.getTime() || 0;
        const bDate = b.metadata.parsedAt?.getTime() || 0;
        comparison = aDate - bDate;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const total = features.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = features.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(id: string, updates: Partial<Feature>): Promise<Feature | null> {
    const existing = this.features.get(id);
    if (!existing) {
      return null;
    }

    const updated = createFeature({
      ...existing,
      ...updates,
      id, // Preserve original ID
    });

    this.features.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.features.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.features.has(id);
  }

  async getAll(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  async count(options?: Pick<FindFeaturesOptions, 'tags' | 'nameContains'>): Promise<number> {
    if (!options?.tags && !options?.nameContains) {
      return this.features.size;
    }

    const result = await this.find(options);
    return result.total;
  }

  /**
   * Clear all features (useful for testing)
   */
  clear(): void {
    this.features.clear();
  }
}
