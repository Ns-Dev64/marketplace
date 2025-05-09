module.exports = {
  apps: [
    {
      name: "my-bun-app",
      script: "./dist/cluster.js",   // Use compiled JS
      interpreter: "bun",            // Bun will run the JS
      exec_mode: "cluster",             // Cluster mode may misbehave with Bun
      watch: true,
      env: {
        PATH:  "C:/Users/sschp/.bun/bin", // Ensure Bun is available
      },
    },
  ],
};