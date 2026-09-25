const chromium = require('@sparticuz/chromium').default
const puppeteer = require('puppeteer-core')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: 'shell',
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1300, height: 950 })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 })
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('studyflow.v1') || '{}')
    s.settings = { ...(s.settings || {}), lang: 'ar', theme: 'dark', dailyGoalMinutes: 90, userName: '' }
    localStorage.setItem('studyflow.v1', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(600)

  // open upload → load demo lecture
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const up = btns.find((b) => b.textContent.includes('رفع محاضرة'))
    if (up) up.click()
  })
  await sleep(400)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const demo = btns.find((b) => b.textContent.includes('تجريبية'))
    if (demo) demo.click()
  })
  await sleep(3500) // analyzing + navigate
  await page.screenshot({ path: 'shot-ar-overview.png' })

  const tabs = ['المستويات', 'جمل التذكّر', 'اختبار', 'وضع الاختبار', 'ورقة الغش', 'المعلّم الذكي', 'الاسترجاع']
  for (const t of tabs) {
    await page.evaluate((label) => {
      const tab = [...document.querySelectorAll('.tabs .tab')].find((x) => x.textContent.includes(label))
      if (tab) tab.click()
    }, t)
    await sleep(700)
    const slug = { 'المستويات': 'levels', 'جمل التذكّر': 'mnemonics', 'اختبار': 'quiz', 'وضع الاختبار': 'exam', 'ورقة الغش': 'sheet', 'المعلّم الذكي': 'tutor', 'الاسترجاع': 'recall' }[t]
    await page.screenshot({ path: `shot-ar-${slug}.png` })
  }
  console.log('done')
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
