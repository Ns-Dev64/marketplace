module.exports = {
  apps: [
    {
      name: "my-bun-app",
      interpreter: "bun",   // Prevents PM2 from using Node.js
      script: "index.ts",  // Replace with your actual Bun entry point
      instances: 3,      // Forks the app to use all available CPU cores
      exec_mode: "fork", 
      watch:true, 
      env: {
        PATH:`C:/Users/sschp/.bun/bin/bun`,
        NODE_APP_INSTANCE: "0",
        PORT: "5001"
      }
    }
  ]
};
