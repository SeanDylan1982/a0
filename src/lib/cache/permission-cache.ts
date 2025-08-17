import { CacheManager } from './cache-manager'
import { UserRole } from '@prisma/client'

export interface CachedPermission {
  userId: string
  role: UserRole
  permissions: string[]
  dataAccess: Record<string, any>
  cachedAt: number
}

export class PermissionCache {
  private static readonly CACHE_PREFIX = 'permissions'
  private static readonly TTL = 1800 // 30 minutes
  private static readonly ROLE_PERMISSIONS_TTL = 3600 // 1 hour

  static async getUserPermissions(userId: string): Promise<CachedPermission | null> {
    return await CacheManager.get<CachedPermission>(
      `user:${userId}`,
      { prefix: this.CACHE_PREFIX, ttl: this.TTL }
    )
  }

  static async setUserPermissions(userId: string, permissions: CachedPermission): Promise<void> {
    await CacheManager.set(
      `user:${userId}`,
      { ...permissions, cachedAt: Date.now() },
      { prefix: this.CACHE_PREFIX, ttl: this.TTL }
    )
  }

  static async getRolePermissions(role: UserRole): Promise<string[] | null> {
    return await CacheManager.get<string[]>(
      `role:${role}`,
      { prefix: this.CACHE_PREFIX, ttl: this.ROLE_PERMISSIONS_TTL }
    )
  }

  static async setRolePermissions(role: UserRole, permissions: string[]): Promise<void> {
    await CacheManager.set(
      `role:${role}`,
      permissions,
      { prefix: this.CACHE_PREFIX, ttl: this.ROLE_PERMISSIONS_TTL }
    )
  }

  static async invalidateUserPermissions(userId: string): Promise<void> {
    await CacheManager.del(`user:${userId}`, { prefix: this.CACHE_PREFIX })
  }

  static async invalidateRolePermissions(role: UserRole): Promise<void> {
    await CacheManager.del(`role:${role}`, { prefix: this.CACHE_PREFIX })
    // Also invalidate all users with this role
    await CacheManager.invalidatePattern(`user:*`, { prefix: this.CACHE_PREFIX })
  }

  static async invalidateAllPermissions(): Promise<void> {
    await CacheManager.invalidatePattern('*', { prefix: this.CACHE_PREFIX })
  }

  static async warmupRolePermissions(roles: UserRole[]): Promise<void> {
    // This would be called during application startup
    // Implementation would fetch and cache all role permissions
    console.log('Warming up role permissions cache for roles:', roles)
  }
}