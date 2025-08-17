#!/usr/bin/env tsx

/**
 * Migration script to update existing API routes to use the new middleware system
 * 
 * Usage: npx tsx scripts/migrate-api-routes.ts [--dry-run] [--route=path]
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface RouteConfig {
  path: string
  middlewareType: string
  hasAuth: boolean
  hasActivity: boolean
  hasSync: boolean
  customConfig?: string
}

const ROUTE_CONFIGS: RouteConfig[] = [
  {
    path: 'src/app/api/customers/route.ts',
    middlewareType: 'customers',
    hasAuth: true,
    hasActivity: true,
    hasSync: true,
    customConfig: `{
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.newCustomer]
  }
}`
  },
  {
    path: 'src/app/api/inventory/products/route.ts',
    middlewareType: 'inventory',
    hasAuth: true,
    hasActivity: true,
    hasSync: true,
    customConfig: `{
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.lowStock]
  }
}`
  },
  {
    path: 'src/app/api/sales/route.ts',
    middlewareType: 'sales',
    hasAuth: true,
    hasActivity: true,
    hasSync: true,
    customConfig: `{
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.largeTransaction(10000)]
  }
}`
  },
  {
    path: 'src/app/api/invoicing/invoices/route.ts',
    middlewareType: 'sales',
    hasAuth: true,
    hasActivity: true,
    hasSync: true
  },
  {
    path: 'src/app/api/users/route.ts',
    middlewareType: 'admin',
    hasAuth: true,
    hasActivity: true,
    hasSync: true
  },
  {
    path: 'src/app/api/settings/*/route.ts',
    middlewareType: 'settings',
    hasAuth: true,
    hasActivity: true,
    hasSync: true
  },
  {
    path: 'src/app/api/auth/*/route.ts',
    middlewareType: 'public',
    hasAuth: false,
    hasActivity: false,
    hasSync: false
  },
  {
    path: 'src/app/api/health/route.ts',
    middlewareType: 'public',
    hasAuth: false,
    hasActivity: false,
    hasSync: false
  }
]

async function findApiRoutes(): Promise<string[]> {
  const routes = await glob('src/app/api/**/route.ts', { 
    ignore: ['**/node_modules/**'] 
  })
  return routes
}

async function readRouteFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return ''
  }
}

async function writeRouteFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`✅ Updated ${filePath}`)
  } catch (error) {
    console.error(`❌ Error writing ${filePath}:`, error)
  }
}

function getRouteConfig(filePath: string): RouteConfig | null {
  for (const config of ROUTE_CONFIGS) {
    if (config.path.includes('*')) {
      const pattern = config.path.replace(/\*/g, '.*')
      const regex = new RegExp(pattern)
      if (regex.test(filePath)) {
        return config
      }
    } else if (filePath === config.path) {
      return config
    }
  }
  
  // Default config for unmatched routes
  return {
    path: filePath,
    middlewareType: 'authenticated',
    hasAuth: true,
    hasActivity: true,
    hasSync: true
  }
}

function generateMigratedContent(originalContent: string, config: RouteConfig): string {
  const lines = originalContent.split('\n')
  const imports = []
  const handlers = []
  const exports = []
  
  // Check if already migrated
  if (originalContent.includes('quickMigrate') || originalContent.includes('withApiMiddleware')) {
    console.log(`⚠️  ${config.path} appears to already be migrated`)
    return originalContent
  }
  
  // Extract existing imports
  let importSection = true
  let handlerSection = false
  let currentHandler = ''
  let currentHandlerName = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (importSection && (line.startsWith('import ') || line.trim() === '')) {
      if (line.startsWith('import ')) {
        imports.push(line)
      }
    } else {
      importSection = false
    }
    
    // Detect handler functions
    if (line.match(/^export async function (GET|POST|PUT|DELETE|PATCH)/)) {
      if (currentHandler) {
        handlers.push({ name: currentHandlerName, content: currentHandler })
      }
      currentHandlerName = line.match(/^export async function (\w+)/)?.[1] || ''
      currentHandler = line.replace('export async function', 'async function handle')
      handlerSection = true
    } else if (handlerSection) {
      currentHandler += '\n' + line
      
      // Check if handler is complete (simple heuristic)
      if (line === '}' && currentHandler.split('{').length === currentHandler.split('}').length) {
        handlers.push({ name: currentHandlerName, content: currentHandler })
        currentHandler = ''
        currentHandlerName = ''
        handlerSection = false
      }
    }
  }
  
  // Add final handler if exists
  if (currentHandler) {
    handlers.push({ name: currentHandlerName, content: currentHandler })
  }
  
  // Generate new imports
  const newImports = [
    ...imports.filter(imp => 
      !imp.includes('getServerSession') && 
      !imp.includes('authOptions') &&
      !imp.includes('triggerSync') &&
      !imp.includes('extractUserIdFromRequest')
    ),
    "import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'",
    "import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'"
  ]
  
  // Generate handler functions
  const handlerFunctions = handlers.map(handler => {
    let content = handler.content
    
    // Update function signature to use AuthenticatedRequest
    content = content.replace(
      /async function handle(\w+)\(request: NextRequest\)/,
      'async function handle$1(request: AuthenticatedRequest)'
    )
    
    // Remove manual auth checks since middleware handles it
    content = content.replace(/const userId = extractUserIdFromRequest\(request\)[\s\S]*?}/g, '')
    content = content.replace(/if \(!userId\) \{[\s\S]*?}/g, '')
    
    // Remove manual sync triggers since middleware handles it
    content = content.replace(/try \{[\s\S]*?triggerSync[\s\S]*?} catch[\s\S]*?}/g, '')
    
    // Replace error handling with throws (let middleware handle)
    content = content.replace(
      /return NextResponse\.json\(\s*\{\s*error:.*?\},\s*\{\s*status:\s*\d+\s*\}\s*\)/g,
      'throw error // Let middleware handle error translation'
    )
    
    // Update user ID references to use authenticated request
    content = content.replace(/userId/g, "request.user?.id || 'system'")
    
    return content
  })
  
  // Generate export section
  const handlerNames = handlers.map(h => h.name)
  const customConfig = config.customConfig ? `, ${config.customConfig}` : ''
  
  const exportSection = `
// Apply middleware to handlers
const { ${handlerNames.join(', ')} } = quickMigrate('${config.middlewareType}', {
  ${handlerNames.map(name => `${name}: handle${name}`).join(',\n  ')}
}${customConfig})

export { ${handlerNames.join(', ')} }`
  
  // Combine all sections
  return [
    ...newImports,
    '',
    ...handlerFunctions,
    exportSection
  ].join('\n')
}

async function migrateRoute(filePath: string, dryRun: boolean = false): Promise<void> {
  const config = getRouteConfig(filePath)
  if (!config) {
    console.log(`⚠️  No configuration found for ${filePath}, skipping`)
    return
  }
  
  console.log(`🔄 Processing ${filePath}...`)
  
  const originalContent = await readRouteFile(filePath)
  if (!originalContent) {
    console.log(`⚠️  Could not read ${filePath}, skipping`)
    return
  }
  
  const migratedContent = generateMigratedContent(originalContent, config)
  
  if (dryRun) {
    console.log(`📝 Dry run - would update ${filePath}`)
    console.log('--- Original ---')
    console.log(originalContent.substring(0, 200) + '...')
    console.log('--- Migrated ---')
    console.log(migratedContent.substring(0, 200) + '...')
    console.log('')
  } else {
    if (migratedContent !== originalContent) {
      await writeRouteFile(filePath, migratedContent)
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`)
    }
  }
}

async function generateDocumentation(): Promise<void> {
  const docContent = [
    '# API Route Middleware Documentation',
    '',
    'This document describes the middleware applied to each API route.',
    '',
    '## Route Configurations',
    ''
  ]
  
  const routes = await findApiRoutes()
  
  for (const route of routes) {
    const config = getRouteConfig(route)
    if (config) {
      docContent.push(`### ${route}`)
      docContent.push(`- **Middleware Type**: ${config.middlewareType}`)
      docContent.push(`- **Authentication**: ${config.hasAuth ? 'Required' : 'Not required'}`)
      docContent.push(`- **Activity Logging**: ${config.hasActivity ? 'Enabled' : 'Disabled'}`)
      docContent.push(`- **Data Sync**: ${config.hasSync ? 'Enabled' : 'Disabled'}`)
      
      if (config.customConfig) {
        docContent.push(`- **Custom Configuration**: Yes`)
      }
      
      docContent.push('')
    }
  }
  
  await fs.writeFile('docs/API_MIDDLEWARE.md', docContent.join('\n'))
  console.log('📚 Generated documentation at docs/API_MIDDLEWARE.md')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const specificRoute = args.find(arg => arg.startsWith('--route='))?.split('=')[1]
  const generateDocs = args.includes('--docs')
  
  console.log('🚀 API Route Migration Tool')
  console.log('============================')
  
  if (generateDocs) {
    await generateDocumentation()
    return
  }
  
  if (dryRun) {
    console.log('🔍 Running in dry-run mode (no files will be modified)')
  }
  
  const routes = await findApiRoutes()
  console.log(`📁 Found ${routes.length} API routes`)
  
  const routesToProcess = specificRoute 
    ? routes.filter(route => route.includes(specificRoute))
    : routes
  
  if (routesToProcess.length === 0) {
    console.log('❌ No routes found to process')
    return
  }
  
  console.log(`🔄 Processing ${routesToProcess.length} routes...`)
  console.log('')
  
  for (const route of routesToProcess) {
    await migrateRoute(route, dryRun)
  }
  
  console.log('')
  console.log('✅ Migration complete!')
  
  if (!dryRun) {
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Review the migrated files')
    console.log('2. Run tests to ensure everything works')
    console.log('3. Update any custom logic as needed')
    console.log('4. Generate documentation with --docs flag')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { migrateRoute, generateDocumentation }