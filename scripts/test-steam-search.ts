import axios from 'axios'

const COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'
const res = await axios.get('https://steamcommunity.com/app/2679460/guides/', {
  params: { searchText: 'Allies United' },
  headers: { 'User-Agent': 'Mozilla/5.0', Cookie: COOKIES },
  timeout: 15000
})
const html: string = res.data
console.log('len:', html.length)
console.log('searchResultRow count:', (html.match(/searchResultRow/g) || []).length)

// dump first result row structure
const i = html.indexOf('searchResultRow')
console.log('--- first row (1400 chars) ---')
console.log(html.substring(i - 50, i + 1400).replace(/\t/g, ' '))
