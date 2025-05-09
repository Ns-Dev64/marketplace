# marketplace

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
To run in cluster mode:

```bash
npm install -g pm2
bun build cluster.ts --outdir dist --target "bun"
pm2 start ecosystem.config.cjs
```

This project was created using `bun init` in bun v1.2.9. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
