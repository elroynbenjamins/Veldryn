const {withProjectBuildGradle} = require('@expo/config-plugins');

const MARKER = '// VELDRYN_EXPO53_KOTLIN_COMPILE_STDLIB_PIN';

module.exports = function withKotlinCompileStdlibPin(config) {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') return config;
    if (config.modResults.contents.includes(MARKER)) return config;

    config.modResults.contents += `

${MARKER}
// OpenIAP is compiled with Kotlin 2.2 and contributes kotlin-stdlib 2.2.0.
// Expo SDK 53 compiles its native modules with Kotlin 2.0.21. Keep compile
// classpaths on Expo's stdlib while leaving runtime resolution untouched, so
// OpenIAP can still use its newer runtime stdlib after compilation.
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
};
