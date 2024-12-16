import vue from 'rollup-plugin-vue';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import multiInput from 'rollup-plugin-multi-input';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import scss from 'rollup-plugin-scss';
import svg from 'rollup-plugin-svg';
import terser from '@rollup/plugin-terser';

const dir = process.argv.includes('--watch') ? './dist-dev' : './dist';

export default {
  input: ['src/callbacks/**/*.js', 'src/components/**/*.vue'],
  output: {
    dir,
    chunkFileNames: '[name]-[hash].min.js',
  },
  plugins: [
    vue(),
    nodeResolve(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    multiInput.default({
      transformOutputPath: (output, input) => `${output.replace(/(.+)+(.js|.vue)/, '$1.min$2')}`,
    }),
    commonjs(),
    del({ targets: `${dir}/*` }),
    scss({ watch: 'src', output: `${dir}/styles.css` }),
    svg(),
    terser(),
  ],
};
