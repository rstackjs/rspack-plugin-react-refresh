module.exports = function customLoader(source, sourceMap) {
  const callback = this.async();

  const injected = `/** TEST_LOADER */`;
  const result = `${source}\n${injected}`;

  callback(null, result, sourceMap);
};
