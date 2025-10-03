# Supabase Local Memory Optimization Guide

## Problem
Supabase local development environment can consume significant system resources:
- **25GB+** Docker images (before optimization)
- **5.5GB+** RAM usage with growing memory consumption
- **12 containers** running simultaneously

## Solution Overview

### 1. Immediate Cleanup
```bash
# Clean up unused Docker resources
docker system prune -a --volumes -f

# Monitor current usage
yarn supabase:monitor
```

### 2. Configuration Optimizations

#### Reduced Connection Limits
```toml
# supabase/config.toml
[db.pooler]
default_pool_size = 10    # Reduced from 20
max_client_conn = 50      # Reduced from 100

[api]
max_rows = 500           # Reduced from 1000
```

### 3. Memory Management Scripts

#### Monitor Memory Usage
```bash
yarn supabase:monitor
```
- Checks Supabase container memory usage
- Alerts when usage exceeds thresholds
- Shows current Docker system stats

#### Optimize Memory
```bash
yarn supabase:optimize
```
- Cleans up Docker resources
- Restarts containers to free memory
- Optimizes database with VACUUM ANALYZE

### 4. Regular Maintenance

#### Daily
```bash
yarn supabase:monitor
```

#### Weekly
```bash
yarn supabase:optimize
docker system prune -f
```

#### When Memory Issues Occur
```bash
# 1. Stop Supabase
yarn supabase stop

# 2. Clean everything
docker system prune -a --volumes -f

# 3. Restart
yarn supabase start

# 4. Monitor
yarn supabase:monitor
```

## Memory Usage Breakdown

### Container Memory Usage (Typical)
- **PostgreSQL**: ~800MB (largest consumer)
- **GoTrue (Auth)**: ~340MB
- **Storage API**: ~300MB
- **Realtime**: ~190MB
- **PostgREST**: ~190MB
- **Studio**: ~150MB
- **Other services**: ~200MB total

### Optimization Results
- **Before**: 25.25GB Docker images
- **After**: 9.5GB Docker images
- **Savings**: ~15GB disk space

## Advanced Optimizations

### Database Configuration
```sql
-- Run in Supabase Studio SQL editor
-- Optimize PostgreSQL settings for development
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

### Container Resource Limits
Create `docker-compose.override.yml` in supabase directory:
```yaml
version: '3.8'
services:
  db:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
  auth:
    deploy:
      resources:
        limits:
          memory: 512M
  storage:
    deploy:
      resources:
        limits:
          memory: 512M
```

## Troubleshooting

### High Memory Usage
1. Check for long-running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   ```

2. Kill problematic queries:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE pid = <problematic_pid>;
   ```

### Container Restart Issues
```bash
# Check container logs
docker logs supabase_db_sololevel
docker logs supabase_auth_sololevel

# Restart specific service
docker restart supabase_db_sololevel
```

## Best Practices

1. **Regular Monitoring**: Run `yarn supabase:monitor` daily
2. **Weekly Cleanup**: Run `yarn supabase:optimize` weekly
3. **Development Workflow**: Stop Supabase when not actively developing
4. **Resource Limits**: Consider setting Docker Desktop memory limits
5. **Database Maintenance**: Regular VACUUM and ANALYZE operations

## Docker Desktop Settings

### Recommended Settings
- **Memory**: 8GB (if available)
- **Swap**: 2GB
- **Disk image size**: 60GB
- **Enable**: Use Rosetta for x86/amd64 emulation (Apple Silicon)

### Resource Monitoring
- Enable Docker Desktop's resource usage dashboard
- Set up alerts for high memory usage
- Monitor disk space regularly

## Scripts Reference

### Available Commands
```bash
# Memory management
yarn supabase:monitor    # Check current usage
yarn supabase:optimize   # Clean up and optimize

# Manual cleanup
docker system prune -f                    # Remove unused resources
docker system prune -a --volumes -f      # Remove everything unused
docker container prune -f                # Remove stopped containers
docker image prune -f                    # Remove unused images
docker volume prune -f                   # Remove unused volumes
```

### Monitoring Output
```
[MEMORY-MONITOR] Memory usage is healthy (Total: 33.1%, Avg: 2.8%)
Current Docker stats:
bc56cdee5263    49.11MiB / 7.654GiB    0.63%
6446ba6ef4e6    306.2MiB / 7.654GiB    3.91%
...
```

## Performance Impact

### Before Optimization
- **Startup time**: 2-3 minutes
- **Memory usage**: 5.5GB+ (growing)
- **Disk usage**: 25GB+

### After Optimization
- **Startup time**: 1-2 minutes
- **Memory usage**: 2-3GB (stable)
- **Disk usage**: 9.5GB

## Conclusion

Regular maintenance and proper configuration can significantly reduce Supabase local development resource usage. The provided scripts automate most optimization tasks, making it easy to maintain a healthy development environment.

