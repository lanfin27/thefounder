/**
 * YouTube Industry Schedules Page
 * 스케줄 관리 페이지
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Play, Pause } from 'lucide-react'

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">스케줄 관리</h1>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          새 스케줄 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>자동 업데이트 스케줄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">일일 전체 업데이트</h3>
                  <p className="text-sm text-gray-500">매일 오전 3시에 모든 채널 업데이트</p>
                  <p className="text-xs text-gray-400 mt-1">Cron: 0 3 * * *</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">활성</span>
                  <Button size="sm" variant="outline">
                    <Pause className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">시간별 증분 업데이트</h3>
                  <p className="text-sm text-gray-500">매 시간 최근 변경 채널 업데이트</p>
                  <p className="text-xs text-gray-400 mt-1">Cron: 0 * * * *</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">비활성</span>
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center text-gray-500 py-8">
              스케줄 관리 기능은 준비 중입니다
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
