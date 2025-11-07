import { redirect } from 'next/navigation'

export default function LibraryPage() {
  // Default redirect to lists
  redirect('/library/lists')
}
