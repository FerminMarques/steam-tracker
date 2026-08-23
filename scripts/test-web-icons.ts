import axios from 'axios'

const res = await axios.get('https://steamcommunity.com/stats/381210/achievements', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0' },
  timeout: 15000
})
const html: string = res.data
// achievement icons specifically: look inside achAchievementBlock / img with "apps" in path
const srcs = [...html.matchAll(/src="(https?:\/\/[^"]*\/apps\/\d+\/[a-f0-9]{16,}\.(?:jpg|png))"/g)].map((m) => m[1])
console.log('achievement icons found:', srcs.length)
;[...new Set(srcs)].slice(0, 3).forEach((s) => console.log(' ', s))
if (srcs[0]) {
  const r = await fetch(srcs[0])
  console.log('check:', r.status, r.headers.get('content-type'))
}
