import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export class EnvLoader {
  private static instance: EnvLoader;
  private loadedFiles: string[] = [];

  private constructor() {
    this.loadEnvironmentFiles();
  }

  public static getInstance(): EnvLoader {
    if (!EnvLoader.instance) {
      EnvLoader.instance = new EnvLoader();
    }
    return EnvLoader.instance;
  }

  private loadEnvironmentFiles(): void {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    const envPath = path.resolve(process.cwd(), '.env');

    try {
      // Priority: Prefer .env.local; if not present, use .env
      if (fs.existsSync(envLocalPath)) {
        dotenv.config({ path: envLocalPath, override: true });
        this.loadedFiles.push('.env.local');
        console.log('📁 Environment loaded from .env.local');
      } else if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        this.loadedFiles.push('.env');
        console.log('📁 Environment loaded from .env');
      }

      // Check if any environment files were loaded
      if (this.loadedFiles.length === 0) {
        console.log('⚠️  No environment files found (.env.local or .env)');
        console.log(
          '💡 Create .env.local for local development or .env for shared configuration',
        );
      } else {
        console.log(
          `✅ Environment files loaded: ${this.loadedFiles.join(', ')}`,
        );
      }

      // Verify that required variables are loaded
      this.verifyRequiredVariables();
    } catch (error) {
      console.error('❌ Error loading environment files:', error.message);
      throw new Error('Failed to load environment configuration');
    }
  }

  private verifyRequiredVariables(): void {
    const requiredVars = [
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_NAME',
      'DATABASE_USER',
      'DATABASE_PASSWORD',
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(
        `⚠️  Missing optional environment variables: ${missingVars.join(', ')}`,
      );
      console.warn(
        '💡 Please check your .env.local or .env file if using individual database parameters',
      );
    } else {
      console.log('✅ All database environment variables are loaded');
    }
  }

  public getLoadedFiles(): string[] {
    return [...this.loadedFiles];
  }

  public reload(): void {
    this.loadedFiles = [];
    this.loadEnvironmentFiles();
  }
}

// Export a function to ensure environment is loaded
export const loadEnvironment = (): void => {
  EnvLoader.getInstance();
};
