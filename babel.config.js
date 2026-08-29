module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@api": "./src/shared/api",
            "@modules": "./src/modules",
            "@navigation": "./src/navigation",
            "@shared": "./src/shared",
            "@config": "./src/config",
          },
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      ],
      // Must stay last — Reanimated's plugin has to run after everything else.
      "react-native-worklets/plugin",
    ],
  };
};
