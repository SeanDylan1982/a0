import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { PrismaClient, UserRole, NotificationType } from '@prisma/client';
import { dataSyncManager } from '@/lib/services/data-sync-manager';

const prisma = new PrismaClient();

// Setup data sync event listeners
function setupDataSyncEvents(io: Server) {
  // Listen for sync events from the data sync manager
  dataSyncManager.on('sync_completed', (data) => {
    io.to('management').emit('sync_completed', {
      rule: data.rule.id,
      sourceModule: data.event.sourceModule,
      targetModules: data.rule.targetModules,
      entityId: data.event.entityId,
      timestamp: new Date().toISOString()
    });
  });

  dataSyncManager.on('sync_error', (data) => {
    io.to('directors').emit('sync_error', {
      rule: data.rule.id,
      sourceModule: data.event.sourceModule,
      targetModules: data.rule.targetModules,
      entityId: data.event.entityId,
      error: data.error.message,
      timestamp: new Date().toISOString()
    });
  });

  dataSyncManager.on('queue_processing_started', () => {
    io.to('management').emit('queue_processing_started', {
      timestamp: new Date().toISOString()
    });
  });

  dataSyncManager.on('queue_processing_completed', () => {
    io.to('management').emit('queue_processing_completed', {
      timestamp: new Date().toISOString()
    });
  });

  dataSyncManager.on('conflict_resolved', (data) => {
    io.to('management').emit('conflict_resolved', {
      conflictId: data.conflictId,
      resolution: data.resolution,
      resolvedBy: data.userId,
      timestamp: new Date().toISOString()
    });
  });

  dataSyncManager.on('product_availability_updated', (data) => {
    io.to('inventory').emit('product_availability_updated', {
      productId: data.productId,
      availableQuantity: data.availableQuantity,
      lastUpdated: data.lastUpdated
    });
  });
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  userEmail?: string;
}

interface SocketUser {
  userId: string;
  role: UserRole;
  email: string;
  socketId: string;
}

// Store authenticated users
const authenticatedUsers = new Map<string, SocketUser>();

// Role-based channel mapping
const ROLE_CHANNELS = {
  [UserRole.DIRECTOR]: ['directors', 'management', 'all'],
  [UserRole.MANAGER]: ['management', 'all'],
  [UserRole.HOD]: ['hod', 'all'],
  [UserRole.SALES_REP]: ['sales', 'all'],
  [UserRole.INTERNAL_CONSULTANT]: ['sales', 'all'],
  [UserRole.INVENTORY_MANAGER]: ['inventory', 'management', 'all'],
  [UserRole.HR_STAFF]: ['hr', 'all'],
  [UserRole.ACCOUNTANT]: ['accounting', 'all'],
  [UserRole.STAFF_MEMBER]: ['all'],
  [UserRole.USER]: ['all']
};

// Notification type to channel mapping
const NOTIFICATION_CHANNELS = {
  [NotificationType.ACTIVITY]: 'activity',
  [NotificationType.INVENTORY_ALERT]: 'inventory',
  [NotificationType.CALENDAR_REMINDER]: 'calendar',
  [NotificationType.MESSAGE]: 'messages',
  [NotificationType.NOTICE_BOARD]: 'notices',
  [NotificationType.SYSTEM]: 'system'
};

export const setupSocket = (io: Server) => {
  // Set up data sync manager event listeners
  setupDataSyncEvents(io);

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
      
      // Get user details from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub || decoded.userId },
        select: { id: true, email: true, role: true, name: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userEmail = user.email;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.userId || !socket.userRole || !socket.userEmail) {
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${socket.userEmail} (${socket.userRole}) - Socket: ${socket.id}`);

    // Store authenticated user
    authenticatedUsers.set(socket.id, {
      userId: socket.userId,
      role: socket.userRole,
      email: socket.userEmail,
      socketId: socket.id
    });

    // Join role-based channels
    const userChannels = ROLE_CHANNELS[socket.userRole] || ['all'];
    userChannels.forEach(channel => {
      socket.join(channel);
      console.log(`User ${socket.userEmail} joined channel: ${channel}`);
    });

    // Join user-specific channel
    socket.join(`user:${socket.userId}`);

    // Join notification type channels
    Object.values(NOTIFICATION_CHANNELS).forEach(channel => {
      socket.join(`notifications:${channel}`);
    });

    // Handle activity subscription
    socket.on('subscribe:activities', (data: { modules?: string[] }) => {
      const modules = data.modules || [];
      modules.forEach(module => {
        socket.join(`activities:${module}`);
      });
      
      socket.emit('subscribed:activities', { 
        modules,
        message: 'Subscribed to activity updates' 
      });
    });

    // Handle notification subscription
    socket.on('subscribe:notifications', (data: { types?: NotificationType[] }) => {
      const types = data.types || Object.values(NotificationType);
      types.forEach(type => {
        const channel = NOTIFICATION_CHANNELS[type];
        if (channel) {
          socket.join(`notifications:${channel}`);
        }
      });
      
      socket.emit('subscribed:notifications', { 
        types,
        message: 'Subscribed to notification updates' 
      });
    });

    // Handle inventory alerts subscription
    socket.on('subscribe:inventory', (data: { productIds?: string[] }) => {
      const productIds = data.productIds || [];
      
      // Subscribe to general inventory alerts
      socket.join('inventory:alerts');
      
      // Subscribe to specific product alerts
      productIds.forEach(productId => {
        socket.join(`inventory:product:${productId}`);
      });
      
      socket.emit('subscribed:inventory', { 
        productIds,
        message: 'Subscribed to inventory updates' 
      });
    });

    // Handle notification read status updates
    socket.on('notification:read', async (data: { notificationId: string }) => {
      try {
        // Update notification read status in database
        await prisma.notification.updateMany({
          where: {
            id: data.notificationId,
            userId: socket.userId
          },
          data: { read: true }
        });

        // Broadcast read status to user's other sessions
        socket.to(`user:${socket.userId}`).emit('notification:read', {
          notificationId: data.notificationId
        });

        socket.emit('notification:read:success', {
          notificationId: data.notificationId
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('notification:read:error', {
          notificationId: data.notificationId,
          error: 'Failed to mark notification as read'
        });
      }
    });

    // Handle bulk notification read
    socket.on('notifications:mark-all-read', async (data: { type?: NotificationType }) => {
      try {
        const whereClause: any = {
          userId: socket.userId,
          read: false
        };

        if (data.type) {
          whereClause.type = data.type;
        }

        const result = await prisma.notification.updateMany({
          where: whereClause,
          data: { read: true }
        });

        // Broadcast to user's other sessions
        socket.to(`user:${socket.userId}`).emit('notifications:marked-all-read', {
          type: data.type,
          count: result.count
        });

        socket.emit('notifications:mark-all-read:success', {
          type: data.type,
          count: result.count
        });
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        socket.emit('notifications:mark-all-read:error', {
          error: 'Failed to mark notifications as read'
        });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userEmail} - Reason: ${reason}`);
      authenticatedUsers.delete(socket.id);
    });

    // Send welcome message with user info
    socket.emit('connected', {
      message: 'Connected to Account Zero real-time server',
      userId: socket.userId,
      role: socket.userRole,
      channels: userChannels,
      timestamp: new Date().toISOString()
    });
  });
};

// Export functions for broadcasting events from other parts of the application
export class SocketBroadcaster {
  private static io: Server;

  static setIO(io: Server) {
    this.io = io;
  }

  /**
   * Broadcast activity update to relevant users
   */
  static broadcastActivity(activity: {
    id: string;
    userId: string;
    module: string;
    action: string;
    entityType: string;
    entityName: string;
    timestamp: Date;
    user: { name?: string; email: string; role: UserRole };
  }) {
    if (!this.io) return;

    // Broadcast to module-specific channel
    this.io.to(`activities:${activity.module}`).emit('activity:new', activity);

    // Broadcast to role-based channels based on activity importance
    if (['inventory', 'sales', 'accounting'].includes(activity.module)) {
      this.io.to('management').emit('activity:new', activity);
    }

    // Broadcast critical activities to directors
    if (['delete', 'approve', 'reject'].includes(activity.action)) {
      this.io.to('directors').emit('activity:critical', activity);
    }
  }

  /**
   * Broadcast notification to specific user
   */
  static broadcastNotification(notification: {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: string;
    data?: any;
    createdAt: Date;
  }) {
    if (!this.io) return;

    // Send to specific user
    this.io.to(`user:${notification.userId}`).emit('notification:new', notification);

    // Send to notification type channel
    const channel = NOTIFICATION_CHANNELS[notification.type];
    if (channel) {
      this.io.to(`notifications:${channel}`).emit('notification:broadcast', {
        ...notification,
        userId: undefined // Don't expose userId in broadcast
      });
    }
  }

  /**
   * Broadcast inventory alert to relevant users
   */
  static broadcastInventoryAlert(alert: {
    productId: string;
    productName: string;
    currentStock: number;
    minimumStock: number;
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';
    timestamp: Date;
  }) {
    if (!this.io) return;

    // Broadcast to inventory managers and management
    this.io.to('inventory').emit('inventory:alert', alert);
    this.io.to('management').emit('inventory:alert', alert);

    // Broadcast to specific product subscribers
    this.io.to(`inventory:product:${alert.productId}`).emit('inventory:product:alert', alert);

    // Critical alerts go to directors
    if (alert.alertType === 'CRITICAL') {
      this.io.to('directors').emit('inventory:critical', alert);
    }
  }

  /**
   * Broadcast stock movement to relevant users
   */
  static broadcastStockMovement(movement: {
    id: string;
    productId: string;
    productName: string;
    type: string;
    quantity: number;
    beforeQty: number;
    afterQty: number;
    reason: string;
    userId: string;
    timestamp: Date;
  }) {
    if (!this.io) return;

    // Broadcast to inventory channel
    this.io.to('inventory').emit('inventory:movement', movement);

    // Broadcast to specific product subscribers
    this.io.to(`inventory:product:${movement.productId}`).emit('inventory:product:movement', movement);

    // Large movements go to management
    if (movement.quantity > 100) { // Configurable threshold
      this.io.to('management').emit('inventory:large-movement', movement);
    }
  }

  /**
   * Broadcast system-wide message
   */
  static broadcastSystemMessage(message: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    data?: any;
  }) {
    if (!this.io) return;

    this.io.to('all').emit('system:message', {
      ...message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected users count by role
   */
  static getConnectedUsersStats(): Record<UserRole, number> {
    const stats = {} as Record<UserRole, number>;
    
    // Initialize all roles with 0
    Object.values(UserRole).forEach(role => {
      stats[role] = 0;
    });

    // Count connected users by role
    authenticatedUsers.forEach(user => {
      stats[user.role]++;
    });

    return stats;
  }

  /**
   * Send notification count update to user
   */
  static sendNotificationCountUpdate(userId: string, counts: Record<NotificationType, number>) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification:counts', counts);
  }

  /**
   * Broadcast notification count update for specific type
   */
  static broadcastNotificationCountUpdate(userId: string, type: NotificationType, count: number) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification:count-update', {
      type,
      count,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast data sync status update
   */
  static broadcastSyncStatus(status: {
    entityId: string;
    entityType: string;
    status: 'pending' | 'syncing' | 'completed' | 'failed';
    affectedModules: string[];
    errorMessage?: string;
  }) {
    if (!this.io) return;

    // Broadcast to management for monitoring
    this.io.to('management').emit('sync:status', status);

    // Broadcast to affected modules
    status.affectedModules.forEach(module => {
      this.io.to(module).emit('sync:module:status', {
        entityId: status.entityId,
        entityType: status.entityType,
        status: status.status,
        module,
        errorMessage: status.errorMessage
      });
    });
  }

  /**
   * Broadcast cross-module data update
   */
  static broadcastCrossModuleUpdate(update: {
    sourceModule: string;
    targetModule: string;
    entityType: string;
    entityId: string;
    action: string;
    data: any;
  }) {
    if (!this.io) return;

    // Broadcast to target module
    this.io.to(update.targetModule).emit('cross-module:update', {
      sourceModule: update.sourceModule,
      entityType: update.entityType,
      entityId: update.entityId,
      action: update.action,
      data: update.data,
      timestamp: new Date().toISOString()
    });

    // Broadcast to management for visibility
    this.io.to('management').emit('cross-module:activity', {
      sourceModule: update.sourceModule,
      targetModule: update.targetModule,
      entityType: update.entityType,
      entityId: update.entityId,
      action: update.action
    });
  }
}