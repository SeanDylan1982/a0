import React from 'react'

export interface InvoiceDocumentData {
  id: string
  number: string
  createdAt: string
  dueDate?: string
  subtotal: number
  tax: number
  total: number
  notes?: string
  status?: string
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
  items?: Array<{
    productId: string
    quantity: number
    price: number
    total: number
    product?: { sku?: string; name?: string }
  }>
}

interface Props {
  invoice: InvoiceDocumentData
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

export const InvoiceDocument: React.FC<Props> = ({ invoice, company }) => {
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
          <h1 className="text-2xl font-bold">Tax Invoice</h1>
          <div className="text-sm text-gray-600">Invoice #: {invoice.number}</div>
          <div className="text-sm text-gray-600">Date: {new Date(invoice.createdAt).toLocaleDateString()}</div>
          {invoice.dueDate && (
            <div className="text-sm text-gray-600">Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</div>
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
          <h2 className="font-semibold mb-2">Bill To</h2>
          <div className="text-sm">
            <div className="font-medium">{invoice.customer.firstName} {invoice.customer.lastName}</div>
            {invoice.customer.company && <div>{invoice.customer.company}</div>}
            {invoice.customer.address && <div>{invoice.customer.address}</div>}
            <div>{[invoice.customer.city, invoice.customer.state, invoice.customer.postalCode].filter(Boolean).join(', ')}</div>
            <div>{invoice.customer.country}</div>
            {invoice.customer.phone && <div>{invoice.customer.phone}</div>}
            {invoice.customer.email && <div>{invoice.customer.email}</div>}
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
              <th className="py-3 text-right">Price</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((it, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2">{it.product?.sku || it.productId}</td>
                <td className="py-2">{it.product?.name || ''}</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">R{it.price.toFixed(2)}</td>
                <td className="py-2 text-right">R{(it.total ?? it.quantity * it.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-start justify-between">
        <div className="max-w-md text-xs text-gray-600">
          {invoice.notes && (
            <>
              <div className="font-semibold text-gray-700 mb-1">Notes</div>
              <div className="whitespace-pre-line">{invoice.notes}</div>
            </>
          )}
        </div>
        <div className="w-64 text-sm">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>R{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax (15%)</span>
            <span>R{invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t font-semibold">
            <span>Total</span>
            <span>R{invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 text-xs text-gray-500">
        Thank you for your business.
      </div>
    </div>
  )
}
