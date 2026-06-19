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
        const relative = path.relative(baseDir, fullPath)
        const depth = relative.split(path.sep).length
        if (depth <= 3) {
          scanDir(fullPath)
        }
      } else if (file.startsWith('hardhat.config.')) {
        const content = fs.readFileSync(fullPath, 'utf8')
        console.log(`Found ${fullPath}:`)
        console.log(content)
        console.log('--------------------------------------------')
      }
    }
  } catch (err) {
    // ignore
  }
}

scanDir(baseDir)
console.log('Scan complete.')
