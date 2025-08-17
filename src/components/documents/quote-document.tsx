import React from 'react'

type QuoteItem = {
  productId: string
  quantity: number
  price: number
  total: number
  product?: { sku?: string; name?: string }
}

export interface QuoteDocumentData {
  id: string
  number: string
  createdAt: string
  validUntil: string
  subtotal: number
  tax: number
  total: number
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
  items?: QuoteItem[]
}

interface Props {
  quote: QuoteDocumentData
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

export const QuoteDocument: React.FC<Props> = ({ quote, company }) => {
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
          <h1 className="text-2xl font-bold">Sales Quote</h1>
          <div className="text-sm text-gray-600">Quote #: {quote.number}</div>
          <div className="text-sm text-gray-600">Date: {new Date(quote.createdAt).toLocaleDateString()}</div>
          <div className="text-sm text-gray-600">Valid Until: {new Date(quote.validUntil).toLocaleDateString()}</div>
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
            <div className="font-medium">{quote.customer.firstName} {quote.customer.lastName}</div>
            {quote.customer.company && <div>{quote.customer.company}</div>}
            {quote.customer.address && <div>{quote.customer.address}</div>}
            <div>{[quote.customer.city, quote.customer.state, quote.customer.postalCode].filter(Boolean).join(', ')}</div>
            <div>{quote.customer.country}</div>
            {quote.customer.phone && <div>{quote.customer.phone}</div>}
            {quote.customer.email && <div>{quote.customer.email}</div>}
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
            {(quote.items ?? []).map((it, idx) => (
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
          {quote.notes && (
            <>
              <div className="font-semibold text-gray-700 mb-1">Notes</div>
              <div className="whitespace-pre-line">{quote.notes}</div>
            </>
          )}
        </div>
        <div className="w-64 text-sm">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>R{quote.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax (15%)</span>
            <span>R{quote.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t font-semibold">
            <span>Total</span>
            <span>R{quote.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 text-xs text-gray-500">
        This is a quote and not a tax invoice. Prices include VAT unless otherwise stated.
      </div>
    </div>
  )
}
