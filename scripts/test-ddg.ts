import axios from 'axios'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Accept-Language': 'en-US,en;q=0.5'
}
const res = await axios.get('https://html.duckduckgo.com/html/', {
  params: { q: 'Metaphor ReFantazio achievement guide' },
  headers: HEADERS,
  timeout: 8000
})
const html: string = res.data
console.log('len:', html.length)
console.log('has result__a:', html.includes('result__a'))
console.log('anomaly:', html.includes('anomaly'))
console.log('captcha:', html.includes('captcha') || html.includes('CAPTCHA'))
const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
console.log('text head:', t.substring(0, 300))
