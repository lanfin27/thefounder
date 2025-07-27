// Configuration for Notion API
export const notionConfig = {
  token: process.env.NOTION_TOKEN || '',
  databaseId: process.env.NOTION_DATABASE_ID || '',
}

// Client-safe configuration (without sensitive tokens)
export const getClientNotionConfig = () => {
  if (typeof window === 'undefined') {
    return {
      databaseId: '********',
      hasToken: false,
    }
  }
  
  return {
    databaseId: notionConfig.databaseId ? notionConfig.databaseId.slice(0, 8) + '...' : 'Not configured',
    hasToken: !!notionConfig.token,
  }
}