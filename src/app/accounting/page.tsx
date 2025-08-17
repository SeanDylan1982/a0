'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Receipt,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Percent
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface Transaction {
  id: string
  number: string
  date: string
  description: string
  type: string
  amount: number
  accountId: string
  reference?: string
  createdAt: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
  description?: string
  isActive: boolean
  balance: number
}

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const { toast } = useToast()

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'DEBIT': return 'text-red-600'
      case 'CREDIT': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-blue-100 text-blue-800'
      case 'LIABILITY': return 'bg-green-100 text-green-800'
      case 'EQUITY': return 'bg-purple-100 text-purple-800'
      case 'REVENUE': return 'bg-emerald-100 text-emerald-800'
      case 'EXPENSE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const sampleAccounts: Account[] = [
    {
      id: '1',
      code: '1001',
      name: 'Cash',
      type: 'ASSET',
      isActive: true,
      balance: 50000
    },
    {
      id: '2',
      code: '2001',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      isActive: true,
      balance: 15000
    },
    {
      id: '3',
      code: '3001',
      name: 'Owner\'s Equity',
      type: 'EQUITY',
      isActive: true,
      balance: 100000
    },
    {
      id: '4',
      code: '4001',
      name: 'Sales Revenue',
      type: 'REVENUE',
      isActive: true,
      balance: 200000
    },
    {
      id: '5',
      code: '5001',
      name: 'Office Expenses',
      type: 'EXPENSE',
      isActive: true,
      balance: 25000
    }
  ]

  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      number: 'TRX001',
      date: '2024-01-15',
      description: 'Sales Invoice #INV001',
      type: 'CREDIT',
      amount: 11500,
      accountId: '4',
      reference: 'INV001',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      number: 'TRX002',
      date: '2024-01-16',
      description: 'Office Rent Payment',
      type: 'DEBIT',
      amount: 5000,
      accountId: '5',
      reference: 'RENT001',
      createdAt: '2024-01-16'
    },
    {
      id: '3',
      number: 'TRX003',
      date: '2024-01-17',
      description: 'Supplier Payment',
      type: 'DEBIT',
      amount: 8000,
      accountId: '2',
      reference: 'PAY001',
      createdAt: '2024-01-17'
    }
  ]

  const filteredTransactions = sampleTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalAssets = sampleAccounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.balance, 0)
  const totalLiabilities = sampleAccounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + a.balance, 0)
  const totalEquity = sampleAccounts.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + a.balance, 0)
  const totalRevenue = sampleAccounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + a.balance, 0)
  const totalExpenses = sampleAccounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + a.balance, 0)
  const netIncome = totalRevenue - totalExpenses
  const vatCollected = totalRevenue * 0.15 / 1.15 // 15% VAT

  return (
    <PageLayout currentPage="/accounting" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Accounting' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-l-emerald-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Accounting</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage finances, taxes, and compliance</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                    🇿🇦 SARS compliant | VAT registered
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📈</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end mb-6">
          <div className="flex space-x-2">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Assets
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{totalAssets.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Current assets
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Net Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R{Math.abs(netIncome).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {netIncome >= 0 ? 'Profit' : 'Loss'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                VAT Collected
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{vatCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                15% VAT rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tax Compliance
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <p className="text-xs text-muted-foreground">
                All returns filed
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
            <TabsTrigger value="tax">Tax Management</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>Financial transactions and journal entries</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.number}
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'DEBIT' ? 'destructive' : 'default'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-medium ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type === 'DEBIT' ? '-' : '+'}R{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.reference}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>Manage your account structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((accountType) => (
                    <div key={accountType}>
                      <h3 className="text-lg font-semibold mb-3">{accountType}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sampleAccounts
                          .filter(account => account.type === accountType)
                          .map((account) => (
                            <div key={account.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm text-gray-500">{account.code}</span>
                                <Badge variant="outline" className={getAccountTypeColor(account.type)}>
                                  {account.type}
                                </Badge>
                              </div>
                              <h4 className="font-medium">{account.name}</h4>
                              <p className="text-lg font-bold mt-1">R{account.balance.toLocaleString()}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Income Statement
                  </CardTitle>
                  <CardDescription>Profit and Loss report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Revenue</span>
                      <span className="font-medium">R{totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Expenses</span>
                      <span className="font-medium">R{totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Net Income</span>
                      <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                        R{Math.abs(netIncome).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button className="w-full mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Balance Sheet
                  </CardTitle>
                  <CardDescription>Financial position</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Assets</span>
                      <span className="font-medium">R{totalAssets.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Liabilities</span>
                      <span className="font-medium">R{totalLiabilities.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Equity</span>
                      <span className="font-medium">R{totalEquity.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Trial Balance
                  </CardTitle>
                  <CardDescription>Account balances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Debits</span>
                      <span className="font-medium">R{(totalAssets + totalExpenses).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Credits</span>
                      <span className="font-medium">R{(totalLiabilities + totalEquity + totalRevenue).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Difference</span>
                      <span className="text-green-600">R0.00</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Management</CardTitle>
                <CardDescription>SARS compliance and tax filings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">VAT Management</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">VAT Registration</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Registered Vendor</p>
                        <p className="text-sm text-gray-500">VAT Number: 1234567890</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">VAT Collected</span>
                          <span className="font-bold">R{vatCollected.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Current period</p>
                        <p className="text-sm text-gray-500">Next filing: 2024-02-25</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">VAT Rate</span>
                          <span className="font-bold">15%</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Standard rate</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Income Tax</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Tax Year</span>
                          <span className="font-bold">2024</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">March - February</p>
                        <p className="text-sm text-gray-500">Estimated taxable income: R{netIncome.toLocaleString()}</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Provisional Tax</span>
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">First payment due</p>
                        <p className="text-sm text-gray-500">2024-08-31</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">PAYE</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Employee tax up to date</p>
                        <p className="text-sm text-gray-500">EMP501 submitted</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageLayout>
  )
}