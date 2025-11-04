// Mock data - 실제로는 Supabase나 API에서 가져옴
const mockPosts = [
  {
    id: '1',
    title: '[책] 위대한 창업가를 만드는 30가지 조언',
    slug: 'great-founder-30-tips',
    excerpt: '성공한 창업가들의 공통된 습관과 마인드셋',
    category: '트렌드',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
    published_at: '2025년 6월 9일',
    content: '위대한 창업가가 되기 위한 30가지 핵심 조언...'
  },
  {
    id: '2',
    title: '직접 만든 냅킨GPT "김냅맨"에게 질문해주세요',
    slug: 'napkin-gpt',
    excerpt: '개인화된 AI 도구 만들기',
    category: '블로그',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    published_at: '2025년 3월 5일',
    content: 'GPT를 활용한 맞춤형 AI 어시스턴트 개발...'
  },
  {
    id: '3',
    title: '코딩은 AI가 한다, 그럼 창업자는 뭘 해야 하나',
    slug: 'ai-age-founder',
    excerpt: 'AI 시대의 창업자 역할',
    category: '인사이트',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    published_at: '2025년 8월 14일',
    content: 'AI가 코딩을 대체하는 시대, 창업자의 새로운 역할...'
  },
  {
    id: '4',
    title: '모두가 글로벌을 외치지만 한국의 자동차 금융 시장에 기회가 있습니다!',
    slug: 'korea-auto-finance',
    excerpt: '국내 시장의 숨겨진 기회',
    category: '사례',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
    published_at: '2025년 1월 17일',
    content: '한국 자동차 금융 시장의 현황과 기회...'
  },
  {
    id: '5',
    title: '혼돈의 KPOP 산업, 답은 어디에 있을까?',
    slug: 'kpop-industry',
    excerpt: 'K-POP 시장 구조 분석',
    category: '사례',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    published_at: '2025년 1월 17일',
    content: 'KPOP 산업의 구조적 문제와 해결책...'
  },
];

export async function searchPosts(query: string) {
  // 실제 구현에서는 Supabase 쿼리 사용
  // const { data } = await supabase
  //   .from('posts')
  //   .select('*')
  //   .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
  //   .limit(20);

  // Mock 검색 (제목, 내용, excerpt에서 검색)
  const searchLower = query.toLowerCase();
  
  const results = mockPosts.filter(post => 
    post.title.toLowerCase().includes(searchLower) ||
    post.content.toLowerCase().includes(searchLower) ||
    post.excerpt?.toLowerCase().includes(searchLower)
  );

  // 검색 delay 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 300));

  return results;
}
