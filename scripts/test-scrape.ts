import axios from 'axios'

const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  Cookie: STEAM_COOKIES
}

// Metaphor: ReFantazio appid 2679460
const res = await axios.get('https://steamcommunity.com/app/2679460/guides/?searchText=horse', {
  headers: HEADERS,
  maxRedirects: 5
})
const html: string = res.data

// find filedetails guide links
const links = [...html.matchAll(/href="(https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=\d+)"/g)].map(m => m[1])
console.log('status:', res.status, 'len:', html.length)
console.log('guide links found:', [...new Set(links)].slice(0, 3))

const first = [...new Set(links)][0]
if (!first) {
  console.log('--- no links; page snippet ---')
  console.log(html.substring(0, 2000))
} else {
  const g = await axios.get(first, { headers: HEADERS, maxRedirects: 5 })
  const gh: string = g.data
  console.log('guide status:', g.status, 'len:', gh.length)
  console.log('has subSection:', gh.includes('subSection'))
  console.log('has subSectionTitle:', gh.includes('subSectionTitle'))
  console.log('has subSectionDesc:', gh.includes('subSectionDesc'))
  console.log('has agegate:', gh.includes('View Community Hub'))
  const i = gh.indexOf('subSection')
  if (i > 0) console.log('--- around first subSection ---\n' + gh.substring(i - 200, i + 600))
}
