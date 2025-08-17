import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withActivityLogging, createCRUDActivityContext } from '@/lib/middleware/activity-middleware'
import { withPermission, PERMISSIONS, AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { logInventoryActivity } from '@/lib/utils/activity-utils'
import { ACTIVITY_ACTIONS, MODULES, ENTITY_TYPES } from '@/lib/utils/activity-utils'

const prisma = new PrismaClient()

// GET /api/products - List products with permission check
export const GET = withPermission(PERMISSIONS.INVENTORY_READ, async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
})

// POST /api/products - Create product with permission check and activity logging
export const POST = withPermission(PERMISSIONS.INVENTORY_CREATE, 
  withActivityLogging(
    async (request: AuthenticatedRequest) => {
      try {
        const body = await request.json()
        const userId = request.user?.id

        if (!userId) {
          return NextResponse.json(
            { error: 'User authentication required' },
            { status: 401 }
          )
        }

        // Validate required fields
        const { name, sku, price, cost, category } = body
        if (!name || !sku || price === undefined || cost === undefined || !category) {
          return NextResponse.json(
            { error: 'Missing required fields: name, sku, price, cost, category' },
            { status: 400 }
          )
        }

        // Check if SKU already exists
        const existingProduct = await prisma.product.findUnique({
          where: { sku },
        })

        if (existingProduct) {
          return NextResponse.json(
            { error: 'Product with this SKU already exists' },
            { status: 409 }
          )
        }

        // Create the product
        const product = await prisma.product.create({
          data: {
            name,
            sku,
            description: body.description || null,
            category,
            price: parseFloat(price),
            cost: parseFloat(cost),
            quantity: parseInt(body.quantity) || 0,
            minStock: parseInt(body.minStock) || 0,
            maxStock: parseInt(body.maxStock) || 1000,
            unit: body.unit || 'pcs',
            barcode: body.barcode || null,
            location: body.location || null,
            supplierId: body.supplierId || null,
            status: body.status || 'ACTIVE',
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        // Log the activity using the utility function
        await logInventoryActivity(
          userId,
          ACTIVITY_ACTIONS.CREATE,
          product.id,
          product.name,
          {
            sku: product.sku,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
          },
          request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          request.headers.get('user-agent') || undefined
        )

        return NextResponse.json(product, { status: 201 })
      } catch (error) {
        console.error('Error creating product:', error)
        return NextResponse.json(
          { error: 'Failed to create product' },
          { status: 500 }
        )
      }
    },
    // Custom activity context extractor
    (req: AuthenticatedRequest, response?: any) => {
      const userId = req.user?.id
      if (!userId || !response) return null

      return createCRUDActivityContext(
        userId,
        MODULES.INVENTORY,
        ENTITY_TYPES.PRODUCT,
        req.method,
        response
      )
    }
  )
)

// PUT /api/products - Update product with permission check and activity logging
export const PUT = withPermission(PERMISSIONS.INVENTORY_UPDATE,
  withActivityLogging(
    async (request: AuthenticatedRequest) => {
      try {
        const body = await request.json()
        const userId = request.user?.id

        if (!userId) {
          return NextResponse.json(
            { error: 'User authentication required' },
            { status: 401 }
          )
        }

        const { id, ...updateData } = body

        if (!id) {
          return NextResponse.json(
            { error: 'Product ID is required' },
            { status: 400 }
          )
        }

        // Get the existing product for comparison
        const existingProduct = await prisma.product.findUnique({
          where: { id },
        })

        if (!existingProduct) {
          return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
          )
        }

        // Check if SKU is being changed and if it conflicts
        if (updateData.sku && updateData.sku !== existingProduct.sku) {
          const skuExists = await prisma.product.findUnique({
            where: { sku: updateData.sku },
          })

          if (skuExists) {
            return NextResponse.json(
              { error: 'Product with this SKU already exists' },
              { status: 409 }
            )
          }
        }

        // Update the product
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: {
            ...updateData,
            price: updateData.price ? parseFloat(updateData.price) : undefined,
            cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
            quantity: updateData.quantity ? parseInt(updateData.quantity) : undefined,
            minStock: updateData.minStock ? parseInt(updateData.minStock) : undefined,
            maxStock: updateData.maxStock ? parseInt(updateData.maxStock) : undefined,
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        // Log the activity with change details
        const changes = Object.keys(updateData).reduce((acc, key) => {
          if (updateData[key] !== existingProduct[key as keyof typeof existingProduct]) {
            acc[key] = {
              from: existingProduct[key as keyof typeof existingProduct],
              to: updateData[key],
            }
          }
          return acc
        }, {} as Record<string, any>)

        await logInventoryActivity(
          userId,
          ACTIVITY_ACTIONS.UPDATE,
          updatedProduct.id,
          updatedProduct.name,
          {
            changes,
            changedFields: Object.keys(changes),
          },
          request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          request.headers.get('user-agent') || undefined
        )

        return NextResponse.json(updatedProduct)
      } catch (error) {
        console.error('Error updating product:', error)
        return NextResponse.json(
          { error: 'Failed to update product' },
          { status: 500 }
        )
      }
    },
    // Custom activity context extractor
    (req: AuthenticatedRequest, response?: any) => {
      const userId = req.user?.id
      if (!userId || !response) return null

      return createCRUDActivityContext(
        userId,
        MODULES.INVENTORY,
        ENTITY_TYPES.PRODUCT,
        req.method,
        response
      )
    }
  )
)