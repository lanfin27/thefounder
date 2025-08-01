'use client'

import { Search } from 'lucide-react'
import { useSearch } from '@/contexts/SearchContext'

export function SearchButton() {
  const { openSearch } = useSearch()
  
  return (
    <button
      onClick={openSearch}
      className="p-2 hover:bg-medium-gray rounded-full transition-colors duration-medium"
      title="글 검색 (Ctrl+K)"
    >
      <Search className="w-5 h-5 text-medium-black-secondary" />
    </button>
  )
}