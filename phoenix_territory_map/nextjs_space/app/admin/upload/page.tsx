'use client'

/**
 * Admin Data Upload Page
 *
 * Allows administrators to upload CSV/XLSX files for territory data.
 * Supports location selection, data type selection, optional backup,
 * and displays upload results with validation feedback.
 *
 * bd-508
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import Link from 'next/link'

const LOCATIONS = [
  { value: 'arizona', label: 'Phoenix / Tucson, AZ' },
  { value: 'miami', label: 'Miami, FL' },
  { value: 'dallas', label: 'Dallas, TX' },
  { value: 'orlando', label: 'Orlando, FL' },
  { value: 'jacksonville', label: 'Jacksonville, FL' },
  { value: 'portcharlotte', label: 'Port Charlotte, FL' },
] as const

const DATA_TYPES = [
  { value: 'territory', label: 'Territory Assignments' },
  { value: 'density', label: 'Account Density' },
  { value: 'customer', label: 'Customer Data' },
  { value: 'revenue', label: 'Revenue Data' },
  { value: 'routes', label: 'Route Data' },
  { value: 'employee', label: 'Employee Data' },
  { value: 'commercial', label: 'Commercial Accounts' },
  { value: 'ancillarySales', label: 'Ancillary Sales' },
  { value: 'marketSize', label: 'Market Size' },
] as const

interface UploadResult {
  success: boolean
  message?: string
  error?: string
  validationErrors?: string[]
  totalErrors?: number
  metadata?: {
    location: string
    dataType: string
    recordCount: number
    fileName: string
    uploadId: string
    backupKey?: string
    geocoding?: { geocoded: number; failed: number; skipped: number }
  }
}

export default function AdminUploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [location, setLocation] = useState('')
  const [dataType, setDataType] = useState('')
  const [createBackup, setCreateBackup] = useState(true)
  const [enableGeocoding, setEnableGeocoding] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    const userRole = session?.user?.role
    if (userRole !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  const handleFile = useCallback((file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setResult({
        success: false,
        error: 'Please select a CSV or Excel (.xlsx) file',
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setResult({
        success: false,
        error: 'File is too large. Maximum size is 10MB.',
      })
      return
    }
    setSelectedFile(file)
    setResult(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!selectedFile || !location || !dataType) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('location', location)
      formData.append('dataType', dataType)
      formData.append('createBackup', createBackup.toString())
      if (enableGeocoding) formData.append('geocode', 'true')

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResult = await response.json()

      if (response.ok) {
        setResult({ ...data, success: true })
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''

        // Invalidate TanStack Query cache for the uploaded location/dataType (bd-1de)
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.includes('locationData') &&
            query.queryKey.includes(location),
        })
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed',
          validationErrors: data.validationErrors,
          totalErrors: data.totalErrors,
        })
      }
    } catch (err) {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-6 flex gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Admin Panel
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Territory Data
            </CardTitle>
            <CardDescription>
              Upload CSV or Excel files to update location data. Existing data can be backed up
              automatically before replacement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location and Data Type selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={setLocation} disabled={uploading}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataType">Data Type</Label>
                <Select value={dataType} onValueChange={setDataType} disabled={uploading}>
                  <SelectTrigger id="dataType">
                    <SelectValue placeholder="Select data type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Backup toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="backup"
                checked={createBackup}
                onChange={(e) => setCreateBackup(e.target.checked)}
                disabled={uploading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="backup" className="text-sm text-muted-foreground cursor-pointer">
                Create backup of existing data before upload
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="geocode"
                checked={enableGeocoding}
                onChange={(e) => setEnableGeocoding(e.target.checked)}
                disabled={uploading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="geocode" className="text-sm text-muted-foreground cursor-pointer">
                Geocode records missing lat/lng coordinates (uses Google API)
              </Label>
            </div>

            {/* File drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0])
                }}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV or Excel (.xlsx) up to 10MB</p>
                </div>
              )}
            </div>

            {/* Upload button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !location || !dataType}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
                </>
              )}
            </Button>

            {/* Results */}
            {result && (
              <div className="space-y-3">
                {result.success ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <p className="font-medium">Upload successful!</p>
                      {result.metadata && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{result.metadata.recordCount} records</Badge>
                          <Badge variant="outline">{result.metadata.location}</Badge>
                          <Badge variant="outline">{result.metadata.dataType}</Badge>
                          {result.metadata.backupKey && (
                            <Badge variant="secondary">Backup created</Badge>
                          )}
                          {result.metadata.geocoding && (
                            <Badge variant="secondary">
                              {result.metadata.geocoding.geocoded} geocoded
                              {result.metadata.geocoding.failed > 0 &&
                                `, ${result.metadata.geocoding.failed} failed`}
                            </Badge>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">{result.error}</p>
                      {result.validationErrors && result.validationErrors.length > 0 && (
                        <ul className="mt-2 text-sm list-disc pl-4 space-y-1">
                          {result.validationErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {result.totalErrors &&
                            result.totalErrors > result.validationErrors.length && (
                              <li className="text-muted-foreground">
                                ...and {result.totalErrors - result.validationErrors.length} more
                                errors
                              </li>
                            )}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
