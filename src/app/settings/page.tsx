'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLayout } from '@/components/page-layout'
import { 
  Save, 
  RefreshCw, 
  Download,
  Upload,
  Shield,
  Bell,
  Mail,
  Database,
  Users,
  Building,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  Settings,
  Plus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = (section: string) => {
    setIsLoading(true)
    setTimeout(() => {
      toast({
        title: "Success",
        description: `${section} settings saved successfully`,
      })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <PageLayout currentPage="/settings" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Settings' }]}>
      {/* Page header with card styling */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-l-4 border-l-slate-500 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
                <p className="text-gray-600 text-sm mb-2">Configure your Account Zero system</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-sm font-medium">
                  🇿🇦 South African business configuration
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">⚙️</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-6xl mx-auto">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="banking">Banking</TabsTrigger>
                <TabsTrigger value="tax">Tax Settings</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="Account Zero Demo" />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="Africa/Johannesburg">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue="ZAR">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZAR">South African Rand (R)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select defaultValue="YYYY-MM-DD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                  <Select defaultValue="march">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="february">February</SelectItem>
                      <SelectItem value="march">March (South Africa)</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-gray-500">Daily automatic database backups</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Button onClick={() => handleSave('General')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save General Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Company Information
                </CardTitle>
                <CardDescription>Your business details and legal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="legalName">Legal Business Name</Label>
                    <Input id="legalName" defaultValue="Account Zero (Pty) Ltd" />
                  </div>
                  <div>
                    <Label htmlFor="tradingName">Trading Name</Label>
                    <Input id="tradingName" defaultValue="Account Zero" />
                  </div>
                  <div>
                    <Label htmlFor="registrationNumber">Company Registration Number</Label>
                    <Input id="registrationNumber" placeholder="e.g., 2024/123456/07" />
                  </div>
                  <div>
                    <Label htmlFor="vatNumber">VAT Number</Label>
                    <Input id="vatNumber" placeholder="e.g., 1234567890" />
                  </div>
                  <div>
                    <Label htmlFor="taxNumber">Income Tax Number</Label>
                    <Input id="taxNumber" placeholder="e.g., 1234567890" />
                  </div>
                  <div>
                    <Label htmlFor="uifNumber">UIF Reference Number</Label>
                    <Input id="uifNumber" placeholder="e.g., 1234567/8" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Business Address</Label>
                  <textarea
                    id="address"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Full business address"
                    defaultValue="123 Business Street, Johannesburg, 2000, South Africa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input id="contactEmail" type="email" defaultValue="info@accountzero.co.za" />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input id="contactPhone" placeholder="+27" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select defaultValue="technology">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => handleSave('Company')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Company Information
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Banking Details
                </CardTitle>
                <CardDescription>Manage your company's bank accounts and payment processing options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Primary Bank Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Select defaultValue="standard">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Bank</SelectItem>
                          <SelectItem value="absa">ABSA Bank</SelectItem>
                          <SelectItem value="nedbank">Nedbank</SelectItem>
                          <SelectItem value="fnb">First National Bank</SelectItem>
                          <SelectItem value="capitec">Capitec Bank</SelectItem>
                          <SelectItem value="investec">Investec Bank</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select defaultValue="current">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Current Account</SelectItem>
                          <SelectItem value="savings">Savings Account</SelectItem>
                          <SelectItem value="business">Business Account</SelectItem>
                          <SelectItem value="transmission">Transmission Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" placeholder="Enter account number" />
                    </div>
                    <div>
                      <Label htmlFor="branchCode">Branch Code</Label>
                      <Input id="branchCode" placeholder="Enter branch code" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Processing Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">EFT Payments</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Enable Electronic Funds Transfer</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Credit Card Processing</span>
                        <Switch />
                      </div>
                      <p className="text-sm text-gray-600">Accept credit card payments</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Debit Order Collections</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Automated debit order collections</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Instant EFT</span>
                        <Switch />
                      </div>
                      <p className="text-sm text-gray-600">Real-time EFT payments</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Bank Accounts</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">Tax Account</h4>
                          <p className="text-sm text-gray-600">For SARS tax payments</p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Bank:</span>
                          <span className="ml-2">SARS Revenue Bank</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Account:</span>
                          <span className="ml-2">Not configured</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">Payroll Account</h4>
                          <p className="text-sm text-gray-600">For salary payments</p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Bank:</span>
                          <span className="ml-2">Not configured</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Account:</span>
                          <span className="ml-2">Not configured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Banking Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="defaultPaymentMethod">Default Payment Method</Label>
                      <Select defaultValue="eft">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eft">EFT</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_order">Debit Order</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Standard Payment Terms</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('Banking')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Banking Details
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Tax Configuration
                </CardTitle>
                <CardDescription>South African tax settings and compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="vatRate">Standard VAT Rate</Label>
                    <Select defaultValue="15">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% - Zero Rated</SelectItem>
                        <SelectItem value="15">15% - Standard Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vatScheme">VAT Scheme</Label>
                    <Select defaultValue="invoice">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoice">Invoice Basis</SelectItem>
                        <SelectItem value="payment">Payment Basis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="taxPeriod">VAT Period</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="bimonthly">Bi-monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="sixmonthly">Six-monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payePeriod">PAYE Period</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tax Thresholds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="vatThreshold">VAT Registration Threshold</Label>
                      <Input id="vatThreshold" defaultValue="1000000" type="number" />
                      <p className="text-xs text-gray-500 mt-1">Annual turnover (R)</p>
                    </div>
                    <div>
                      <Label htmlFor="payeThreshold">PAYE Threshold</Label>
                      <Input id="payeThreshold" defaultValue="91667" type="number" />
                      <p className="text-xs text-gray-500 mt-1">Monthly salary (R)</p>
                    </div>
                    <div>
                      <Label htmlFor="uifThreshold">UIF Threshold</Label>
                      <Input id="uifThreshold" defaultValue="17712" type="number" />
                      <p className="text-xs text-gray-500 mt-1">Monthly earnings (R)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tax Compliance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Auto-calculate VAT</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Automatically calculate VAT on invoices</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Auto-calculate PAYE</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Automatically calculate employee tax</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Tax Reminders</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Email reminders for tax deadlines</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Auto-file Returns</span>
                        <Switch />
                      </div>
                      <p className="text-sm text-gray-600">Automatically file tax returns (SARS eFiling)</p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('Tax')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Tax Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage security and data protection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">POPIA Compliance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Data Encryption</span>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600">All data encrypted at rest and in transit</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Data Retention</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Automatic data retention policies</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Access Logs</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Log all user access and changes</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Consent Management</span>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-gray-600">Manage user consent for data processing</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">User Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="passwordPolicy">Password Policy</Label>
                      <Select defaultValue="strong">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="strong">Strong</SelectItem>
                          <SelectItem value="very-strong">Very Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500">Require 2FA for all users</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Account Lockout</Label>
                        <p className="text-sm text-gray-500">Lock account after 5 failed attempts</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Password Expiry</Label>
                        <p className="text-sm text-gray-500">Force password change every 90 days</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Data Backup & Recovery</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Backup Frequency</span>
                        <Select defaultValue="daily">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-gray-600">Automated backup schedule</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Backup Location</span>
                        <Select defaultValue="cloud">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local</SelectItem>
                            <SelectItem value="cloud">Cloud</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-gray-600">Backup storage location</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={() => handleSave('Security')} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Security Settings
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Backup Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
    </PageLayout>
  )
}