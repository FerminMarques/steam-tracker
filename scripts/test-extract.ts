import axios from 'axios'
import { fetchGuideContent } from '../src/main/scrape'

const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'

// Test multiple real guides from different games
const urls = [
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3354003946', // Metaphor
]

// also grab a few guides from another game to be safe
const listRes = await axios.get('https://steamcommunity.com/app/292030/guides/?searchText=achievement', {
  headers: { 'User-Agent': 'Mozilla/5.0', Cookie: STEAM_COOKIES }
})
const links = [...new Set([...listRes.data.matchAll(/href="(https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=\d+)"/g)].map((m: any) => m[1]))] as string[]
urls.push(...links.slice(0, 3))

for (const u of urls) {
  const r = await fetchGuideContent(u, '', true)
  console.log('\n==>', u)
  console.log('   success:', r.success, '| len:', r.content.length)
  console.log('   first 300:', JSON.stringify(r.content.substring(0, 300)))
}
