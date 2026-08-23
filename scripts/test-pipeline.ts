import axios from 'axios'
import { fetchGuideContent } from '../src/main/scrape'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Accept-Language': 'en-US,en;q=0.5'
}

const query = 'Metaphor ReFantazio horse achievement guide'
let html = ''
for (const endpoint of ['https://html.duckduckgo.com/html/', 'https://lite.duckduckgo.com/lite/']) {
  try {
    const res = await axios.get(endpoint, { params: { q: query }, headers: HEADERS, timeout: 8000 })
    html = res.data
    if (html.includes('result__a') || html.includes('result-link')) break
  } catch (e: any) {
    console.log('endpoint failed:', endpoint, e.message)
  }
}
console.log('ddg html len:', html.length)

const aTagRe = /<a\s[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g
let m: RegExpExecArray | null
const urls: string[] = []
while ((m = aTagRe.exec(html)) !== null && urls.length < 6) {
  const hrefMatch = m[0].match(/href="([^"]+)"/)
  if (!hrefMatch) continue
  const uddgMatch = hrefMatch[1].match(/uddg=([^&"]+)/)
  if (!uddgMatch) continue
  const realUrl = decodeURIComponent(uddgMatch[1].replace(/&amp;/g, '&'))
  urls.push(realUrl)
}
console.log('DDG result URLs:')
urls.forEach(u => console.log(' -', u))

for (const u of urls.slice(0, 4)) {
  const r = await fetchGuideContent(u, '', true)
  console.log('\n==>', u)
  console.log('   success:', r.success, '| content len:', r.content.length)
  console.log('   first 200:', JSON.stringify(r.content.substring(0, 200)))
}
