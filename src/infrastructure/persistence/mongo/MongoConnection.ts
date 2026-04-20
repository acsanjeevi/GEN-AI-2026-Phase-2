/**
 * MongoDB Connection Manager
 * Handles MongoDB connections with singleton pattern
 */

import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { ILogger } from '../../logging/logger.interface';

/**
 * MongoDB connection configuration
 */
export interface MongoConfig {
  /** MongoDB connection URI */
  uri: string;
  /** Database name */
  dbName: string;
  /** Connection options */
  options?: MongoClientOptions;
}

/**
 * MongoDB Connection Manager
 * Manages the MongoDB client connection lifecycle
 */
export class MongoConnection {
  private static instance: MongoConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private logger: ILogger;

  private constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(logger: ILogger): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection(logger);
    }
    return MongoConnection.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(config: MongoConfig): Promise<Db> {
    if (this.db) {
      this.logger.debug('MongoDB connection already established');
      return this.db;
    }

    try {
      this.logger.info('Connecting to MongoDB...', { uri: this.maskUri(config.uri) });
      
      this.client = new MongoClient(config.uri, {
        ...config.options,
      });

      await this.client.connect();
      this.db = this.client.db(config.dbName);
      
      // Verify connection
      await this.db.command({ ping: 1 });
      
      this.logger.info('MongoDB connected successfully', { 
        database: config.dbName 
      });

      return this.db;
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get the MongoDB client
   */
  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.db !== null && this.client !== null;
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from MongoDB...');
      await this.client.close();
      this.client = null;
      this.db = null;
      this.logger.info('MongoDB disconnected');
    }
  }

  /**
   * Mask sensitive parts of the URI for logging
   */
  private maskUri(uri: string): string {
    try {
      const url = new URL(uri);
      if (url.password) {
        url.password = '****';
      }
      return url.toString();
    } catch {
      return uri.replace(/:[^:@]+@/, ':****@');
    }
  }
}
