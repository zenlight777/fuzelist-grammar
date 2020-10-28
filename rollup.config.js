import commonjs from '@rollup/plugin-commonjs';
import legacy from '@rollup/plugin-legacy';
import multi from '@rollup/plugin-multi-entry';
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from 'rollup-plugin-typescript2';

export default {
  //force parser.js to be included, as we can't include it via typescript (why? in dist folder, rollup bundles parser.js inside of index.cjs and the export ... from './grammar/parser' file 
  //will still contain old import in exploded format, which can't be resolved)
  //we only define in index.ts the exports of parser.js, so it can be introspected OK. The source code will be bundled under index.es.js/cjs
  input: ["./src/index.ts", "./src/grammar/parser.js", "./src/grammar/parser.terms.js", "./src/grammar/tokens.js"],
  output: [{
    format: "cjs",
    file: "./dist/index.cjs"
  }, {
    format: "es",
    file: "./dist/index.es.js"
  }],
  external(id) { return !/^[\.\/]/.test(id) },
  plugins: [
    nodeResolve(),
    multi({ exports: false }),
    typescript(),
    commonjs(),
    legacy({
      './src/grammar/parser.js': 'parser',
      './src/grammar/parser.terms.js': 'parserterms',
      './src/grammar/tokens.js': 'tokens'
    })
    // del({
    //   targets: ['./src/grammar/parser.js', './src/grammar/parser.terms.js'],
    //   hook: 'buildEnd', verbose: true
    // })
  ]
}
