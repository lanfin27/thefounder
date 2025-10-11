export function truncateContent(content: string, wordLimit: number = 300): string {
  // Remove HTML tags for accurate word counting
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Split into words
  const words = textContent.split(' ')
  
  if (words.length <= wordLimit) {
    return content
  }

  // Find the position to truncate in the original HTML content
  let wordCount = 0
  let charIndex = 0
  let inTag = false
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    
    if (char === '<') {
      inTag = true
    } else if (char === '>') {
      inTag = false
    } else if (!inTag && /\s/.test(char)) {
      // Check if we've reached a word boundary
      const precedingText = content.substring(charIndex, i).trim()
      if (precedingText) {
        wordCount++
        if (wordCount >= wordLimit) {
          // Find the end of the current sentence or paragraph
          let endIndex = i
          for (let j = i; j < content.length && j < i + 200; j++) {
            if (content[j] === '.' || content[j] === '!' || content[j] === '?') {
              endIndex = j + 1
              break
            }
            if (content.substring(j, j + 4) === '</p>') {
              endIndex = j + 4
              break
            }
          }
          
          return content.substring(0, endIndex)
        }
      }
      charIndex = i + 1
    }
  }
  
  return content
}

export function countWords(content: string): number {
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return textContent.split(' ').filter(word => word.length > 0).length
}

export function calculateReadingTime(content: string, wordsPerMinute: number = 200): number {
  const wordCount = countWords(content)
  return Math.ceil(wordCount / wordsPerMinute)
}

export function extractFirstParagraphs(content: string, paragraphCount: number = 3): string {
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs) || []
  return paragraphs.slice(0, paragraphCount).join('\n')
}