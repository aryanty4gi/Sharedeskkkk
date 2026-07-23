import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import type { ParsedDocument } from "./types";

export async function parseDocument(file: ArrayBuffer, mimeType: string): Promise<ParsedDocument> {
  switch (mimeType) {
    case "application/pdf": {
      const parser = new PDFParse({
        data: Buffer.from(file),
      });

      const result = await parser.getText();

      await parser.destroy();

      return {
        text: result.text,
        pageCount: result.total,
      };
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(file),
      });

      return {
        text: result.value,
      };
    }

    case "text/plain": {
      return {
        text: new TextDecoder().decode(file),
      };
    }

    default:
      throw new Error(`Unsupported document type: ${mimeType}`);
  }
}
