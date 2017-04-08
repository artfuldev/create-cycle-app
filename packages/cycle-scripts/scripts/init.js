'use strict'

const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const spawn = require('cross-spawn')
const initQuestions = require('./utils/initQuestions')
// Ask the user for which language and which stream library he want to use
const flavors = require('../configs/flavors')
const dependencies = flavors.dependencies
const replacements = flavors.replacements

// function patchGitignore (appPath) {
//   // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
//   // See: https://github.com/npm/npm/issues/1862
//   const gitignorePath = path.join(appPath, 'gitignore')
//   const dotGitignorePath = path.join(appPath, '.gitignore')
//   fs.move(gitignorePath, dotGitignorePath, [], (err) => {
//     if (err) {
//       // Append if there's already a `.gitignore` file there
//       if (err.code === 'EEXIST') {
//         const content = fs.readFileSync(gitignorePath)
//         fs.appendFileSync(dotGitignorePath, content)
//         fs.unlinkSync(gitignorePath)
//       } else {
//         throw err
//       }
//     }
//   })
// }

function successMsg (appName, appPath) {
  console.log()
  console.log(`Success! Created ${appName} at ${appPath}`)
  console.log('Inside that directory, you can run several commands:')
  console.log()
  console.log(chalk.cyan('  npm start'))
  console.log('    Starts the development server')
  console.log()
  console.log(chalk.cyan('  npm test'))
  console.log('    Start the test runner')
  console.log()
  console.log(chalk.cyan('  npm run build'))
  console.log('    Bundles the app into static files for production')
  console.log()
  console.log(chalk.cyan('  npm run eject'))
  console.log('    Removes this tool and copies build dependencies, configuration files')
  console.log('    and scripts into the app directory. If you do this, you can\'t go back!')
  console.log()
  console.log('We suggest that you begin by typing:')
  console.log()
  console.log(chalk.cyan(`  cd ${appName}`))
  console.log(chalk.cyan('  npm start'))
  console.log()
  console.log('If you have questions, issues or feedback about Cycle.js and create-cycle-app, please, join us on the Gitter:')
  console.log()
  console.log(chalk.cyan('  https://gitter.im/cyclejs/cyclejs'))
  console.log()
  console.log('Happy cycling!')
  console.log()
}

function setup (appPath, appName, verbose, originalDirectory, options) {
  const ownPackageName = require(path.join(__dirname, '..', 'package.json')).name
  const ownPath = path.join(appPath, 'node_modules', ownPackageName)
  const appPackageJson = path.join(appPath, 'package.json')
  const appPackage = require(appPackageJson)

  const language = options.language
  const streamLib = options.streamLib

  const basicDependencies = dependencies.basics
  const languageDependencies = dependencies.language[language]
  const streamLibDependencies = dependencies.streamLib[streamLib]

  const depsToInstall = basicDependencies.concat(languageDependencies).concat(streamLibDependencies)

   // Manipulate app's package.json
  // To be moved to separate module
  appPackage.dependencies = appPackage.dependencies || {}
  appPackage.devDependencies = appPackage.devDependencies || {}
  appPackage.scripts = {
    'start': 'cycle-scripts start',
    'test': 'cycle-scripts test',
    'build': 'cycle-scripts build',
    'eject': 'cycle-scripts eject'
  }

  appPackage['create-cycle-app'] = options

  fs.writeFileSync(
    appPackageJson,
    JSON.stringify(appPackage, null, 2)
  )

  // Copy flavor files
  // fs.copySync(path.join(ownPath, 'template'), appPath)

  fs.ensureDirSync(path.join(appPath, 'public'))
  fs.copySync(path.join(ownPath, 'template/public'), path.join(appPath, 'public'))

  // copy src and transform each of the file
  fs.ensureDirSync(path.join(appPath, 'src'))
  const templatePath = path.join(ownPath, 'template/src', language)
  fs.readdir(templatePath, (err, files) => {
    if (err) {
      throw err
    }
    files.forEach(file => {
      const targetPath = path.join(appPath, 'src', file)
      const fileSrc = require(path.join(templatePath, file))
      const targetSrc = fileSrc(replacements[streamLib])
      fs.outputFile(targetPath, targetSrc)
    })
  })

  fs.copySync(path.join(ownPath, 'template/src', language), path.join(appPath, 'src'))

  // TODO
  // patchGitignore(appPath)

  const dependecyList = depsToInstall
    .slice(0, (depsToInstall.length - 1))
    .join(', ')
    .concat(` and ${depsToInstall.slice(-1)}`)

  console.log(`Installing ${dependecyList} using npm...`)
  console.log()

  const args = [
    'install'
  ].concat(
    depsToInstall
  ).concat([
    '--save',
    verbose && '--verbose'
  ]).filter(Boolean)

  var proc = spawn('npm', args, {stdio: 'inherit'})
  proc.on('close', function (code) {
    if (code !== 0) {
      console.error(chalk.red('`npm ' + args.join(' ') + '` failed'))
      return
    }
    successMsg(appName, appPath)
  })
}

module.exports = function init (appPath, appName, verbose, originalDirectory, options) {
  if (options) {
    return setup(appPath, appName, verbose, originalDirectory, options)
  }
  return initQuestions(answers => setup(appPath, appName, verbose, originalDirectory, answers))
}
