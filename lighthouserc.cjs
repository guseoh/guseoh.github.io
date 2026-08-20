module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 4323",
      startServerReadyPattern: "Local",
      startServerReadyTimeout: 120000,
      url: [
        "http://127.0.0.1:4323/",
        "http://127.0.0.1:4323/blog/",
        "http://127.0.0.1:4323/blog/security/basic1/",
        "http://127.0.0.1:4323/search/"
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless=new --no-sandbox"
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.85 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci"
    }
  }
};
