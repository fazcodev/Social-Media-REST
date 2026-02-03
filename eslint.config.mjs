import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            ecmaVersion: "latest",
            sourceType: "commonjs", // Since backend index.js uses requires
        },
        rules: {
            "no-console": "off",
            "new-cap": "off",
            "no-unused-vars": "off",
        },
    },
];
