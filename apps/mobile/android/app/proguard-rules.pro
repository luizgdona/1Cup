# R8/ProGuard rules for the release build (see build.gradle.kts —
# isMinifyEnabled / isShrinkResources are both on for `release`).
#
# This file is intentionally empty of keep rules for now. Every dependency
# that matters for app behaviour (dio, flutter_riverpod/riverpod_annotation,
# go_router, freezed) compiles to pure Dart and is shipped inside the
# Flutter engine's snapshot — R8 never sees that code, so it cannot break it.
#
# Do NOT add keep rules speculatively. Add them only when a real release
# build crashes with a ClassNotFoundException / NoSuchMethodError that
# reproduces with -release and disappears with -debug (i.e. guided by an
# actual stack trace), then document why the rule is needed.
#
# Known contingency (not yet needed, kept here for reference): if
# flutter_secure_storage's Android implementation (which uses Tink for
# AES key wrapping) is ever seen crashing in a release-only build, the
# fix is to keep Tink's classes:
#
# -keep class com.google.crypto.tink.** { *; }
