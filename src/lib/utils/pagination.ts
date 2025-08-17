export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PrismaSkipTake {
  skip: number
  take: number
}

export class PaginationHelper {
  static readonly DEFAULT_LIMIT = 20
  static readonly MAX_LIMIT = 100

  static validateParams(params: PaginationParams): Required<Pick<PaginationParams, 'page' | 'limit'>> & Omit<PaginationParams, 'page' | 'limit'> {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, params.limit || this.DEFAULT_LIMIT))

    return {
      page,
      limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder || 'desc',
      search: params.search
    }
  }

  static getSkipTake(page: number, limit: number): PrismaSkipTake {
    return {
      skip: (page - 1) * limit,
      take: limit
    }
  }

  static buildResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  static buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Record<string, 'asc' | 'desc'> | undefined {
    if (!sortBy) return undefined

    return {
      [sortBy]: sortOrder
    }
  }

  static buildSearchFilter(search?: string, searchFields: string[] = []): any {
    if (!search || searchFields.length === 0) return {}

    return {
      OR: searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive'
        }
      }))
    }
  }
}

// Specialized pagination for different entities
export class ActivityLogPagination {
  static buildFilters(params: PaginationParams & {
    userId?: string
    module?: string
    entityType?: string
    dateFrom?: Date
    dateTo?: Date
  }) {
    const filters: any = {}

    if (params.userId) {
      filters.userId = params.userId
    }

    if (params.module) {
      filters.module = params.module
    }

    if (params.entityType) {
      filters.entityType = params.entityType
    }

    if (params.dateFrom || params.dateTo) {
      filters.timestamp = {}
      if (params.dateFrom) {
        filters.timestamp.gte = params.dateFrom
      }
      if (params.dateTo) {
        filters.timestamp.lte = params.dateTo
      }
    }

    // Add search filter
    if (params.search) {
      filters.OR = [
        { entityName: { contains: params.search, mode: 'insensitive' } },
        { action: { contains: params.search, mode: 'insensitive' } },
        { module: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    return filters
  }
}

export class NotificationPagination {
  static buildFilters(params: PaginationParams & {
    userId?: string
    type?: string
    read?: boolean
    priority?: string
  }) {
    const filters: any = {}

    if (params.userId) {
      filters.userId = params.userId
    }

    if (params.type) {
      filters.type = params.type
    }

    if (typeof params.read === 'boolean') {
      filters.read = params.read
    }

    if (params.priority) {
      filters.priority = params.priority
    }

    // Add search filter
    if (params.search) {
      filters.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { message: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    return filters
  }
}

export class StockMovementPagination {
  static buildFilters(params: PaginationParams & {
    productId?: string
    userId?: string
    type?: string
    dateFrom?: Date
    dateTo?: Date
  }) {
    const filters: any = {}

    if (params.productId) {
      filters.productId = params.productId
    }

    if (params.userId) {
      filters.userId = params.userId
    }

    if (params.type) {
      filters.type = params.type
    }

    if (params.dateFrom || params.dateTo) {
      filters.timestamp = {}
      if (params.dateFrom) {
        filters.timestamp.gte = params.dateFrom
      }
      if (params.dateTo) {
        filters.timestamp.lte = params.dateTo
      }
    }

    // Add search filter
    if (params.search) {
      filters.OR = [
        { reason: { contains: params.search, mode: 'insensitive' } },
        { reference: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    return filters
  }
}