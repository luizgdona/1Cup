import java.util.Properties
import java.io.FileInputStream

// Release signing is read from `android/key.properties`, which is never
// committed (see .gitignore). When the file is absent — e.g. on CI or a
// fresh dev checkout — the release build type falls back to the debug
// signing config so `flutter build` still works out of the box. Only a
// real Play upload needs the file; see the project handoff notes for the
// `keytool` command and key.properties contents.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
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
            signingConfig = if (keystorePropertiesFile.exists())
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")

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
