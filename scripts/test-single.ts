import axios from 'axios'

const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'
const url = process.argv[2] ?? 'https://steamcommunity.com/sharedfiles/filedetails/?id=3354003946'
try {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: STEAM_COOKIES },
    maxRedirects: 5,
    validateStatus: () => true
  })
  console.log('status:', res.status)
  const html: string = res.data
  console.log('len:', html.length)
  console.log('has subSectionTitle:', html.includes('subSectionTitle'))
  console.log('is agegate:', html.includes('View Community Hub'))
  console.log('error page:', html.includes('algo salió mal') || html.includes('error occurred'))
} catch (e: any) {
  console.log('EXCEPTION:', e.message, e.response?.status)
}
