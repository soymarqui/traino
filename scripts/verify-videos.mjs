// Verifica cada video via oEmbed de YouTube (embebible + horizontal) y genera
// un .sql con los UPDATE de los que pasan. Uso: node scripts/verify-videos.mjs
import { writeFileSync } from 'node:fs'

const ITEMS = [
  { id: '995fe9f7-18e8-4dff-8232-684a7d63ad5a', url: 'https://www.youtube.com/watch?v=5PZuTzbAhhE' },
  { id: '12520ab9-bc54-4cb9-a89e-75d59d11fc48', url: 'https://www.youtube.com/watch?v=ZdAHe9_HeEw' },
  { id: '51349c8f-6a42-4cda-a280-b98d5e8f91bb', url: 'https://www.youtube.com/watch?v=ToJeyhydUxU' },
  { id: '497be70e-753d-47b6-ad2e-39eb415bf60d', url: 'https://www.youtube.com/watch?v=3eqodmkpkfA' },
  { id: '1191e83a-890c-401b-ae5a-9e5a6f243f23', url: 'https://www.youtube.com/watch?v=SuIxXbKnwx4' },
  { id: '3dcaa3cb-8bbf-4026-adcb-ad2e8b67a50c', url: 'https://www.youtube.com/watch?v=E94UNm8fD-4' },
  { id: 'a9c18fcf-841e-4e76-867f-6bacbef26a85', url: 'https://www.youtube.com/watch?v=_2xWmYNnFS8' },
  { id: 'a852c5b5-f470-4606-a3fa-74004b1926c0', url: 'https://www.youtube.com/watch?v=ASdvN_XEl_c' },
  { id: '9ddc0794-c7a8-442a-b369-ab525e8392d7', url: 'https://www.youtube.com/watch?v=iNbH7_edNI8' },
  { id: '3cfbd18e-971f-47c1-b3b5-8bdb7c4cca90', url: 'https://www.youtube.com/watch?v=fPxO-FA8acM' },
  { id: '892a18c6-cffc-4e90-93a8-0dcafd2b5960', url: 'https://www.youtube.com/watch?v=RjIEXtVuRNo' },
  { id: 'c566e431-6d6e-4083-8784-c4986e814933', url: 'https://www.youtube.com/watch?v=QZEqB6wUPxQ' },
  { id: 'fcd3d055-a32c-422c-b612-74892dbfc721', url: 'https://www.youtube.com/watch?v=16aEi1a68E0' },
  { id: 'a41569f9-435a-43d8-a5a3-4abb39ecea96', url: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
  { id: 'f1562327-9f29-435a-8074-8bf0ca96be01', url: 'https://www.youtube.com/watch?v=2-LAMcpzODU' },
  { id: '885f4c41-9495-402e-8d2d-ff5eed18058a', url: 'https://www.youtube.com/watch?v=sM6XUdt1rm4' },
  { id: '6450ac9c-a107-4290-912f-db819e69643d', url: 'https://www.youtube.com/watch?v=6SS6K3lAwZ8' },
  { id: '57e6f540-1b74-432f-abf8-6899d7fd6fc8', url: 'https://www.youtube.com/watch?v=RavQHfFxbdA' },
  { id: 'f1c44733-116b-4cba-b0c2-7fd192824103', url: 'https://www.youtube.com/watch?v=g8x9ck225ZE' },
  { id: '494a2876-b4a5-4133-a91e-d15517171b45', url: 'https://www.youtube.com/watch?v=p5dCqF7wWUw' },
  { id: 'af59f467-6d1c-4885-8950-848423944d34', url: 'https://www.youtube.com/watch?v=0tn5K9NlCfo' },
  { id: '4fde88ee-c5d8-457f-9359-81d606123658', url: 'https://www.youtube.com/watch?v=y-wV4Venusw' },
  { id: '7a05c4c1-837e-43c0-b50d-531bfff16ec4', url: 'https://www.youtube.com/watch?v=4ZDm5EbiFI8' },
  { id: 'eee362a8-8034-4a1f-98c8-903201b71b80', url: 'https://www.youtube.com/watch?v=0Syp9iyINZ4' },
  { id: 'e459a8e9-a6c0-4d09-951e-91e2b392fec5', url: 'https://www.youtube.com/watch?v=48qAxTToa44' },
  { id: 'e5d426e5-447c-4496-af82-e9dd3ee554d2', url: 'https://www.youtube.com/watch?v=SbSNUXPRkc8' },
  { id: 'f328c609-32b3-47f5-9054-b1cf34da2542', url: 'https://www.youtube.com/watch?v=ScqpbvOZWe8' },
  { id: '7ab7775d-38e3-4af7-9f35-e395550e32fa', url: 'https://www.youtube.com/watch?v=pBH7pKHn-dI' },
  { id: 'f3d7a0de-d888-4681-8d4a-5f2d609f81fb', url: 'https://www.youtube.com/watch?v=ylpfCk3i-0Y' },
  { id: '5759d7c1-c6e3-43aa-a959-5aa91c821e75', url: 'https://www.youtube.com/watch?v=ylVmNQlKdAI' },
  { id: 'f6d2ac8c-2f0c-4bba-83d2-ddbce04872c8', url: 'https://www.youtube.com/watch?v=aYPEH4WRo9Q' },
  { id: '1367c39f-cd38-4b77-aac2-a0236fee4807', url: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
  { id: '7079dea3-4aa3-44ad-8fd2-1d11251373f3', url: 'https://www.youtube.com/watch?v=9efgcAjQe7E' },
  { id: '691d0e51-3d06-41af-928e-c8d64c2e6ecf', url: 'https://www.youtube.com/watch?v=UCXxvVItLoM' },
  { id: 'd8f25254-b99d-4256-b47f-e0d0219eb21a', url: 'https://www.youtube.com/watch?v=oDKu4Y-hQtA' },
  { id: '2fdd11da-50fa-4b7a-9f39-512f1eb50246', url: 'https://www.youtube.com/watch?v=wAddpEKrH8w' },
  { id: '7c9c5393-7eb2-45f6-ac10-dc0217f78a72', url: 'https://www.youtube.com/watch?v=2yjwXTZQDDI' },
  { id: '1f33ad8a-3f05-4c96-bb3b-a955ae47a55d', url: 'https://www.youtube.com/watch?v=qEwKCR5JCog' },
  { id: '45819010-39ca-47b8-b828-65cc16771a71', url: 'https://www.youtube.com/watch?v=3R14MnZbcpw' },
  { id: '145a212d-ea52-47d1-ad12-c5724d2a6590', url: 'https://www.youtube.com/watch?v=qitQHqNZbeM' },
  { id: '276aba00-0fe6-4f50-8d10-b96f5baade92', url: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
  { id: 'c247e8b9-941e-4361-acc0-a4be3e98ab46', url: 'https://www.youtube.com/watch?v=eQ_NBB6OBH4' },
  { id: '9950452c-446e-4f7f-8f96-3770557b0156', url: 'https://www.youtube.com/watch?v=PV9Q25gK6Zc' },
  { id: '9a284e43-8d1a-4d09-afd0-64e05a43f68e', url: 'https://www.youtube.com/watch?v=H4mVGHaK2f4' },
  { id: '92340a5a-f5e1-4862-9d86-0651b475444b', url: 'https://www.youtube.com/watch?v=Y_7aHqXeCfQ' },
  { id: 'aa327232-7f65-4cd4-8014-b13a812162ed', url: 'https://www.youtube.com/watch?v=ig0NyNlSce4' },
  { id: 'd052832f-548c-49c4-80e2-ed12e65fe0d1', url: 'https://www.youtube.com/watch?v=SrqOu55lrYU' },
  { id: '7b86a7cb-befc-48e9-ac7e-6875e9c14ef0', url: 'https://www.youtube.com/watch?v=VmB1G1K7v94' },
  { id: 'befa3eab-ff7a-4a4c-905b-1155088307dc', url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
]

const pass = []
const fail = []
for (const it of ITEMS) {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(it.url)}&format=json`
  try {
    const r = await fetch(oembed)
    if (!r.ok) { fail.push({ ...it, why: `http ${r.status}` }); continue }
    const j = await r.json()
    if (j.width > j.height) pass.push({ ...it, title: j.title, ch: j.author_name })
    else fail.push({ ...it, why: `vertical ${j.width}x${j.height}` })
  } catch (e) {
    fail.push({ ...it, why: String(e) })
  }
}

console.log(`PASS ${pass.length} / ${ITEMS.length}`)
pass.forEach((p) => console.log(`  ok  ${p.ch} — ${p.title}`))
console.log(`FAIL ${fail.length}`)
fail.forEach((f) => console.log(`  XX  ${f.id} ${f.url} (${f.why})`))

const sql =
  '-- Videos de demostración (YouTube horizontal, verificados via oEmbed).\n' +
  pass.map((p) => `update public.exercises set video_url = '${p.url}' where id = '${p.id}';`).join('\n') +
  '\n'
writeFileSync(new URL('../supabase/migrations/20260630140000_exercise_videos.sql', import.meta.url), sql)
console.log('SQL escrito.')
