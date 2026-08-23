import { join } from 'path'
import { store } from '../src/main/store'
import { getAchievements } from '../src/main/steam'

store.init(join(process.env.APPDATA!, 'steam-tracker'))
const res = await getAchievements('3812600')
if (!res.data) {
  console.log('ERROR:', res.error)
} else {
  console.log('achievements:', res.data.length)
  const a = res.data[0]
  console.log('icon:', a.icon)
  console.log('gray:', a.iconGray)
  // verify both URLs actually load
  for (const u of [a.icon, a.iconGray]) {
    try {
      const r = await fetch(u)
      console.log(r.status, r.headers.get('content-type'), u.split('/').pop())
    } catch (e: any) {
      console.log('FAIL', e.message)
    }
  }
}
