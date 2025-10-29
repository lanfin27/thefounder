'use client'

/**
 * Emoji Picker Component
 * 카테고리 아이콘 선택을 위한 이모티콘 선택기
 */

import { useState } from 'react'
import { X } from 'lucide-react'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  label?: string
}

// 자주 사용하는 이모티콘 카테고리별 분류
const EMOJI_CATEGORIES = {
  '최근 사용': ['🎵', '🎬', '🍜', '🐶', '⚽', '✈️', '🎮', '👤', '😂', '🎭', '📰', '💄'],
  '얼굴 & 사람': ['😀', '😂', '🥰', '😎', '🤔', '😴', '🤩', '🥳', '😇', '🤓', '👤', '👥', '👶', '🧑', '👨', '👩'],
  '동물 & 자연': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
  '음식 & 음료': ['🍎', '🍕', '🍔', '🍟', '🍿', '🥗', '🍜', '🍱', '🍙', '🍣', '🎂', '🍰', '☕', '🍺', '🍷', '🧃'],
  '활동 & 스포츠': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '⛳', '🏹', '🎣', '🥊'],
  '여행 & 장소': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚁', '🛸', '🚀', '🏠', '🏢', '🏰'],
  '미디어 & 오브젝트': ['🎵', '🎶', '🎤', '🎧', '🎬', '🎭', '🎮', '🕹️', '🎲', '🎰', '🎸', '🎹', '📱', '💻', '⌨️', '🖥️'],
  '의류 & 액세서리': ['💄', '👗', '👔', '🎩', '👑', '💍', '💎', '👠', '👞', '👟', '🧥', '👕', '👖', '🧢', '🎒', '👜'],
  '심볼 & 기호': ['❤️', '💚', '💙', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💗', '💓', '💕', '⭐', '✨', '💫', '🔥'],
  '교육 & 업무': ['📚', '📖', '📝', '📄', '📃', '📋', '📊', '📈', '📉', '🗂️', '📁', '📂', '✏️', '✒️', '🖊️', '📌'],
  '과학 & 의학': ['🔬', '🔭', '⚗️', '🧪', '🧬', '🦠', '💉', '🩺', '🩹', '💊', '🌡️', '🧲', '⚡', '🔋', '💡', '🔦'],
  '기타': ['📰', '🗞️', '📺', '📻', '📡', '🔊', '📢', '📣', '📯', '🔔', '🎁', '🎉', '🏆', '🥇', '🎖️', '🏅'],
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0])

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES).flat().filter(emoji => emoji.includes(search))
    : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* 현재 선택된 이모티콘 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-3xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center bg-white dark:bg-gray-900 transition-colors"
      >
        {value || '이모티콘 선택'}
      </button>

      {/* 이모티콘 선택 팝업 */}
      {isOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 팝업 */}
          <div className="absolute z-50 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
            {/* 헤더 */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">이모티콘 선택</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 검색 */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="이모티콘 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 카테고리 탭 */}
            {!search && (
              <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-thin">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* 이모티콘 그리드 */}
            <div className="p-3 max-h-64 overflow-y-auto">
              {filteredEmojis && filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-2">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => {
                        onChange(emoji)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`text-2xl hover:bg-blue-100 dark:hover:bg-blue-900 rounded p-2 transition-colors ${
                        value === emoji ? 'bg-blue-200 dark:bg-blue-800' : ''
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  이모티콘을 찾을 수 없습니다
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                선택 완료
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
