import React from 'react'

export interface CreditNoteDocumentData {
  id: string
  number: string
  createdAt: string
  amount: number
  reason: string
  notes?: string
  customer: {
    firstName: string
    lastName: string
    company?: string
    address?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    phone?: string
    email?: string
  }
  invoice?: { number: string }
}

interface Props {
  creditNote: CreditNoteDocumentData
  company?: {
    name: string
    address?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    phone?: string
    email?: string
    taxId?: string
    logoUrl?: string
  }
}

export const CreditNoteDocument: React.FC<Props> = ({ creditNote, company }) => {
  const companyInfo = company ?? {
    name: 'Account Zero',
    address: '123 Business Rd',
    city: 'Cape Town',
    country: 'South Africa',
    phone: '+27 00 000 0000',
    email: 'info@accountzero.local',
    taxId: 'VAT: 0000000000',
  }

  return (
    <div className="bg-white text-gray-900 p-8 w-full mx-auto">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Credit Note</h1>
          <div className="text-sm text-gray-600">Credit Note #: {creditNote.number}</div>
          <div className="text-sm text-gray-600">Date: {new Date(creditNote.createdAt).toLocaleDateString()}</div>
          {creditNote.invoice?.number && (
            <div className="text-sm text-gray-600">Against Invoice: {creditNote.invoice.number}</div>
          )}
        </div>
        <div className="text-right">
          {companyInfo.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyInfo.logoUrl} alt={companyInfo.name} className="h-12 object-contain ml-auto" />
          ) : (
            <div className="text-xl font-semibold">{companyInfo.name}</div>
          )}
          <div className="text-xs text-gray-600">
            <div>{companyInfo.address}</div>
            <div>{[companyInfo.city, companyInfo.state, companyInfo.postalCode].filter(Boolean).join(', ')}</div>
            <div>{companyInfo.country}</div>
            <div>{companyInfo.phone}</div>
            <div>{companyInfo.email}</div>
            {companyInfo.taxId && <div>{companyInfo.taxId}</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Customer</h2>
          <div className="text-sm">
            <div className="font-medium">{creditNote.customer.firstName} {creditNote.customer.lastName}</div>
            {creditNote.customer.company && <div>{creditNote.customer.company}</div>}
            {creditNote.customer.address && <div>{creditNote.customer.address}</div>}
            <div>{[creditNote.customer.city, creditNote.customer.state, creditNote.customer.postalCode].filter(Boolean).join(', ')}</div>
            <div>{creditNote.customer.country}</div>
            {creditNote.customer.phone && <div>{creditNote.customer.phone}</div>}
            {creditNote.customer.email && <div>{creditNote.customer.email}</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 w-full text-sm">
        <div className="flex justify-between py-2 border-t border-b font-medium">
          <span>Amount</span>
          <span>R{creditNote.amount.toFixed(2)}</span>
        </div>
        <div className="mt-3">
          <div className="font-semibold text-gray-700 mb-1">Reason</div>
          <div className="text-sm text-gray-800">{creditNote.reason}</div>
        </div>
        {creditNote.notes && (
          <div className="mt-3">
            <div className="font-semibold text-gray-700 mb-1">Notes</div>
            <div className="text-sm text-gray-800 whitespace-pre-line">{creditNote.notes}</div>
          </div>
        )}
      </div>

      <div className="mt-10 text-xs text-gray-500">
        This credit note reduces the balance due on the referenced invoice.
      </div>
    </div>
  )
}
