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
  'android.permission.REQUEST_INSTALL_PACKAGES',
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

  // 2. Register AppBlockerPackage in MainApplication.java
  expoConfig = withMainApplication(expoConfig, (config) => {
    const mainApp = config.modResults.contents

    // Add import — solo si no existe ya (idempotente)
    const importLine = `import ${TARGET_PACKAGE}.AppBlockerPackage;`
    const importPattern = new RegExp(
      `import\\s+${TARGET_PACKAGE.replace('.', '\\.')}\\.AppBlockerPackage;`
    )
    if (!importPattern.test(mainApp)) {
      const lastImportIndex = mainApp.lastIndexOf('import ')
      const nextNewlineAfterImport = mainApp.indexOf('\n', lastImportIndex)
      config.modResults.contents =
        mainApp.slice(0, nextNewlineAfterImport + 1) +
        importLine + '\n' +
        mainApp.slice(nextNewlineAfterImport + 1)
    }

    // Add package to getPackages list — solo si no existe ya (idempotente)
    const packagesLine = 'packages.add(new AppBlockerPackage());'
    if (!mainApp.includes(packagesLine)) {
      const addPackagesIndex = mainApp.indexOf('packages.add(')
      if (addPackagesIndex !== -1) {
        // Insert AFTER the last packages.add line
        const lastPackageIndex = mainApp.lastIndexOf('packages.add(')
        const endOfLine = mainApp.indexOf('\n', lastPackageIndex)
        config.modResults.contents =
          mainApp.slice(0, endOfLine + 1) +
          '    ' + packagesLine + '\n' +
          mainApp.slice(endOfLine + 1)
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
