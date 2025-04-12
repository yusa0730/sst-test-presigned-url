import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  const { PRIVATE_KEY } = c.env;
  console.log("%s", PRIVATE_KEY);
  return c.text('Hello Hono! hono Docker test executing こんにちは。よろしくお願いします。頭がいたいのは治った')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`起動中`);
  console.log(`起動中2`);
  console.log(`起動中３`);
  console.log(`起動中4`);
  console.log(`起動中５`);
  console.log(`起動中6`);
  console.log(`起動中７7`);
  console.log(`Server is running on http://localhost:${info.port}`);
})
