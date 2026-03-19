import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Existing form flows reset local UI state from effects; keep lint stable during the Next 16 upgrade.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
