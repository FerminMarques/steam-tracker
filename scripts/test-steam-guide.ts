import axios from 'axios'

const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'
const res = await axios.get('https://steamcommunity.com/sharedfiles/filedetails/?id=3354003946', {
  headers: { 'User-Agent': 'Mozilla/5.0', Cookie: STEAM_COOKIES },
  maxRedirects: 5
})
const html: string = res.data

// count occurrences
for (const cls of ['subSection"', "subSectionTitle", "subSectionDesc", 'guide subSections']) {
  console.log(cls, '→', (html.match(new RegExp(cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')) || []).length)
}

const i = html.indexOf('subSectionTitle')
console.log('\n--- around subSectionTitle ---')
console.log(html.substring(i - 300, i + 900))

const j = html.indexOf('subSectionDesc')
console.log('\n--- around subSectionDesc ---')
console.log(html.substring(j - 100, j + 800))
