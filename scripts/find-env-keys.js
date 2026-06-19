import fs from 'fs'
import path from 'path'

const baseDir = 'e:\\Airdrop ARC\\The Stablecoins Commerce Stack Challenge'

function scanDir(dir) {
  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        // Only recurse a few levels to avoid deep searches
        const relative = path.relative(baseDir, fullPath)
        const depth = relative.split(path.sep).length
        if (depth <= 3) {
          scanDir(fullPath)
        }
      } else if (file === '.env') {
        const content = fs.readFileSync(fullPath, 'utf8')
        console.log(`Found .env in ${fullPath}:`)
        const lines = content.split('\n')
        for (const line of lines) {
          if (line.includes('KEY') || line.includes('SECRET') || line.includes('PRIVATE') || line.includes('API') || line.includes('STABLEFX')) {
            console.log(`  ${line.trim()}`)
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

scanDir(baseDir)
console.log('Scan complete.')
