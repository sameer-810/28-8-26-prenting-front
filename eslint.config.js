// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      /**
       * OFF, and not as a convenience.
       *
       * The rule wants `don't` written as `don&apos;t`, which is correct advice
       * for HTML and wrong here. React Native does not decode HTML entities in
       * a `<Text>` — an escaped apostrophe renders on a phone as the literal
       * five characters `&apos;`. Following this rule would put visible markup
       * into sentences a parent reads while teaching their child.
       *
       * The web build would render it correctly, which is what makes it
       * dangerous: it looks right in the browser the developer is testing in,
       * and is broken on the platform most families use.
       */
      "react/no-unescaped-entities": "off",
    },
  },
]);
