export const MODEL_NAME = 'gemini-3.5-flash';

export const MAX_BLOCKS = 200;

export const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      author: { type: 'string' },
    },
    required: ['title', 'author'],
  },
};
