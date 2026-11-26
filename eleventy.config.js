export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  // Custom domain for GitHub Pages
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  // Hand-built, one-off project pages (own HTML/CSS/JS, no shared layout)
  eleventyConfig.addPassthroughCopy({ "src/portfolio-pages": "portfolio" });

  // Whole days elapsed since an ISO date, e.g. "2023-01-03"
  eleventyConfig.addFilter("daysSince", (iso) => Math.floor((Date.now() - new Date(iso + "T00:00:00").getTime()) / 864e5));


  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
