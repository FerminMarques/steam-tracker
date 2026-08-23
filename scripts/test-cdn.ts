const hash = 'f1104a071ccbfd8ef6717b26462c53515ab7270e.jpg' // ReStory schema icon
const appid = '3812600'
const candidates = [
  `http://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appid}/${hash}`,
  `https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/${appid}/${hash}`,
  `https://shared.fastly.steamstatic.com/community_assets/images/apps/${appid}/${hash}`,
  `https://community.fastly.steamstatic.com/steamcommunity/public/images/apps/${appid}/${hash}`,
]
for (const u of candidates) {
  try {
    const r = await fetch(u)
    console.log(r.status, '|', r.headers.get('content-type'), '|', u.slice(8, 65))
  } catch (e: any) {
    console.log('FAIL |', e.message)
  }
}

// Also: what does ReStory look like on the achievements web page?
import axios from 'axios'
const res = await axios.get(`https://steamcommunity.com/stats/${appid}/achievements`, {
  headers: { 'User-Agent': 'Mozilla/5.0' },
  timeout: 15000
})
const srcs = [...(res.data as string).matchAll(/src="(https?:\/\/[^"]*\/apps\/\d+\/[a-f0-9]{16,}\.(?:jpg|png))"/g)].map((m) => m[1])
console.log('\nweb icons for ReStory:', [...new Set(srcs)].slice(0, 3))
