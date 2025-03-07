/**
 * Batch processing utilities for efficient handling of bulk operations
 */
import { createLogger } from './logger';

const logger = createLogger('batchProcessing');

/**
 * Process items in batches
 * @param items - Array of items to process
 * @param batchSize - Number of items to process in each batch
 * @param processFn - Function to process each batch
 * @param options - Optional configuration
 * @returns Promise resolving to results from all batches
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<R[]>,
  options: {
    onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { onBatchComplete, onProgress } = options;
  const results: R[] = [];
  
  // If no items, return empty results
  if (items.length === 0) {
    return results;
  }
  
  // Calculate number of batches
  const batchCount = Math.ceil(items.length / batchSize);
  
  logger.debug(`Processing ${items.length} items in ${batchCount} batches of size ${batchSize}`);
  
  // Process each batch
  for (let i = 0; i < batchCount; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);
    
    logger.debug(`Processing batch ${i + 1}/${batchCount} with ${batch.length} items`);
    
    try {
      const batchResults = await processFn(batch);
      results.push(...batchResults);
      
      // Call batch complete callback if provided
      if (onBatchComplete) {
        onBatchComplete(batchResults, i);
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(end, items.length);
      }
      
      logger.debug(`Completed batch ${i + 1}/${batchCount}`);
    } catch (error) {
      logger.error(`Error processing batch ${i + 1}/${batchCount}`, { error });
      throw error;
    }
  }
  
  logger.debug(`Completed processing all ${items.length} items`);
  
  return results;
}

/**
 * Process items in parallel batches
 * @param items - Array of items to process
 * @param batchSize - Number of items to process in each batch
 * @param concurrency - Number of batches to process in parallel
 * @param processFn - Function to process each batch
 * @param options - Optional configuration
 * @returns Promise resolving to results from all batches
 */
export async function processParallelBatches<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processFn: (batch: T[]) => Promise<R[]>,
  options: {
    onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { onBatchComplete, onProgress } = options;
  const results: R[] = [];
  
  // If no items, return empty results
  if (items.length === 0) {
    return results;
  }
  
  // Calculate number of batches
  const batchCount = Math.ceil(items.length / batchSize);
  
  logger.debug(`Processing ${items.length} items in ${batchCount} batches with concurrency ${concurrency}`);
  
  // Create batch processor function
  const processBatch = async (batchIndex: number): Promise<R[]> => {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);
    
    logger.debug(`Processing batch ${batchIndex + 1}/${batchCount} with ${batch.length} items`);
    
    try {
      const batchResults = await processFn(batch);
      
      // Call batch complete callback if provided
      if (onBatchComplete) {
        onBatchComplete(batchResults, batchIndex);
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(end, items.length);
      }
      
      logger.debug(`Completed batch ${batchIndex + 1}/${batchCount}`);
      
      return batchResults;
    } catch (error) {
      logger.error(`Error processing batch ${batchIndex + 1}/${batchCount}`, { error });
      throw error;
    }
  };
  
  // Process batches in parallel with limited concurrency
  let currentBatchIndex = 0;
  
  const runNextBatch = async (): Promise<R[]> => {
    const batchIndex = currentBatchIndex++;
    
    if (batchIndex >= batchCount) {
      return [];
    }
    
    const batchResults = await processBatch(batchIndex);
    const nextResults = await runNextBatch();
    
    return [...batchResults, ...nextResults];
  };
  
  // Start concurrent batch processors
  const processors = Array.from({ length: Math.min(concurrency, batchCount) }, () => runNextBatch());
  
  // Wait for all processors to complete
  const allResults = await Promise.all(processors);
  
  // Flatten results
  for (const batchResults of allResults) {
    results.push(...batchResults);
  }
  
  logger.debug(`Completed processing all ${items.length} items`);
  
  return results;
}
