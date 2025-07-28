// Test slug generation
const { generateKoreanSlug } = require('./src/lib/utils/korean-slug');

const testTitles = [
  "스타트업 창업자가 알아야 할 5가지 법칙",
  "SaaS 비즈니스 모델 가이드 for Beginners",
  "디지털 마케팅 전략",
  "AI 시대의 프로덕트 개발",
  "블록체인 기술의 미래"
];

console.log("Testing slug generation:\n");

testTitles.forEach(title => {
  const slug = generateKoreanSlug(title);
  console.log(`Title: ${title}`);
  console.log(`Slug:  ${slug}`);
  console.log(`URL:   /posts/${slug}`);
  console.log("---");
});