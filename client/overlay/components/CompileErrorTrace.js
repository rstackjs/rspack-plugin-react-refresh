const ansiHTML = require('../../utils/ansi-html.js');
const theme = require('../theme.js');
const utils = require('../utils.js');

ansiHTML.setColors(theme);

/**
 * Escape text before passing it to `ansiHTML`, which injects HTML markup.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @typedef {Object} CompileErrorTraceProps
 * @property {string} errorMessage
 */

/**
 * A formatter that turns Webpack compile error messages into highlighted HTML source traces.
 * @param {Document} document
 * @param {HTMLElement} root
 * @param {CompileErrorTraceProps} props
 * @returns {void}
 */
function CompileErrorTrace(document, root, props) {
  const errorParts = props.errorMessage.split('\n');
  if (errorParts.length) {
    if (errorParts[0]) {
      errorParts[0] = utils.formatFilename(errorParts[0]);
    }

    const errorMessage = errorParts.splice(1, 1)[0];
    if (errorMessage) {
      // Strip filename from the error message
      errorParts.unshift(errorMessage.replace(/^(.*:)\s.*:(\s.*)$/, '$1$2'));
    }
  }

  const stackContainer = document.createElement('pre');
  stackContainer.innerHTML = ansiHTML(escapeHtml(errorParts.join('\n')));
  stackContainer.style.fontFamily = [
    '"Operator Mono SSm"',
    '"Operator Mono"',
    '"Fira Code Retina"',
    '"Fira Code"',
    '"FiraCode-Retina"',
    '"Andale Mono"',
    '"Lucida Console"',
    'Menlo',
    'Consolas',
    'Monaco',
    'monospace',
  ].join(', ');
  stackContainer.style.margin = '0';
  stackContainer.style.whiteSpace = 'pre-wrap';

  root.appendChild(stackContainer);
}

module.exports = CompileErrorTrace;
