import { BlogPost } from '@/types';

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

export function parsePostContent(post: BlogPost): {
  title: string;
  excerpt: string;
} {
  const MAX_EXCERPT_LENGTH = 70;

  // excerpt 길이 제한 함수 (1차 안전장치)
  const truncateExcerpt = (text: string): string => {
    if (!text) return '';
    if (text.length <= MAX_EXCERPT_LENGTH) return text;
    return text.substring(0, MAX_EXCERPT_LENGTH).trim() + '...';
  };

  // Case 1: summary 필드가 이미 있는 경우
  if (post.summary && post.summary.trim()) {
    return {
      title: post.title,
      excerpt: truncateExcerpt(post.summary.trim())
    };
  }

  const titleText = post.title;

  // Case 2: 줄바꿈으로 분리 시도
  const lines = titleText.split('\n').filter(line => line.trim());
  if (lines.length > 1) {
    const excerptText = lines.slice(1).join(' ').trim();
    return {
      title: lines[0].trim(),
      excerpt: truncateExcerpt(excerptText)
    };
  }

  // Case 3: 제목에 마침표(.)가 있는 경우 분리
  // 예: "성공하고 싶으면 거절해. 트위터 창업자, 에반 윌리엄스"
  // -> 제목: "성공하고 싶으면 거절해"
  // -> 발췌: "트위터 창업자, 에반 윌리엄스"
  const dotIndex = titleText.indexOf('.');
  if (dotIndex !== -1 && dotIndex < titleText.length - 1) {
    const possibleTitle = titleText.substring(0, dotIndex + 1).trim();
    const possibleExcerpt = titleText.substring(dotIndex + 1).trim();

    // 발췌문이 너무 짧으면(예: ".txt") 분리하지 않음
    if (possibleExcerpt.length > 5) {
      return {
        title: possibleTitle,
        excerpt: truncateExcerpt(possibleExcerpt)
      };
    }
  }

  // Case 4: 제목에 ' - ' 구분자가 있는 경우
  // 예: "군중은 멍청하다 - 피터 틸"
  const dashIndex = titleText.indexOf(' - ');
  if (dashIndex !== -1) {
    return {
      title: titleText.substring(0, dashIndex).trim(),
      excerpt: truncateExcerpt(titleText.substring(dashIndex + 3).trim())
    };
  }

  // Case 5: 분리할 수 없는 경우 (제목만 있음)
  return {
    title: titleText,
    excerpt: ''
  };
}