import nodeResolve from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";
import typescript from 'rollup-plugin-typescript2';

export default [

  {
    input: "./src/grammar/parser.js",
    output: [{
      format: "cjs",
      file: "./dist/grammar/parser.cjs"
    }, {
      format: "es",
      file: "./dist/grammar/parser.es.js"
    }],
    external(id) {
      return !/^[\.\/]/.test(id)
    },
    plugins: [
      nodeResolve(),
      copy({
        targets: [
          { src: './src/grammar/parser.d.ts', dest: './dist/grammar/' }
        ]
      })
    ]
  },

  {
    input: ["./src/index.ts"],
    output: [{
      format: "cjs",
      file: "./dist/index.cjs"
    }, {
      format: "es",
      file: "./dist/index.es.js"
    }],
    plugins: [
      nodeResolve(),
      typescript(),
    ]
  }]