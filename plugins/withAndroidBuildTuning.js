/**
 * Expo config plugin — tunes the Android Gradle build so it survives CI.
 *
 * Three changes, each one for a specific failure:
 *
 *  1. **Gradle JVM memory.** GitHub's runner hits
 *     `OutOfMemoryError: Metaspace` on the default 512 MiB once KSP runs.
 *  2. **Two CPU architectures, not four.** `arm64-v8a` and `armeabi-v7a` are
 *     what real phones use; `x86` and `x86_64` exist for emulators. Dropping
 *     them roughly halves native C++ compile time, and this app is going to
 *     Indian households' phones, not to an emulator farm.
 *  3. **Release lint off.** `lintVitalRelease` is slow, memory-hungry and is
 *     not needed to produce the `.aab`. It is also the task that dies under
 *     the OOM on a `production` build — which is why a `preview` `.apk` can
 *     succeed while the bundle fails, a confusing enough symptom to be worth
 *     naming here.
 *
 * Applied on every `expo prebuild`, so it survives `android/` being regenerated
 * during `eas build --local`. The CI workflow ALSO writes the memory setting
 * into the global Gradle home, because there is a window before this plugin is
 * applied and the failure lands inside it.
 */
const {
  withAppBuildGradle,
  withGradleProperties,
} = require("@expo/config-plugins");

/** Upsert a gradle.properties key=value pair. */
function setProp(cfg, key, value) {
  const i = cfg.modResults.findIndex(
    (p) => p.type === "property" && p.key === key,
  );
  const item = { type: "property", key, value };
  if (i >= 0) cfg.modResults[i] = item;
  else cfg.modResults.push(item);
}

module.exports = function withAndroidBuildTuning(config) {
  config = withGradleProperties(config, (cfg) => {
    setProp(
      cfg,
      "org.gradle.jvmargs",
      "-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8",
    );
    setProp(cfg, "reactNativeArchitectures", "arm64-v8a,armeabi-v7a");
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes("checkReleaseBuilds false")) {
      src = src.replace(
        /android\s*\{/,
        `android {
    lint {
        checkReleaseBuilds false
        abortOnError false
    }`,
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
};
