import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialTranslations = [
  // Common UI elements
  {
    key: 'common.save',
    translations: {
      en: 'Save',
      af: 'Stoor',
      zu: 'Gcina'
    }
  },
  {
    key: 'common.cancel',
    translations: {
      en: 'Cancel',
      af: 'Kanselleer',
      zu: 'Khansela'
    }
  },
  {
    key: 'common.delete',
    translations: {
      en: 'Delete',
      af: 'Verwyder',
      zu: 'Susa'
    }
  },
  {
    key: 'common.edit',
    translations: {
      en: 'Edit',
      af: 'Wysig',
      zu: 'Hlela'
    }
  },
  {
    key: 'common.add',
    translations: {
      en: 'Add',
      af: 'Voeg by',
      zu: 'Engeza'
    }
  },
  {
    key: 'common.search',
    translations: {
      en: 'Search',
      af: 'Soek',
      zu: 'Sesha'
    }
  },
  {
    key: 'common.loading',
    translations: {
      en: 'Loading...',
      af: 'Laai...',
      zu: 'Iyalayisha...'
    }
  },
  {
    key: 'common.error',
    translations: {
      en: 'Error',
      af: 'Fout',
      zu: 'Iphutha'
    }
  },
  {
    key: 'common.success',
    translations: {
      en: 'Success',
      af: 'Sukses',
      zu: 'Impumelelo'
    }
  },
  {
    key: 'common.warning',
    translations: {
      en: 'Warning',
      af: 'Waarskuwing',
      zu: 'Isexwayiso'
    }
  },
  {
    key: 'common.confirm',
    translations: {
      en: 'Confirm',
      af: 'Bevestig',
      zu: 'Qinisekisa'
    }
  },
  {
    key: 'common.close',
    translations: {
      en: 'Close',
      af: 'Maak toe',
      zu: 'Vala'
    }
  },

  // Navigation
  {
    key: 'nav.dashboard',
    translations: {
      en: 'Dashboard',
      af: 'Dashbord',
      zu: 'Ibhodi Lokusebenza'
    },
    module: 'navigation'
  },
  {
    key: 'nav.inventory',
    translations: {
      en: 'Inventory',
      af: 'Voorraad',
      zu: 'Impahla'
    },
    module: 'navigation'
  },
  {
    key: 'nav.sales',
    translations: {
      en: 'Sales',
      af: 'Verkope',
      zu: 'Ukuthengisa'
    },
    module: 'navigation'
  },
  {
    key: 'nav.customers',
    translations: {
      en: 'Customers',
      af: 'Kliënte',
      zu: 'Amakhasimende'
    },
    module: 'navigation'
  },
  {
    key: 'nav.invoicing',
    translations: {
      en: 'Invoicing',
      af: 'Fakturering',
      zu: 'Ukufaka Izinkokhelo'
    },
    module: 'navigation'
  },
  {
    key: 'nav.accounting',
    translations: {
      en: 'Accounting',
      af: 'Rekeningkunde',
      zu: 'Ukubala Imali'
    },
    module: 'navigation'
  },
  {
    key: 'nav.hr',
    translations: {
      en: 'Human Resources',
      af: 'Menslike Hulpbronne',
      zu: 'Izinsiza Zabantu'
    },
    module: 'navigation'
  },
  {
    key: 'nav.calendar',
    translations: {
      en: 'Calendar',
      af: 'Kalender',
      zu: 'Ikhalenda'
    },
    module: 'navigation'
  },
  {
    key: 'nav.messaging',
    translations: {
      en: 'Messaging',
      af: 'Boodskappe',
      zu: 'Imiyalezo'
    },
    module: 'navigation'
  },
  {
    key: 'nav.settings',
    translations: {
      en: 'Settings',
      af: 'Instellings',
      zu: 'Izilungiselelo'
    },
    module: 'navigation'
  },

  // Inventory module
  {
    key: 'inventory.products',
    translations: {
      en: 'Products',
      af: 'Produkte',
      zu: 'Imikhiqizo'
    },
    module: 'inventory'
  },
  {
    key: 'inventory.stock_level',
    translations: {
      en: 'Stock Level',
      af: 'Voorraadvlak',
      zu: 'Izinga Lempahla'
    },
    module: 'inventory'
  },
  {
    key: 'inventory.low_stock',
    translations: {
      en: 'Low Stock',
      af: 'Lae Voorraad',
      zu: 'Impahla Encane'
    },
    module: 'inventory'
  },
  {
    key: 'inventory.out_of_stock',
    translations: {
      en: 'Out of Stock',
      af: 'Uit Voorraad',
      zu: 'Ayisekho Impahla'
    },
    module: 'inventory'
  },
  {
    key: 'inventory.reorder_level',
    translations: {
      en: 'Reorder Level',
      af: 'Herbestelvlak',
      zu: 'Izinga Lokuphinda Uodele'
    },
    module: 'inventory'
  },

  // Sales module
  {
    key: 'sales.new_sale',
    translations: {
      en: 'New Sale',
      af: 'Nuwe Verkoop',
      zu: 'Ukuthengisa Okusha'
    },
    module: 'sales'
  },
  {
    key: 'sales.total_amount',
    translations: {
      en: 'Total Amount',
      af: 'Totale Bedrag',
      zu: 'Inani Eliphelele'
    },
    module: 'sales'
  },
  {
    key: 'sales.payment_method',
    translations: {
      en: 'Payment Method',
      af: 'Betalingsmetode',
      zu: 'Indlela Yokukhokha'
    },
    module: 'sales'
  },

  // Customer module
  {
    key: 'customers.customer_name',
    translations: {
      en: 'Customer Name',
      af: 'Kliëntnaam',
      zu: 'Igama Lekhasimende'
    },
    module: 'customers'
  },
  {
    key: 'customers.contact_details',
    translations: {
      en: 'Contact Details',
      af: 'Kontakbesonderhede',
      zu: 'Imininingwane Yokuxhumana'
    },
    module: 'customers'
  },

  // Notifications
  {
    key: 'notifications.new_notification',
    translations: {
      en: 'New Notification',
      af: 'Nuwe Kennisgewing',
      zu: 'Isaziso Esisha'
    },
    module: 'notifications'
  },
  {
    key: 'notifications.mark_as_read',
    translations: {
      en: 'Mark as Read',
      af: 'Merk as Gelees',
      zu: 'Phawula Njengokufundiwe'
    },
    module: 'notifications'
  },
  {
    key: 'notifications.no_notifications',
    translations: {
      en: 'No notifications',
      af: 'Geen kennisgewings',
      zu: 'Azikho izaziso'
    },
    module: 'notifications'
  },

  // Activity tracking
  {
    key: 'activity.recent_activities',
    translations: {
      en: 'Recent Activities',
      af: 'Onlangse Aktiwiteite',
      zu: 'Imisebenzi Yamuva'
    },
    module: 'activity'
  },
  {
    key: 'activity.user_action',
    translations: {
      en: '{{user}} {{action}} {{entity}}',
      af: '{{user}} het {{entity}} {{action}}',
      zu: '{{user}} {{action}} {{entity}}'
    },
    module: 'activity'
  },

  // Error messages
  {
    key: 'errors.something_went_wrong',
    translations: {
      en: 'Something went wrong',
      af: 'Iets het verkeerd geloop',
      zu: 'Kukhona okungahambanga kahle'
    },
    module: 'errors'
  },
  {
    key: 'errors.network_error',
    translations: {
      en: 'Network error. Please try again.',
      af: 'Netwerkfout. Probeer asseblief weer.',
      zu: 'Iphutha lenethiwekhi. Sicela uzame futhi.'
    },
    module: 'errors'
  },
  {
    key: 'errors.permission_denied',
    translations: {
      en: 'Permission denied',
      af: 'Toestemming geweier',
      zu: 'Imvume yenqatshelwe'
    },
    module: 'errors'
  },

  // Success messages
  {
    key: 'success.saved_successfully',
    translations: {
      en: 'Saved successfully',
      af: 'Suksesvol gestoor',
      zu: 'Kugcinwe ngempumelelo'
    },
    module: 'success'
  },
  {
    key: 'success.deleted_successfully',
    translations: {
      en: 'Deleted successfully',
      af: 'Suksesvol verwyder',
      zu: 'Kususiwe ngempumelelo'
    },
    module: 'success'
  }
]

async function seedTranslations() {
  console.log('🌱 Seeding translations...')

  try {
    for (const item of initialTranslations) {
      const { key, translations, module } = item

      for (const [language, value] of Object.entries(translations)) {
        await prisma.translation.upsert({
          where: {
            key_language: {
              key,
              language: language as 'en' | 'af' | 'zu'
            }
          },
          update: {
            value,
            module,
            updatedAt: new Date()
          },
          create: {
            key,
            language: language as 'en' | 'af' | 'zu',
            value,
            module
          }
        })
      }

      console.log(`✅ Seeded translations for key: ${key}`)
    }

    console.log(`🎉 Successfully seeded ${initialTranslations.length} translation keys`)
    
    // Print summary
    const counts = await prisma.translation.groupBy({
      by: ['language'],
      _count: {
        id: true
      }
    })

    console.log('\n📊 Translation Summary:')
    counts.forEach(({ language, _count }) => {
      console.log(`  ${language}: ${_count.id} translations`)
    })

  } catch (error) {
    console.error('❌ Error seeding translations:', error)
    throw error
  }
}

async function main() {
  try {
    await seedTranslations()
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { seedTranslations }