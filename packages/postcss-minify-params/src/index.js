import browserslist from 'browserslist';
import valueParser, { stringify } from 'postcss-value-parser';
import sort from 'alphanum-sort';
import { getArguments } from 'cssnano-utils';

/**
 * Return the greatest common divisor
 * of two numbers.
 *
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}
/**
 * @param {number} a
 * @param {number} b
 */
function aspectRatio(a, b) {
  const divisor = gcd(a, b);

  return [a / divisor, b / divisor];
}
/** @param {valueParser.Node[]} args */
function split(args) {
  return args.map((arg) => stringify(arg)).join('');
}
/** @param {valueParser.Node} node */
function removeNode(node) {
  node.value = '';
  node.type = 'word';
}
/** @param {unknown[]} items */
function sortAndDedupe(items) {
  return sort([...new Set(items)], {
    insensitive: true,
  }).join();
}
/**
 * @param {boolean} legacy
 * @param {import('postcss').AtRule} rule */
function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();

  // We should re-arrange parameters only for `@media` and `@supports` at-rules
  if (!rule.params || !['media', 'supports'].includes(ruleName)) {
    return;
  }

  const params = valueParser(rule.params);

  params.walk((node, index) => {
    if (node.type === 'div' || node.type === 'function') {
      node.before = node.after = '';

      if (
        node.type === 'function' &&
        node.nodes[4] &&
        node.nodes[0].value.toLowerCase().indexOf('-aspect-ratio') === 3
      ) {
        const [a, b] = aspectRatio(
          Number(node.nodes[2].value),
          Number(node.nodes[4].value)
        );

        node.nodes[2].value = a.toString();
        node.nodes[4].value = b.toString();
      }
    } else if (node.type === 'space') {
      node.value = ' ';
    } else {
      const prevWord = params.nodes[index - 2];

      if (
        node.value.toLowerCase() === 'all' &&
        rule.name.toLowerCase() === 'media' &&
        !prevWord
      ) {
        const nextWord = params.nodes[index + 2];

        if (!legacy || nextWord) {
          removeNode(node);
        }

        if (nextWord && nextWord.value.toLowerCase() === 'and') {
          const nextSpace = params.nodes[index + 1];
          const secondSpace = params.nodes[index + 3];

          removeNode(nextWord);
          removeNode(nextSpace);
          removeNode(secondSpace);
        }
      }
    }
  }, true);

  rule.params = sortAndDedupe(getArguments(params).map(split));

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
}
/** @param {string} browser */
function hasAllBug(browser) {
  return ['ie 10', 'ie 11'].includes(browser);
}
/** @param {browserslist.Options} options */
function pluginCreator(options = {}) {
  const browsers = browserslist(null, {
    stats: options.stats,
    path: __dirname,
    env: options.env,
  });

  return {
    postcssPlugin: 'postcss-minify-params',
    /** @param {import('postcss').Root} css */
    OnceExit(css) {
      css.walkAtRules(transform.bind(null, browsers.some(hasAllBug)));
    },
  };
}

pluginCreator.postcss = true;
export default pluginCreator;
