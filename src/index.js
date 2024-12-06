// read all files from 'contents/*'
// put them on a dist folder
// read all files on posts
// build them on dist/posts/[file].html
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import fm from "front-matter";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postTemplate = `
<!doctype html>
<html>
  <head>
    <title>{{meta_title}}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:title" content="{{meta_title}}" />
    <meta
      property="og:image"
      content="https://lucascoelho.com/img/eu-e-salem-pixel.png"
    />
    <meta
      property="og:description"
      content="welcome to my piece of internet"
    />
    <meta name="description" content="{{meta_description}}" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <main>
    <nav>
        <a href="/index.html">/home</a>
        <a href="/blog.html">/blog</a>
    </nav>
    <sub class="date">{{date}}</sub>
      {{markdown}}
    <main>
    <footer>
        <hr />
    </footer>
  </body>
</html>
`;

const filenames = fs.readdirSync(path.resolve(__dirname, "posts"));

const hooks = {
  preprocess(markdown) {
    const { attributes, body } = fm(markdown);
    for (const prop in attributes) {
      if (prop in this.options) {
        this.options[prop] = attributes[prop];
      }
    }
    return body;
  },
};

marked.use({ hooks });

let posts = [];

Promise.all(
  filenames.map(async (fileName) => {
    const f = await fs.promises.readFile(
      path.resolve(__dirname, "posts", fileName),
      "utf8",
    );

    const targetDir = path.resolve(__dirname, "..", "dist", "posts");
    const { attributes } = fm(f);

    const date = new Date(attributes.date);
    const dateString = `${date.getDay() + 1}.${date.getMonth() + 1}.${date.getFullYear()}`;

    const content = postTemplate
      .replaceAll("{{markdown}}", marked.parse(f))
      .replace("{{meta_title}}", attributes.title)
      .replace("{{meta_description}", attributes.description || "")
      .replace("{{date}}", dateString);

    if (!fs.existsSync(targetDir)) {
      // await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const resolvedFileName =
      (attributes.slug || attributes.title.replaceAll(" ", "-")) + ".html";

    attributes.slug = resolvedFileName;
    posts.push(attributes);

    await fs.promises.writeFile(
      path.resolve(targetDir, resolvedFileName),
      content,
    );
  }),
).then(() => {
  const f = fs.readFileSync("src/blog.html", "utf8");

  const blogIndex = f.replace(
    "{{posts}}",
    posts.map((p) => {
      return `<li>
  <a href="./posts/${p.slug}">${p.title}</a>
  </li>`;
    }),
  );

  console.log(blogIndex);

  fs.writeFileSync("./dist/blog.html", blogIndex);
  fs.cpSync("./src/contents", "./dist", { recursive: true });
});
