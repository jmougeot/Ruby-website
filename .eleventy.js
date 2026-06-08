/* ========================================
   Configuration Eleventy
   - Les pages existantes (index, demo, ai, privacy, terms, 404) sont copiées
     telles quelles (URLs inchangées, ex. /demo.html).
   - Seul le journal (/blog) est généré à partir du Markdown.
   ======================================== */

module.exports = function (eleventyConfig) {
  // --- Pages historiques : servies à l'identique (mêmes URLs) ---
  const staticPages = [
    "index.html",
    "demo.html",
    "ai.html",
    "privacy.html",
    "terms.html",
    "404.html",
  ];
  staticPages.forEach((p) => eleventyConfig.addPassthroughCopy(`src/${p}`));
  // On les exclut du traitement « template » pour qu'Eleventy ne les renomme pas.
  eleventyConfig.ignores.add("src/*.html");
  // Doc interne de style : ne pas la transformer en page (juste copiée avec /css).
  eleventyConfig.ignores.add("src/css/guide.md");

  // --- Assets et fichiers spéciaux ---
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });
  eleventyConfig.addPassthroughCopy({ "src/.well-known": ".well-known" });

  // --- Collection des articles du journal (récent → ancien) ---
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/blog/posts/*.md").reverse()
  );

  // --- Filtres ---

  // Date formatée en français : « 12 mai 2026 »
  eleventyConfig.addFilter("dateFr", (value) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value))
  );

  // Date ISO (machine-readable / RFC 3339) pour <time> et le flux
  eleventyConfig.addFilter("dateIso", (value) =>
    new Date(value).toISOString()
  );

  // Temps de lecture estimé à partir du contenu rendu
  eleventyConfig.addFilter("readingTime", (content) => {
    const text = String(content).replace(/<[^>]+>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  // URL absolue à partir d'un chemin et d'une base (SEO / flux)
  eleventyConfig.addFilter("absoluteUrl", (path, base) => {
    try {
      return new URL(path, base).toString();
    } catch (e) {
      return path;
    }
  });

  // Exclut un item (par URL) — utilisé pour les articles liés
  eleventyConfig.addFilter("excludeUrl", (posts, url) =>
    (posts || []).filter((p) => p.url !== url)
  );

  // Limite une liste aux n premiers éléments
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));

  // Article à la une : le premier marqué `featured`, sinon le plus récent
  eleventyConfig.addFilter("featured", (posts) => {
    const list = posts || [];
    return list.find((p) => p.data.featured) || list[0];
  });

  // Liste des rubriques (catégories uniques) présentes dans les articles
  eleventyConfig.addFilter("categories", (posts) => {
    const set = new Set();
    (posts || []).forEach((p) => {
      if (p.data.category) set.add(p.data.category);
    });
    return [...set];
  });

  // Renvoie les éléments à partir de l'index n (le complément de `limit`)
  eleventyConfig.addFilter("after", (arr, n) => (arr || []).slice(n));

  // Articles d'une rubrique donnée
  eleventyConfig.addFilter("byCategory", (posts, cat) =>
    (posts || []).filter((p) => p.data.category === cat)
  );

  // Slug accent-insensible : « Discovery » → « discovery »
  eleventyConfig.addFilter("slugify", (str) =>
    String(str)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );

  // Collection des rubriques (catégories uniques) — pour les pages /blog/rubrique/*
  eleventyConfig.addCollection("postCategories", (collectionApi) => {
    const set = new Set();
    collectionApi.getFilteredByGlob("src/blog/posts/*.md").forEach((p) => {
      if (p.data.category) set.add(p.data.category);
    });
    return [...set];
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
