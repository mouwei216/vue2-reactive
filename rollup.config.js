import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';

export default {
  input: './src/index.js',
  output: {
    format: 'umd',
    name: 'Vue',
    file: 'dist/vue.js',
    sourcemap: true,
  },
  plugins: [
    babel({
      exclude: 'node_module/**',
    }),
    serve({
      port: 8080,
      contentBase: '',
      openPage: '/index.html',
      open: true,
    }),
  ],
};
