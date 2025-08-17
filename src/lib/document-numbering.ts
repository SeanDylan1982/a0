import { db } from './db-manager'

export async function getNextDocumentNumber(type: string, prefix: string = ''): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Find or create document sequence for this type and year
  let sequence = await db.documentSequence.findUnique({
    where: { type: `${type}_${currentYear}` }
  })
  
  if (!sequence) {
    sequence = await db.documentSequence.create({
      data: {
        type: `${type}_${currentYear}`,
        prefix,
        currentNumber: 1,
        year: currentYear
      }
    })
    return `${prefix}${currentYear}${String(1).padStart(6, '0')}`
  }
  
  // Increment the number
  const updatedSequence = await db.documentSequence.update({
    where: { id: sequence.id },
    data: { currentNumber: sequence.currentNumber + 1 }
  })
  
  return `${prefix}${currentYear}${String(updatedSequence.currentNumber).padStart(6, '0')}`
}

export const DocumentTypes = {
  INVOICE: 'INVOICE',
  QUOTE: 'QUOTE', 
  CREDIT_NOTE: 'CREDIT_NOTE',
  DELIVERY_NOTE: 'DELIVERY_NOTE',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  RECEIPT: 'RECEIPT'
} as const

export const DocumentPrefixes = {
  INVOICE: 'INV-',
  QUOTE: 'QUO-',
  CREDIT_NOTE: 'CN-',
  DELIVERY_NOTE: 'DN-',
  PURCHASE_ORDER: 'PO-',
  RECEIPT: 'REC-'
} as const