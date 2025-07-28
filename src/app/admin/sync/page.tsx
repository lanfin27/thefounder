import AdminSyncClient from './AdminSyncClient'

// Server component that can access environment variables
export default function AdminSyncPage() {
  // Access environment variables on the server
  const notionDatabaseId = process.env.NOTION_DATABASE_ID || 'Not configured'
  const hasNotionToken = !!process.env.NOTION_TOKEN
  const hasAdminToken = !!process.env.ADMIN_TOKEN
  
  // Mask the database ID for security (show first 8 chars)
  const maskedDatabaseId = notionDatabaseId === 'Not configured' 
    ? notionDatabaseId 
    : `${notionDatabaseId.slice(0, 8)}...`
  
  const config = {
    notionDatabaseId: maskedDatabaseId,
    hasNotionToken,
    hasAdminToken,
  }
  
  return <AdminSyncClient config={config} />
}