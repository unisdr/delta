/**
 * Loads and processes Markdown content from specified files.
 *
 * This function attempts to read a "full content" Markdown file and convert it to HTML.
 * If the "full content" file does not exist, it tries to read and convert an "appended content" Markdown file.
 * Pass the file name of markdown without .md extension.
 * For example, if argument passed is "partners", the fullContentFileName will be partners.md and the appended 
 * content markdown file will be partners-append-bottom.md .
 * The function will try to read the file from information-pages-override folder.
 *
 * @param {string} fullContentFileName - The name of the Markdown file containing the full content (e.g., "partners").
 * @returns {Promise<{ partnersContent: string | null, appendContent: string | null }>}
 * An object containing the HTML content of the "full content" file (`partnersContent`) or
 * the appended file (`appendContent`), or `null` if neither file exists.
 *
 * @throws {Error} Throws an error if there is an issue reading the files.
 */

import path from "path";
import fs from "fs/promises";
import { marked } from "marked";

export async function loadMarkdownContent(fullContentFileName: string) {
  const filePathOfFullContent = path.join(
    process.cwd(),
    "information-pages-override",
    `${fullContentFileName}.md`
  );

  const filePathOfAppendedContent = path.join(
    process.cwd(),
    "information-pages-override",
    `${fullContentFileName}-append-bottom.md`
  );

  let fullContent = null;
  let appendContent = null;

  try {
    const fullFileExists = await fs
      .stat(filePathOfFullContent)
      .then(() => true)
      .catch(() => false);

    if (fullFileExists) {
      const markdownContent = await fs.readFile(filePathOfFullContent, "utf-8");
      fullContent = marked(markdownContent);
    } else {
      const appendFileExists = await fs
        .stat(filePathOfAppendedContent)
        .then(() => true)
        .catch(() => false);

      if (appendFileExists) {
        const markdownContent = await fs.readFile(
          filePathOfAppendedContent,
          "utf-8"
        );
        appendContent = marked(markdownContent);
      }
    }
  } catch (error) {
    console.log(`Error loading Markdown files: ${error}`);
  }

  return { fullContent, appendContent };
}
