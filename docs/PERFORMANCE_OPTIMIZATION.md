# Performance Optimization and Caching

This document describes the performance optimization and caching system implemented for the global activity tracking feature.

## Overview

The performance optimization system includes:

- **Redis Caching**: High-performance caching with fallback to memory cache
- **Database Indexing**: Optimized indexes for activity logs, notifications, and stock movements
- **Background Jobs**: Automated cleanup and maintenance tasks
- **Pagination**: Efficient handling of large datasets
- **Performance Monitoring**: Real-time performance tracking and alerting
- **Load Testing**: Comprehensive performance test suite

## Components

### 1. Cache Management

#### Redis Client (`src/lib/cache/redis-client.ts`)
- Singleton Redis connection with automatic reconnection
- Graceful fallback to memory cache when Redis is unavailable
- Connection pooling and error handling

#### Cache Manager (`src/lib/cache/cache-manager.ts`)
- Unified caching interface supporting both Redis and memory cache
- Automatic TTL (Time To Live) management
- Pattern-based cache invalidation
- Memory cleanup for fallback cache

#### Specialized Caches
- **Permission Cache** (`src/lib/cache/permission-cache.ts`): Caches user permissions and role-based access
- **Translation Cache** (`src/lib/cache/translation-cache.ts`): Caches multi-language translations

### 2. Database Optimization

#### Indexes Added
```sql
-- Activity Logs
@@index([userId, timestamp])
@@index([module, timestamp])
@@index([entityType, entityId])
@@index([timestamp])

-- Notifications
@@index([userId, read, createdAt])
@@index([type, createdAt])
@@index([priority, createdAt])
@@index([expiresAt])

-- Stock Movements
@@index([productId, timestamp])
@@index([type, timestamp])
@@index([userId, timestamp])
@@index([timestamp])

-- Stock Reservations
@@index([productId, expiresAt])
@@index([userId, expiresAt])
@@index([expiresAt])

-- Translations
@@index([language])
@@index([module, language])
```

### 3. Background Jobs

#### Job Manager (`src/lib/jobs/background-jobs.ts`)
Automated maintenance tasks:

- **Notification Cleanup**: Removes expired and old read notifications (hourly)
- **Activity Log Archival**: Archives old activity logs (daily)
- **Stock Reservation Cleanup**: Removes expired reservations (every 15 minutes)
- **Cache Cleanup**: Cleans up memory cache (every 30 minutes)
- **Performance Metrics**: Collects system metrics (every 5 minutes)

### 4. Pagination System

#### Pagination Helper (`src/lib/utils/pagination.ts`)
- Standardized pagination parameters validation
- Efficient skip/take calculation for database queries
- Search and filtering support
- Specialized pagination for different entity types

### 5. Performance Monitoring

#### Performance Monitor (`src/lib/monitoring/performance-monitor.ts`)
- Query performance measurement
- API endpoint monitoring
- System resource tracking
- Automatic alerting for slow operations
- Custom metrics collection

#### Monitoring Features
- **Query Monitoring**: Tracks database query performance
- **API Monitoring**: Measures API response times
- **System Metrics**: Monitors memory usage, uptime, etc.
- **Cache Metrics**: Tracks cache hit/miss rates
- **Alerting**: Automatic alerts for performance issues

### 6. Cached Services

#### Cached Activity Service (`src/lib/services/cached-activity-service.ts`)
- Caches activity log queries with role-based filtering
- Automatic cache invalidation on data changes
- Performance monitoring integration

#### Cached Notification Service (`src/lib/services/cached-notification-service.ts`)
- Caches notification queries and counts
- Real-time cache invalidation
- Optimized unread count queries

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_PREFIX=account-zero

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_ALERT_WEBHOOK=
```

### Cache TTL Settings

- **Permissions**: 30 minutes (1800 seconds)
- **Role Permissions**: 1 hour (3600 seconds)
- **Translations**: 2 hours (7200 seconds)
- **Activity Logs**: 5 minutes (300 seconds)
- **Notifications**: 3 minutes (180 seconds)
- **Notification Counts**: 1 minute (60 seconds)

## Performance Thresholds

### Alert Thresholds
- **Query Duration**: 5 seconds
- **API Duration**: 3 seconds
- **Memory Usage**: 90% of available memory
- **Error Rate**: 10%

### Pagination Limits
- **Default Limit**: 20 items per page
- **Maximum Limit**: 100 items per page

## Usage Examples

### Basic Caching

```typescript
import { CacheManager } from '@/lib/cache/cache-manager'

// Set cache value
await CacheManager.set('user-data', userData, { ttl: 3600 })

// Get cache value
const userData = await CacheManager.get('user-data')

// Invalidate cache pattern
await CacheManager.invalidatePattern('user-*')
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

// Monitor database query
const result = await PerformanceMonitor.measureQuery('getUserData', async () => {
  return await prisma.user.findMany()
})

// Monitor API endpoint
const response = await PerformanceMonitor.measureAPI('/api/users', 'GET', async () => {
  return await handleUserRequest()
})
```

### Cached Service Usage

```typescript
import { CachedActivityService } from '@/lib/services/cached-activity-service'

// Get paginated activities with caching
const activities = await CachedActivityService.getActivities({
  page: 1,
  limit: 20,
  module: 'inventory',
  userId: 'user-id'
})

// Get activity statistics with caching
const stats = await CachedActivityService.getActivityStats('user-id')
```

## Performance Testing

### Test Suite (`src/lib/testing/performance-tests.ts`)

The performance test suite includes:

- **Database Query Tests**: Measure query performance across different scenarios
- **Cache Performance Tests**: Test cache hit rates and operation speeds
- **Concurrent Operation Tests**: Verify system behavior under concurrent load
- **Memory Usage Tests**: Monitor memory consumption and leak detection
- **Large Dataset Tests**: Test pagination and handling of large datasets

### Running Performance Tests

```bash
# Run full performance test suite
npm run test -- src/lib/testing/__tests__/performance.test.ts --run

# Run specific benchmark via API
curl -X POST http://localhost:3500/api/performance/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "benchmark", "operation": "cache-read", "iterations": 100}'
```

### Performance Metrics API

```bash
# Get current performance metrics
curl http://localhost:3500/api/performance/metrics?timeRange=3600000
```

## Monitoring and Alerting

### Performance Dashboard

The system provides real-time performance metrics through:

- **API Endpoints**: `/api/performance/metrics` and `/api/performance/test`
- **System Metrics**: Memory usage, uptime, cache statistics
- **Query Performance**: Database query timing and frequency
- **API Performance**: Endpoint response times and error rates

### Automatic Alerts

The system automatically generates alerts for:

- Slow database queries (>5 seconds)
- Slow API responses (>3 seconds)
- High memory usage (>90%)
- Cache operation failures
- Background job failures

## Best Practices

### Caching Strategy

1. **Cache Frequently Accessed Data**: User permissions, translations, activity summaries
2. **Use Appropriate TTL**: Balance between data freshness and performance
3. **Implement Cache Invalidation**: Ensure data consistency with proper invalidation
4. **Monitor Cache Hit Rates**: Optimize caching strategy based on hit/miss ratios

### Database Optimization

1. **Use Proper Indexes**: Ensure all frequently queried fields are indexed
2. **Optimize Query Patterns**: Use efficient filtering and sorting
3. **Implement Pagination**: Always paginate large result sets
4. **Monitor Query Performance**: Track slow queries and optimize them

### Performance Monitoring

1. **Set Realistic Thresholds**: Configure alerts based on actual usage patterns
2. **Monitor Key Metrics**: Focus on user-impacting performance metrics
3. **Regular Performance Reviews**: Analyze performance trends and optimize accordingly
4. **Load Testing**: Regularly test system performance under expected load

## Troubleshooting

### Common Issues

1. **Redis Connection Failures**: System falls back to memory cache automatically
2. **Slow Queries**: Check database indexes and query optimization
3. **High Memory Usage**: Monitor cache size and implement cleanup strategies
4. **Cache Invalidation Issues**: Ensure proper cache key patterns and invalidation logic

### Performance Debugging

1. **Enable Performance Monitoring**: Set `ENABLE_PERFORMANCE_MONITORING=true`
2. **Check Performance Metrics**: Use `/api/performance/metrics` endpoint
3. **Run Performance Tests**: Execute test suite to identify bottlenecks
4. **Monitor Background Jobs**: Check job status and execution times

## Future Enhancements

### Planned Improvements

1. **Distributed Caching**: Support for Redis Cluster
2. **Advanced Monitoring**: Integration with external monitoring services
3. **Predictive Caching**: Machine learning-based cache preloading
4. **Query Optimization**: Automatic query plan analysis and optimization
5. **Real-time Dashboards**: Live performance monitoring dashboards

### Scalability Considerations

1. **Horizontal Scaling**: Support for multiple application instances
2. **Database Sharding**: Partition large tables for better performance
3. **CDN Integration**: Cache static assets and API responses
4. **Load Balancing**: Distribute load across multiple servers