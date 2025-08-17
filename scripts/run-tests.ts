#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  type: string
  passed: boolean
  duration: number
  coverage?: number
  errors?: string[]
}

interface TestSuite {
  name: string
  command: string
  required: boolean
  timeout: number
}

const testSuites: TestSuite[] = [
  {
    name: 'Type Check',
    command: 'npm run type-check',
    required: true,
    timeout: 30000,
  },
  {
    name: 'Linting',
    command: 'npm run lint',
    required: true,
    timeout: 30000,
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    required: true,
    timeout: 60000,
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    required: true,
    timeout: 120000,
  },
  {
    name: 'Security Tests',
    command: 'npm run test:security',
    required: true,
    timeout: 60000,
  },
  {
    name: 'Load Tests',
    command: 'npm run test:load',
    required: false,
    timeout: 300000,
  },
  {
    name: 'E2E Tests',
    command: 'npm run test:e2e',
    required: false,
    timeout: 180000,
  },
]

class TestRunner {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n')

    // Ensure test directories exist
    this.ensureTestDirectories()

    // Run each test suite
    for (const suite of testSuites) {
      await this.runTestSuite(suite)
    }

    // Generate reports
    this.generateSummaryReport()
    this.generateJSONReport()

    // Exit with appropriate code
    const hasFailures = this.results.some(r => !r.passed && testSuites.find(s => s.name === r.type)?.required)
    process.exit(hasFailures ? 1 : 0)
  }

  private ensureTestDirectories(): void {
    const directories = [
      'src/lib/services/__tests__',
      'src/test/e2e',
      'src/test/security',
      'src/test/load',
      'coverage',
      'test-reports',
    ]

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    })
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`🧪 Running ${suite.name}...`)
    const startTime = Date.now()

    try {
      const output = execSync(suite.command, {
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: 'pipe',
      })

      const duration = Date.now() - startTime
      const coverage = this.extractCoverage(output)

      this.results.push({
        type: suite.name,
        passed: true,
        duration,
        coverage,
      })

      console.log(`✅ ${suite.name} passed (${duration}ms)`)
      if (coverage) {
        console.log(`📊 Coverage: ${coverage}%`)
      }
      console.log()

    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error.stdout || error.stderr || error.message

      this.results.push({
        type: suite.name,
        passed: false,
        duration,
        errors: [errorMessage],
      })

      if (suite.required) {
        console.log(`❌ ${suite.name} failed (${duration}ms)`)
        console.log(`Error: ${errorMessage}\n`)
      } else {
        console.log(`⚠️  ${suite.name} failed (optional) (${duration}ms)`)
        console.log(`Error: ${errorMessage}\n`)
      }
    }
  }

  private extractCoverage(output: string): number | undefined {
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  private generateSummaryReport(): void {
    const totalDuration = Date.now() - this.startTime
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const requiredFailed = this.results.filter(r => 
      !r.passed && testSuites.find(s => s.name === r.type)?.required
    ).length

    console.log('📋 Test Summary Report')
    console.log('='.repeat(50))
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Tests Passed: ${passed}`)
    console.log(`Tests Failed: ${failed}`)
    console.log(`Required Failed: ${requiredFailed}`)
    console.log()

    // Detailed results
    this.results.forEach(result => {
      const suite = testSuites.find(s => s.name === result.type)
      const status = result.passed ? '✅' : (suite?.required ? '❌' : '⚠️')
      const required = suite?.required ? '(Required)' : '(Optional)'
      
      console.log(`${status} ${result.type} ${required}`)
      console.log(`   Duration: ${result.duration}ms`)
      
      if (result.coverage) {
        console.log(`   Coverage: ${result.coverage}%`)
      }
      
      if (result.errors) {
        console.log(`   Errors: ${result.errors.length}`)
      }
      console.log()
    })

    // Overall status
    if (requiredFailed === 0) {
      console.log('🎉 All required tests passed!')
    } else {
      console.log(`💥 ${requiredFailed} required test(s) failed!`)
    }

    if (failed > requiredFailed) {
      console.log(`⚠️  ${failed - requiredFailed} optional test(s) failed`)
    }
  }

  private generateJSONReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        requiredFailed: this.results.filter(r => 
          !r.passed && testSuites.find(s => s.name === r.type)?.required
        ).length,
      },
      results: this.results.map(result => ({
        ...result,
        required: testSuites.find(s => s.name === result.type)?.required || false,
      })),
    }

    const reportPath = join('test-reports', 'test-results.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 JSON report saved to: ${reportPath}`)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const runOptional = args.includes('--include-optional')
const runOnly = args.find(arg => arg.startsWith('--only='))?.split('=')[1]

async function main() {
  const runner = new TestRunner()

  if (runOnly) {
    const suite = testSuites.find(s => s.name.toLowerCase().includes(runOnly.toLowerCase()))
    if (suite) {
      console.log(`🎯 Running only: ${suite.name}`)
      await runner.runTestSuite(suite)
    } else {
      console.error(`❌ Test suite not found: ${runOnly}`)
      process.exit(1)
    }
  } else {
    // Filter test suites based on options
    const suitesToRun = runOptional 
      ? testSuites 
      : testSuites.filter(s => s.required)

    for (const suite of suitesToRun) {
      await runner.runTestSuite(suite)
    }

    runner.generateSummaryReport()
    runner.generateJSONReport()
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export { TestRunner }