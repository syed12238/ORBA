import { IStorageService } from "./storage.interface";
import { LocalStorageProvider } from "./local.provider";
import { SupabaseStorageProvider } from "./supabase.provider";

export * from "./storage.interface";

class StorageFactory {
  private static instance: IStorageService;

  public static getStorageService(): IStorageService {
    if (!StorageFactory.instance) {
      const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
      if (useSupabase) {
        StorageFactory.instance = new SupabaseStorageProvider();
      } else {
        StorageFactory.instance = new LocalStorageProvider();
      }
    }
    return StorageFactory.instance;
  }
}

export const storageService = StorageFactory.getStorageService();
