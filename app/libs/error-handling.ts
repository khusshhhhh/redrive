import { DualDatabaseResult } from './dual-database';

/**
 * Error handling utilities for dual database operations
 * Implements the patterns described in the CODE INTEGRATION section
 */

export class DualDatabaseError extends Error {
  constructor(
    message: string,
    public mongoSuccess: boolean,
    public supabaseSuccess: boolean,
    public details?: any
  ) {
    super(message);
    this.name = 'DualDatabaseError';
  }
}

export enum OperationResult {
  FULL_SUCCESS = 'FULL_SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FULL_FAILURE = 'FULL_FAILURE'
}

export interface ProcessedResult<T> {
  result: OperationResult;
  data: T | null;
  error?: string;
  warnings?: string[];
}

/**
 * Error handling utilities for dual database operations
 */
export class DualDatabaseErrorHandler {
  
  /**
   * Process dual database result with standardized error handling
   * Implements the graceful partial failure handling from CODE INTEGRATION
   */
  static processResult<T>(dualResult: DualDatabaseResult<T>): ProcessedResult<T> {
    const warnings: string[] = [];
    
    if (dualResult.success) {
      // Full success - both databases worked
      return {
        result: OperationResult.FULL_SUCCESS,
        data: dualResult.mongo
      };
    }
    
    if (dualResult.mongo && !dualResult.supabase) {
      // Partial success - MongoDB worked, Supabase failed
      warnings.push('Operation succeeded in MongoDB but failed in Supabase');
      warnings.push(`Supabase error: ${dualResult.error}`);
      
      return {
        result: OperationResult.PARTIAL_SUCCESS,
        data: dualResult.mongo,
        warnings,
        error: `Partial failure: ${dualResult.error}`
      };
    }
    
    if (!dualResult.mongo && dualResult.supabase) {
      // Partial success - Supabase worked, MongoDB failed (rare case)
      warnings.push('Operation succeeded in Supabase but failed in MongoDB');
      
      return {
        result: OperationResult.PARTIAL_SUCCESS,
        data: null, // We still return null since MongoDB is primary
        warnings,
        error: `Primary database (MongoDB) failed: ${dualResult.error}`
      };
    }
    
    // Full failure - both databases failed
    return {
      result: OperationResult.FULL_FAILURE,
      data: null,
      error: `Complete failure: ${dualResult.error}`
    };
  }
  
  /**
   * Handle result with logging and optional error throwing
   * Implementation of the error handling pattern from CODE INTEGRATION examples
   */
  static handleResult<T>(
    dualResult: DualDatabaseResult<T>,
    options: {
      throwOnFailure?: boolean;
      logWarnings?: boolean;
      operation?: string;
    } = {}
  ): T | null {
    const {
      throwOnFailure = false,
      logWarnings = true,
      operation = 'database operation'
    } = options;
    
    const processed = this.processResult(dualResult);
    
    switch (processed.result) {
      case OperationResult.FULL_SUCCESS:
        if (logWarnings) {
          console.log(`✅ ${operation} succeeded in both databases`);
        }
        return processed.data;
        
      case OperationResult.PARTIAL_SUCCESS:
        if (logWarnings) {
          console.warn(`⚠️ ${operation} partially successful:`, processed.warnings);
        }
        
        if (throwOnFailure) {
          throw new DualDatabaseError(
            `Partial failure in ${operation}`,
            !!dualResult.mongo,
            !!dualResult.supabase,
            processed.error
          );
        }
        
        return processed.data;
        
      case OperationResult.FULL_FAILURE:
        if (logWarnings) {
          console.error(`❌ ${operation} failed completely:`, processed.error);
        }
        
        if (throwOnFailure) {
          throw new DualDatabaseError(
            `Complete failure in ${operation}`,
            false,
            false,
            processed.error
          );
        }
        
        return null;
        
      default:
        throw new Error(`Unknown operation result: ${processed.result}`);
    }
  }
  
  /**
   * Wrapper for API route responses that implements the patterns from CODE INTEGRATION
   */
  static createApiResponse<T>(
    dualResult: DualDatabaseResult<T>,
    operation: string = 'operation'
  ) {
    const processed = this.processResult(dualResult);
    
    switch (processed.result) {
      case OperationResult.FULL_SUCCESS:
        return {
          success: true,
          data: processed.data,
          message: `${operation} completed successfully`,
          status: 201
        };
        
      case OperationResult.PARTIAL_SUCCESS:
        return {
          success: true,
          data: processed.data,
          message: `${operation} partially successful`,
          warnings: processed.warnings,
          status: 201
        };
        
      case OperationResult.FULL_FAILURE:
        return {
          success: false,
          data: null,
          error: processed.error,
          message: `${operation} failed`,
          status: 500
        };
        
      default:
        return {
          success: false,
          data: null,
          error: 'Unknown error occurred',
          status: 500
        };
    }
  }
  
  /**
   * Batch operation error handler
   */
  static processBatchResults<T>(
    results: DualDatabaseResult<T>[],
    operation: string = 'batch operation'
  ) {
    const summary = {
      total: results.length,
      fullSuccess: 0,
      partialSuccess: 0,
      failures: 0,
      data: [] as T[],
      errors: [] as string[],
      warnings: [] as string[]
    };
    
    results.forEach((result, index) => {
      const processed = this.processResult(result);
      
      switch (processed.result) {
        case OperationResult.FULL_SUCCESS:
          summary.fullSuccess++;
          if (processed.data) summary.data.push(processed.data);
          break;
          
        case OperationResult.PARTIAL_SUCCESS:
          summary.partialSuccess++;
          if (processed.data) summary.data.push(processed.data);
          if (processed.warnings) summary.warnings.push(...processed.warnings);
          break;
          
        case OperationResult.FULL_FAILURE:
          summary.failures++;
          if (processed.error) summary.errors.push(`Item ${index}: ${processed.error}`);
          break;
      }
    });
    
    console.log(`📊 ${operation} summary:`, {
      total: summary.total,
      successful: summary.fullSuccess + summary.partialSuccess,
      failed: summary.failures,
      warnings: summary.warnings.length
    });
    
    return summary;
  }
  
  /**
   * Retry mechanism for failed operations
   */
  static async retryOperation<T>(
    operation: () => Promise<DualDatabaseResult<T>>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<DualDatabaseResult<T>> {
    let lastResult: DualDatabaseResult<T>;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      
      lastResult = await operation();
      
      if (lastResult.success) {
        console.log(`✅ Operation succeeded on attempt ${attempt}`);
        return lastResult;
      }
      
      if (lastResult.mongo && !lastResult.supabase) {
        console.log(`⚠️ Partial success on attempt ${attempt}, not retrying`);
        return lastResult;
      }
      
      if (attempt < maxRetries) {
        console.log(`❌ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    
    console.log(`❌ All ${maxRetries} attempts failed`);
    return lastResult!;
  }
  
  /**
   * Health check for dual database system
   */
  static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    mongodb: boolean;
    supabase: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let mongodb = false;
    let supabase = false;
    
    try {
      // Test MongoDB
      const prisma = (await import('./prismadb')).default;
      await prisma.user.findFirst();
      mongodb = true;
      details.push('✅ MongoDB connection successful');
    } catch (error) {
      details.push(`❌ MongoDB connection failed: ${error}`);
    }
    
    try {
      // Test Supabase
      const supabaseClient = (await import('./supabase')).default;
      const { error } = await supabaseClient.from('users').select('count').limit(1);
      if (!error) {
        supabase = true;
        details.push('✅ Supabase connection successful');
      } else {
        details.push(`❌ Supabase connection failed: ${error.message}`);
      }
    } catch (error) {
      details.push(`❌ Supabase connection failed: ${error}`);
    }
    
    let status: 'healthy' | 'degraded' | 'critical';
    
    if (mongodb && supabase) {
      status = 'healthy';
    } else if (mongodb || supabase) {
      status = 'degraded';
    } else {
      status = 'critical';
    }
    
    return { status, mongodb, supabase, details };
  }
}

/**
 * Decorator for automatic error handling in API routes
 */
export function withDualDatabaseErrorHandling(
  operation: string,
  options: { throwOnFailure?: boolean; logWarnings?: boolean } = {}
) {
  return function <T>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<DualDatabaseResult<T>>>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = async function (...args: any[]): Promise<DualDatabaseResult<T>> {
      const result = await method.apply(this, args);
      // Process the result but return the original result structure
      DualDatabaseErrorHandler.handleResult(result, { operation, ...options });
      return result;
    } as any;
  };
}