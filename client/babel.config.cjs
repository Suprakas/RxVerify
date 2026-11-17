// Used only by Jest (Vite has its own transform for the dev server and build).

// react-router's ESM build reads import.meta (for Vite HMR). CommonJS has no
// import.meta, so in tests we replace it with an empty object.
const stripImportMeta = ({ types: t }) => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
        path.replaceWith(t.objectExpression([]));
      }
    },
  },
});

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [stripImportMeta],
};
