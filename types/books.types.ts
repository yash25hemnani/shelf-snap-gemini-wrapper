export interface OcrBlock {
  text: string;
  [key: string]: unknown;
}

export interface IdentifyBooksRequestBody {
  imageWidth: number;
  imageHeight: number;
  blocks: OcrBlock[];
}

export interface Book {
  title: string;
  author: string;
}
