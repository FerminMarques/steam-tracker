import { fetchGuideContent } from '../src/main/scrape'

const r = await fetchGuideContent('https://nerdflakes.com/metaphor-refantazio-achievement-guide-complete-100-roadmap/', '', true)
console.log('success:', r.success, '| len:', r.content.length)
console.log('--- first 1200 chars ---')
console.log(r.content.substring(0, 1200))
