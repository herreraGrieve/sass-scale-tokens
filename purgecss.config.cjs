module.exports = {
  content: ['./*.html'],
  css:     ['css/fit.css'],
  output:  'css/',
  extractors: [
    {
      // fitcss uses characters outside the default PurgeCSS regex:
      extractor: content => content.match(/[\w\-+@]+/g) ?? [],
      extensions: ['html', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte'],
    },
  ],
};
