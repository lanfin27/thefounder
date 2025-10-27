/**
 * YouTube Industry Settings Page
 * 설정 페이지
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Key, Database, Bell } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* API 키 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            YouTube API 키 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIza..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  disabled
                />
                <Button variant="outline">편집</Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                일일 사용 한도: 10,000 units
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 데이터베이스 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터베이스 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium">Supabase 연결</h3>
                <p className="text-sm text-gray-500">
                  {process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? '연결됨' : '연결 안됨'}
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                정상
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">API 할당량 경고</h3>
                <p className="text-xs text-gray-500">80% 초과 시 알림</p>
              </div>
              <input type="checkbox" className="h-4 w-4" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">업데이트 완료 알림</h3>
                <p className="text-xs text-gray-500">작업 완료 시 알림</p>
              </div>
              <input type="checkbox" className="h-4 w-4" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">에러 알림</h3>
                <p className="text-xs text-gray-500">오류 발생 시 즉시 알림</p>
              </div>
              <input type="checkbox" className="h-4 w-4" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>설정 저장</Button>
      </div>
    </div>
  )
}
