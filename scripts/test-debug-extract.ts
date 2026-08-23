import axios from 'axios'

const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'
const res = await axios.get('https://steamcommunity.com/sharedfiles/filedetails/?id=3354003946', {
  headers: { 'User-Agent': 'Mozilla/5.0', Cookie: STEAM_COOKIES },
  maxRedirects: 5
})
const html: string = res.data

// Step 1: does the main section regex match?
const sectionRe = /<div\s+class="subSection[^"]*"[^>]*>([\s\S]*?)(?=<div\s+class="subSection|<\/div>\s*<\/div>\s*<\/div>)/gi
let sm: RegExpExecArray | null
let count = 0
while ((sm = sectionRe.exec(html)) !== null && count < 3) {
  count++
  console.log(`--- section ${count} (block len ${sm[1].length}) ---`)
  const block = sm[1]
  const titleM = block.match(/<div\s+class="subSectionTitle[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
  console.log('   title:', titleM ? JSON.stringify(titleM[1].trim().substring(0, 50)) : 'NOT FOUND')
  const bodyM = block.match(/<div\s+class="subSectionDesc[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
  console.log('   body:', bodyM ? `FOUND (${bodyM[1].length} chars): ${JSON.stringify(bodyM[1].trim().substring(0, 120))}` : 'NOT FOUND')
}
console.log('total sections matched:', count)

// Step 2: what about the fallback?
const bodyMatch = html.match(/<div\s+class="guide[^"]*subSections[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
console.log('\nfallback match:', bodyMatch ? `${bodyMatch[1].length} chars` : 'none')
if (bodyMatch) {
  const stripped = bodyMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
  console.log('fallback stripped first 200:', JSON.stringify(stripped.substring(0, 200)))
}

// Step 3: where does "Overview" appear?
const ov = html.indexOf('Overview')
console.log('\nfirst "Overview" at:', ov)
if (ov > 0) console.log(html.substring(ov - 250, ov + 100).replace(/\t/g, ''))
