import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing is read from `android/key.properties`, which is never
// committed (see .gitignore). When the file is absent — e.g. on CI or a
// fresh dev checkout — the release build type falls back to the debug
// signing config so `flutter build` still works out of the box. Only a
// real Play upload needs the file; see README_PROD.md for the `keytool`
// command and key.properties contents.
//
// Kept below `plugins {}`: Gradle only guarantees that block may be preceded
// by imports and `buildscript {}`, so leaving script logic above it relies on
// tolerance that can vary between Gradle versions.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    // `use` closes the stream — Properties.load does not.
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}

android {
    namespace = "app.onecup.one_cup"
    // SDK versions are intentionally left at the Flutter tool's defaults
    // (compileSdk/targetSdk 36, via flutter.*SdkVersion below) rather than
    // hardcoded — Flutter bumps these with each stable release and Google
    // Play's Aug 31 2026 targetSdk-36 requirement is already satisfied.
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "app.onecup.mobile"
        // minSdk left at the Flutter default (24) — it already covers every
        // plugin's floor (flutter_secure_storage 19, image_picker_android 19).
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // versionCode/versionName always come from pubspec.yaml's `version:`
        // field (currently 0.1.0+1). Bump the version there only — never here.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                // A debug-signed .aab is byte-for-byte plausible and only fails
                // at the very end, when Play rejects the upload. Say so loudly
                // rather than letting a "successful" release build be mistaken
                // for a publishable artifact.
                //
                // println, not logger.warn: this has to survive the Gradle ->
                // flutter_tools output pipeline, and println is the form
                // verified to actually reach `flutter build` output.
                println(
                    "\n" +
                    "**********************************************************************\n" +
                    "  WARNING: android/key.properties not found.\n" +
                    "  This release build is signed with the DEBUG key and CANNOT be\n" +
                    "  uploaded to Google Play. Fine for CI smoke tests and local runs.\n" +
                    "  To produce a publishable bundle, see README_PROD.md section 6.\n" +
                    "**********************************************************************\n"
                )
                signingConfigs.getByName("debug")
            }

            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

flutter {
    source = "../.."
}
