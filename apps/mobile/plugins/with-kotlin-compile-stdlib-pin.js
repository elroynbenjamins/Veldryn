const {withAppBuildGradle,withProjectBuildGradle} = require('expo/config-plugins');

const PROJECT_MARKER = '// VELDRYN_EXPO53_KOTLIN_COMPILE_STDLIB_PIN';
const APP_MARKER = '// VELDRYN_EXPO53_KOTLIN_METADATA_COMPAT';

module.exports = function withKotlinCompatibility(config) {
  config = withProjectBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') return config;
    if (config.modResults.contents.includes(PROJECT_MARKER)) return config;

    config.modResults.contents += `

${PROJECT_MARKER}
// OpenIAP contributes kotlin-stdlib 2.2.0 while Expo SDK 53 compiles native
// modules with Kotlin 2.0.21. Keep compile classpaths on Expo's stdlib while
// leaving runtime dependency resolution untouched.
subprojects { subproject ->
    subproject.configurations.configureEach { configuration ->
        if (configuration.name.toLowerCase().contains('compileclasspath')) {
            configuration.resolutionStrategy.force(
                'org.jetbrains.kotlin:kotlin-stdlib:2.0.21',
                'org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.0.21',
                'org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.0.21'
            )
        }
    }
}
`;
    return config;
  });

  config = withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') return config;
    if (config.modResults.contents.includes(APP_MARKER)) return config;

    config.modResults.contents += `

${APP_MARKER}
// openiap-google is published with Kotlin 2.2 metadata. The app does not call
// its Kotlin API directly, but the artifact is on the compile classpath through
// expo-iap. Match expo-iap's own compatibility setting so Expo SDK 53's Kotlin
// 2.0 compiler can consume that transitive metadata.
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions.freeCompilerArgs += ['-Xskip-metadata-version-check']
}
`;
    return config;
  });

  return config;
};
