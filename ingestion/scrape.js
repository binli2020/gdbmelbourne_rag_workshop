import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { embeddingModel } from "../lib/bot.js";
import { collection } from "../lib/db.js";

const url = "https://en.wikipedia.org/wiki/Bryan_Adams";

// Fetch the content from the URL
const response = await fetch(url);
const text = await response.text();

// Parse the content using Readability
const document = new JSDOM(text).window.document;
const reader = new Readability(document, {url});
const content = reader.parse();
const data = `${content.title}\n\n${content.textContent}}`

// Split the content into chunks
const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 128,
    chunkSize: 1024
});
const chunks = await splitter.splitText(data);

// Create vector embeddings of the data
const embeddings = await Promise.all(chunks.map(async (chunk) => {
    const result = embeddingModel.embedContent(chunk);
    return result.embedding.values;
}));

// Create the documents that we will save in the database and store them in Astra DB
const documents = embeddings.map((embedding, index) => ({
    content: chunks[index],
    $vector: embedding,
    metadata: {url}
}));