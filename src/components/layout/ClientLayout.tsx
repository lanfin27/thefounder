'use client'

import { ReactNode } from 'react'
import { SearchProvider } from '@/contexts/SearchContext'
import SearchModal from '@/components/search/SearchModal'
import { useSearch } from '@/contexts/SearchContext'

function SearchModalWrapper() {
  const { isSearchOpen, closeSearch } = useSearch()
  return <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      {children}
      <SearchModalWrapper />
    </SearchProvider>
  )
}