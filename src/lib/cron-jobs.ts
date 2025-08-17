import { InventoryAlertManager } from './inventory-alerts'

export class CronJobManager {
  private static intervals: NodeJS.Timeout[] = []

  static startInventoryMonitoring() {
    // Check stock levels every 5 minutes
    const inventoryCheck = setInterval(async () => {
      try {
        await InventoryAlertManager.checkStockLevels()
      } catch (error) {
        console.error('Inventory monitoring error:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    this.intervals.push(inventoryCheck)
    console.log('Inventory monitoring started - checking every 5 minutes')
  }

  static stopAllJobs() {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    console.log('All cron jobs stopped')
  }
}