const chromium = require('@sparticuz/chromium').default
const puppeteer = require('puppeteer-core')

async function main() {
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: 'shell',
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1300, height: 920 })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 })
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('studyflow.v1') || '{}')
    s.settings = { ...(s.settings || {}), lang: 'ar', theme: 'dark', dailyGoalMinutes: 90, userName: '' }
    localStorage.setItem('studyflow.v1', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 900))
  await page.screenshot({ path: 'shot-dash-ar.png' })
  const info = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    nav: [...document.querySelectorAll('.nav-item')].map((n) => n.textContent.trim()),
    h1: document.querySelector('h1') && document.querySelector('h1').textContent,
    bodyDir: getComputedStyle(document.body).direction,
  }))
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
