'use client'

import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, Users, BadgeCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STUDENT_TEMPLATE = 'first_name,last_name,dob,grade,class_name,guardian_name,guardian_phone\nJohn,Doe,2008-05-12,10,10A,Jane Doe,555-0100'
const STAFF_TEMPLATE = 'name,email,role,department,phone\nJane Smith,jane@edu.edu,Teacher,Mathematics,555-0200'

type ParsedRow = Record<string, string>

export function ImportView() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ImportCard
        kind="students"
        title="Import Students"
        description="Bulk-add students via CSV upload."
        template={STUDENT_TEMPLATE}
        templateName="students_template.csv"
        icon={Users}
      />
      <ImportCard
        kind="staff"
        title="Import Staff"
        description="Bulk-add staff members via CSV upload."
        template={STAFF_TEMPLATE}
        templateName="staff_template.csv"
        icon={BadgeCheck}
      />
    </div>
  )
}

function ImportCard({
  kind, title, description, template, templateName, icon: Icon,
}: {
  kind: 'students' | 'staff'
  title: string
  description: string
  template: string
  templateName: string
  icon: any
}) {
  const addToast = useAppStore((s) => s.addToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  function downloadTemplate() {
    downloadCSV(template, templateName)
    addToast({ type: 'info', title: 'Template downloaded', body: templateName })
  }

  async function onFile(file: File) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      addToast({ type: 'warning', title: 'Empty CSV', body: 'No data rows found.' })
      return
    }
    const hs = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''))
    const parsed: ParsedRow[] = []
    for (const line of lines.slice(1)) {
      const cols = parseCSVLine(line)
      const obj: ParsedRow = {}
      hs.forEach((h, i) => { obj[h] = (cols[i] ?? '').replace(/^"|"$/g, '').trim() })
      parsed.push(obj)
    }
    setHeaders(hs)
    setRows(parsed)
    setSuccessCount(null)
  }

  async function runImport() {
    setImporting(true)
    let count = 0
    for (const row of rows) {
      try {
        if (kind === 'students') {
          await api('/api/students', {
            method: 'POST',
            body: {
              name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
              email: row.email ?? '',
              dob: row.dob ?? '',
              grade: Number(row.grade) || 7,
              class: row.class_name ?? '7A',
              guardian: row.guardian_name ?? '',
              phone: row.guardian_phone ?? '',
            },
          })
        } else {
          await api('/api/staff', {
            method: 'POST',
            body: {
              name: row.name ?? '',
              email: row.email ?? '',
              role: row.role || 'Teacher',
              department: row.department || 'General',
              phone: row.phone ?? '',
            },
          })
        }
        count++
      } catch { /* skip duplicates / errors */ }
    }
    setImporting(false)
    setSuccessCount(count)
    setRows([])
    setHeaders([])
    addToast({ type: 'success', title: 'Import complete', body: `${count} ${kind} imported successfully.` })
  }

  function reset() {
    setRows([])
    setHeaders([])
    setSuccessCount(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success state */}
        {successCount !== null ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{successCount} record(s) imported</p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">All valid rows were processed.</p>
            <Button variant="outline" size="sm" onClick={reset}>Import more</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="flex-1" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Download Template
              </Button>
              <label className="flex-1">
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choose CSV File
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
                />
              </label>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preview · <Badge variant="secondary" className="ml-1">{rows.length} rows</Badge>
                  </p>
                  <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
                </div>
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 border-b border-border bg-muted/80">
                      <tr>{headers.map((h) => <th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {headers.map((h) => <td key={h} className="p-2">{r[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 50 && <p className="p-2 text-center text-xs text-muted-foreground">+ {rows.length - 50} more rows…</p>}
                </div>
                <Button onClick={runImport} disabled={importing} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import {rows.length} {kind}
                </Button>
              </div>
            )}

            {/* Empty state */}
            {rows.length === 0 && (
              <div className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center')}>
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Choose a CSV file to preview rows here.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}
