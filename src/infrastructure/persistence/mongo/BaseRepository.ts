/**
 * Base Repository
 * Abstract base class for MongoDB repositories
 */

import { Collection, Db } from 'mongodb';

/**
 * Base entity interface
 */
export interface BaseEntity {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Abstract Base Repository
 * Provides common CRUD operations for MongoDB collections
 */
export abstract class BaseRepository<T extends BaseEntity> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected collection: Collection<any>;
  protected readonly collectionName: string;

  constructor(db: Db, collectionName: string) {
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  /**
   * Create a new document
   */
  async create(entity: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date();
    const document = {
      ...entity,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(document);
    
    return {
      ...entity,
      _id: result.insertedId.toString(),
      createdAt: now,
      updatedAt: now,
    } as T;
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await this.collection.findOne({ _id: id });
    return result ? this.toDomain(result) : null;
  }

  /**
   * Find all documents matching filter
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async find(filter: Record<string, any> = {}): Promise<T[]> {
    const cursor = this.collection.find(filter);
    const results = await cursor.toArray();
    return results.map(doc => this.toDomain(doc));
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: Record<string, any> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return {
      data: results.map(doc => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a document
   */
  async update(id: string, update: Partial<Omit<T, '_id' | 'createdAt'>>): Promise<T | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { 
        $set: { 
          ...update, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    return result ? this.toDomain(result) : null;
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Count documents matching filter
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async count(filter: Record<string, any> = {}): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  /**
   * Convert domain entity to database document
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract toDocument(entity: T): any;

  /**
   * Convert database document to domain entity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract toDomain(document: any): T;
}
