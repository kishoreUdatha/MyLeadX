import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../types';

/**
 * Storage utility for managing AsyncStorage operations
 */
export const storage = {
  /**
   * Get item from storage
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },

  /**
   * Set item in storage
   */
  set: async <T>(key: string, value: T): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  },

  /**
   * Remove item from storage
   */
  remove: async (key: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  },

  /**
   * Clear all app storage
   */
  clearAll: async (): Promise<boolean> => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  /**
   * Get multiple items
   */
  getMultiple: async <T extends Record<string, any>>(
    keys: string[]
  ): Promise<Partial<T>> => {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Partial<T> = {};

      pairs.forEach(([key, value]) => {
        if (value) {
          (result as any)[key] = JSON.parse(value);
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return {};
    }
  },

  /**
   * Set multiple items
   */
  setMultiple: async (items: Record<string, any>): Promise<boolean> => {
    try {
      const pairs = Object.entries(items).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]) as [string, string][];

      await AsyncStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('Error setting multiple items:', error);
      return false;
    }
  },

  /**
   * Get all keys
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys as string[];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

export default storage;
