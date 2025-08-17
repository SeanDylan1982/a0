import React from 'react'

export interface DeliveryNoteDocumentData {
  id: string
  number: string
  createdAt: string
  deliveryDate: string
  deliveryAddress?: string
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
  items?: Array<{
    productId: string
    quantity: number
    product?: { sku?: string; name?: string }
  }>
}

interface Props {
  deliveryNote: DeliveryNoteDocumentData
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

export const DeliveryNoteDocument: React.FC<Props> = ({ deliveryNote, company }) => {
  const companyInfo = company ?? {
    name: 'Account Zero',
    address: '123 Business Rd',
    city: 'Cape Town',
    country: 'South Africa',
    phone: '+27 00 000 0000',
    email: 'info@accountzero.local',
  }

  return (
    <div className="bg-white text-gray-900 p-8 w-full mx-auto">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Delivery Note</h1>
          <div className="text-sm text-gray-600">Delivery Note #: {deliveryNote.number}</div>
          <div className="text-sm text-gray-600">Date: {new Date(deliveryNote.createdAt).toLocaleDateString()}</div>
          <div className="text-sm text-gray-600">Delivery Date: {new Date(deliveryNote.deliveryDate).toLocaleDateString()}</div>
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
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Deliver To</h2>
          <div className="text-sm">
            <div className="font-medium">{deliveryNote.customer.firstName} {deliveryNote.customer.lastName}</div>
            {deliveryNote.customer.company && <div>{deliveryNote.customer.company}</div>}
            {deliveryNote.deliveryAddress || deliveryNote.customer.address ? (
              <div>{deliveryNote.deliveryAddress || deliveryNote.customer.address}</div>
            ) : null}
            <div>{[deliveryNote.customer.city, deliveryNote.customer.state, deliveryNote.customer.postalCode].filter(Boolean).join(', ')}</div>
            <div>{deliveryNote.customer.country}</div>
            {deliveryNote.customer.phone && <div>{deliveryNote.customer.phone}</div>}
            {deliveryNote.customer.email && <div>{deliveryNote.customer.email}</div>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <table className="w-full text-sm border-t border-b">
          <thead>
            <tr className="text-left">
              <th className="py-3">SKU</th>
              <th className="py-3">Description</th>
              <th className="py-3 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(deliveryNote.items ?? []).map((it, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2">{it.product?.sku || it.productId}</td>
                <td className="py-2">{it.product?.name || ''}</td>
                <td className="py-2 text-right">{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deliveryNote.notes && (
        <div className="mt-6 text-xs text-gray-600">
          <div className="font-semibold text-gray-700 mb-1">Notes</div>
          <div className="whitespace-pre-line">{deliveryNote.notes}</div>
        </div>
      )}

      <div className="mt-10 text-xs text-gray-500">
        Please verify received goods and report discrepancies within 48 hours.
      </div>
    </div>
  )
}
