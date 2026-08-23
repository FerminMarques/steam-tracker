const id = '3812600'
const paths = [
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_184x69.jpg`,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_sm_120.jpg`,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_231x87.jpg`,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/hero_capsule.jpg`,
]
for (const u of paths) {
  try {
    const r = await fetch(u)
    console.log(r.status, '|', r.headers.get('content-type'), '|', u.split('/').pop())
  } catch { console.log('FAIL |', u) }
}
