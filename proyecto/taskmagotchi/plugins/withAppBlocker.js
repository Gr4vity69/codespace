const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

// ── Kotlin source template ───────────────────────────────────────
// These are read from native/android/ at build time
function readNativeSource(filename) {
  const sourcePath = path.join(
    __dirname, '..', 'native', 'android', filename
  )
  return fs.readFileSync(sourcePath, 'utf8')
}

const TARGET_PACKAGE = 'com.taskmagotchi.app'
const TARGET_DIR = `app/src/main/java/${TARGET_PACKAGE.replace(/\./g, '/')}`

// ── Permissions to add ───────────────────────────────────────────
const PERMISSIONS = [
  'android.permission.QUERY_ALL_PACKAGES',
  'android.permission.PACKAGE_USAGE_STATS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  // Required for foreground service notification on Android 13+ (API 33+)
  'android.permission.POST_NOTIFICATIONS',
]

// ── Plugin ───────────────────────────────────────────────────────
function withAppBlocker(expoConfig) {
  // 1. Add Android permissions
  expoConfig = withAndroidManifest(expoConfig, (config) => {
    const manifest = config.modResults.manifest
    const mainApplication = manifest['application']?.[0]

    // Add permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = []
    }
    for (const perm of PERMISSIONS) {
      const exists = manifest['uses-permission'].some(
        (p) => p['$']['android:name'] === perm
      )
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        })
      }
    }

    // Add QUERY_ALL_PACKAGES to <application> for older SDK
    if (mainApplication) {
      mainApplication.$['android:queryAllPackages'] = 'true'
    }

    // Register BlockingService
    if (mainApplication && mainApplication['service']) {
      const serviceExists = mainApplication['service'].some(
        (s) => s['$']['android:name'] === '.BlockingService'
      )
      if (!serviceExists) {
        mainApplication['service'].push({
          $: {
            'android:name': '.BlockingService',
            'android:foregroundServiceType': 'specialUse',
            'android:exported': 'false',
          },
        })
      }
    } else if (mainApplication) {
      mainApplication['service'] = [
        {
          $: {
            'android:name': '.BlockingService',
            'android:foregroundServiceType': 'specialUse',
            'android:exported': 'false',
          },
        },
      ]
    }

    return config
  })

  // 2. Register AppBlockerPackage in MainApplication (Java or Kotlin)
  expoConfig = withMainApplication(expoConfig, (config) => {
    const mainApp = config.modResults.contents

    // ── Detect language ────────────────────────────────────────────
    // Kotlin: `class MainApplication :` or `override val/fun`
    // Java: `class MainApplication extends` or `public class`
    const isKotlin = /class\s+\w+\s*:\s*(Application|ReactApplication)/
      .test(mainApp) || /override\s+(val|fun)/.test(mainApp)
    const isNewArch = /\.packages\.apply\s*\{/.test(mainApp)

    // ── Add import ─────────────────────────────────────────────────
    // Semicolon works in both Java (required) and Kotlin (optional, harmless)
    const importLine = `import ${TARGET_PACKAGE}.AppBlockerPackage;`
    const importPattern = new RegExp(
      `import\\s+${TARGET_PACKAGE.replace(/\./g, '\\.')}\\.AppBlockerPackage;?`
    )
    if (!importPattern.test(mainApp)) {
      const lastImportIndex = mainApp.lastIndexOf('import ')
      const nextNewlineAfterImport = mainApp.indexOf('\n', lastImportIndex)
      config.modResults.contents =
        mainApp.slice(0, nextNewlineAfterImport + 1) +
        importLine + '\n' +
        mainApp.slice(nextNewlineAfterImport + 1)
    }

    // ── Add package registration ───────────────────────────────────
    if (isKotlin && isNewArch) {
      // Kotlin + New Architecture: PackageList(this).packages.apply { add(...) }
      // Insert inside the apply { } block after the `// add(` comment
      const packagesLine = 'add(AppBlockerPackage())'
      const alreadyExists =
        mainApp.includes(packagesLine) ||
        /\/\/\s*add\(AppBlockerPackage\)/.test(mainApp)
      if (!alreadyExists) {
        // Find the `// add(MyReactNativePackage())` comment and insert after it
        const addCommentMatch = mainApp.match(/\/\/\s*add\(.*\)/)
        if (addCommentMatch) {
          const commentEnd = addCommentMatch.index + addCommentMatch[0].length
          const eol = mainApp.indexOf('\n', commentEnd)
          config.modResults.contents =
            mainApp.slice(0, eol + 1) +
            '        ' + packagesLine + '\n' +
            mainApp.slice(eol + 1)
        } else {
          // Fallback: find `apply {` and insert right after the opening brace
          const applyMatch = mainApp.match(/\.packages\.apply\s*\{/)
          if (applyMatch) {
            const braceEnd = applyMatch.index + applyMatch[0].length
            config.modResults.contents =
              mainApp.slice(0, braceEnd) + '\n' +
              '        ' + packagesLine + '\n' +
              mainApp.slice(braceEnd)
          }
        }
      }
    } else if (isKotlin) {
      // Kotlin + Old Architecture: packages.add(AppBlockerPackage())
      // (no "new" keyword — invalid in Kotlin)
      const packagesLine = 'packages.add(AppBlockerPackage())'
      if (!mainApp.includes(packagesLine)) {
        const lastPackageIndex = mainApp.lastIndexOf('packages.add(')
        if (lastPackageIndex !== -1) {
          const endOfLine = mainApp.indexOf('\n', lastPackageIndex)
          config.modResults.contents =
            mainApp.slice(0, endOfLine + 1) +
            '    ' + packagesLine + '\n' +
            mainApp.slice(endOfLine + 1)
        }
      }
    } else {
      // Java: packages.add(new AppBlockerPackage());
      const packagesLine = 'packages.add(new AppBlockerPackage());'
      if (!mainApp.includes(packagesLine)) {
        const lastPackageIndex = mainApp.lastIndexOf('packages.add(')
        if (lastPackageIndex !== -1) {
          const endOfLine = mainApp.indexOf('\n', lastPackageIndex)
          config.modResults.contents =
            mainApp.slice(0, endOfLine + 1) +
            '    ' + packagesLine + '\n' +
            mainApp.slice(endOfLine + 1)
        }
      }
    }

    return config
  })

  // 3. Write Kotlin source files to the Android build directory
  expoConfig = withDangerousMod(expoConfig, [
    'android',
    async (config) => {
      const androidPath = config.modRequest.platformProjectRoot
      const targetPath = path.join(androidPath, TARGET_DIR)

      // Ensure directory exists
      fs.mkdirSync(targetPath, { recursive: true })

      // Write each Kotlin file
      const files = [
        'AppBlockerModule.kt',
        'AppBlockerPackage.kt',
        'BlockingService.kt',
      ]
      for (const file of files) {
        const content = readNativeSource(file)
        const outPath = path.join(targetPath, file)
        fs.writeFileSync(outPath, content, 'utf8')
        console.log(`[withAppBlocker] Wrote ${outPath}`)
      }

      return config
    },
  ])

  return expoConfig
}

module.exports = withAppBlocker
