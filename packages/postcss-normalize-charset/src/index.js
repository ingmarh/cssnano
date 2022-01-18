const charset = 'charset';
// eslint-disable-next-line no-control-regex
const nonAscii = /[^\x00-\x7F]/;
/**
 * @typedef {{add: boolean}} PostcssNormalizeCharsetOptions
 */
/** @param {PostcssNormalizeCharsetOptions} opts */
function pluginCreator(opts = { add: true }) {
  return {
    postcssPlugin: 'postcss-normalize-' + charset,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { AtRule }) {
      /** @type {import('postcss').AtRule | undefined} */
      let charsetRule;
      /** @type {import('postcss').Node | undefined} */
      let nonAsciiNode;

      css.walk((node) => {
        if (node.type === 'atrule' && node.name === charset) {
          if (!charsetRule) {
            charsetRule = node;
          }
          node.remove();
        } else if (
          !nonAsciiNode &&
          node.parent === css &&
          nonAscii.test(node.toString())
        ) {
          nonAsciiNode = node;
        }
      });

      if (nonAsciiNode) {
        if (!charsetRule && opts.add !== false) {
          charsetRule = new AtRule({
            name: charset,
            params: '"utf-8"',
          });
        }
        if (charsetRule) {
          charsetRule.source = nonAsciiNode.source;
          css.prepend(charsetRule);
        }
      }
    },
  };
}

pluginCreator.postcss = true;
export default pluginCreator;
