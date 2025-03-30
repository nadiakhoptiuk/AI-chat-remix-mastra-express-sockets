import 'dotenv/config';
import { PostgresStore } from "@mastra/pg";

/**
 * MastraStorageManager - Singleton class to manage Mastra storage connections
 */
export class MastraStorageManager {
  private static instance: MastraStorageManager;
  private storageInstance: PostgresStore | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of the storage manager
   */
  public static getInstance(): MastraStorageManager {
    if (!MastraStorageManager.instance) {
      MastraStorageManager.instance = new MastraStorageManager();
    }
    return MastraStorageManager.instance;
  }

  /**
   * Initialize storage with connection parameters
   */
  private initializeStorage(): PostgresStore | null {
    console.log('Initializing Mastra storage connection...');

    if (!process.env.DATABASE_PORT || !process.env.DATABASE_NAME || !process.env.DATABASE_USER || !process.env.DATABASE_PASSWORD) {
      console.error('DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD is not set!');
      return null;
    }

    const storage = new PostgresStore({
      host: process.env.DATABASE_HOST!,
      port: parseInt(process.env.DATABASE_PORT),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
    });
    
    return storage;
  }

  /**
   * Get storage - returns existing storage instance or creates a new one
   */
  public getStorage(): PostgresStore {
    if (!this.storageInstance) {
      console.log('Storage instance is', this.storageInstance)
      this.storageInstance = this.initializeStorage();
    }
    console.log('Storage instance: ', this.storageInstance)
    return this.storageInstance as PostgresStore;
  }

  /**
   * Check if storage is initialized
   */
  public isInitialized(): boolean {
    return this.storageInstance !== null;
  }
} 