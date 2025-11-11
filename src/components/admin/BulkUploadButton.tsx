'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { BulkUploadResultModal } from './BulkUploadResultModal'
import type { ExcelChannelRow, BulkValidationResponse } from '@/types/bulk-upload'

export function BulkUploadButton() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationResult, setValidationResult] = useState<BulkValidationResponse | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Excel 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
      return
    }

    setIsProcessing(true)

    try {
      // Excel 읽기
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: ExcelChannelRow[] = XLSX.utils.sheet_to_json(firstSheet, {
        defval: ''
      })

      console.log('[BulkUpload] Parsed', jsonData.length, 'rows')

      const validRows = jsonData.filter(row => row['YouTube URL']?.trim())

      if (validRows.length === 0) {
        alert('유효한 데이터가 없습니다.')
        setIsProcessing(false)
        return
      }

      // 서버 검증
      const response = await fetch('/api/admin/youtube/channels/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: validRows })
      })

      if (!response.ok) throw new Error('검증 실패')

      const result: BulkValidationResponse = await response.json()

      setValidationResult(result)
      setShowResultModal(true)

    } catch (error: any) {
      console.error('[BulkUpload] Error:', error)
      alert(`오류: ${error.message}`)
    } finally {
      setIsProcessing(false)
      event.target.value = ''
    }
  }

  return (
    <>
      <div className="relative">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="bulk-upload-input"
        />
        <Button
          variant="outline"
          disabled={isProcessing}
          className="relative"
          asChild
        >
          <label htmlFor="bulk-upload-input" className="cursor-pointer">
            {isProcessing ? (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4 animate-pulse" />
                처리 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Excel 일괄 업로드
              </>
            )}
          </label>
        </Button>
      </div>

      {showResultModal && validationResult && (
        <BulkUploadResultModal
          result={validationResult}
          onClose={() => setShowResultModal(false)}
          onConfirmInsert={async (successfulChannels) => {
            setIsProcessing(true)
            try {
              const response = await fetch('/api/admin/youtube/channels/bulk-insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channels: successfulChannels })
              })

              if (!response.ok) throw new Error('추가 실패')

              const result = await response.json()
              alert(`${result.successful}개 채널이 추가되었습니다!`)
              window.location.reload()

            } catch (error: any) {
              alert(`오류: ${error.message}`)
            } finally {
              setIsProcessing(false)
              setShowResultModal(false)
            }
          }}
        />
      )}
    </>
  )
}
