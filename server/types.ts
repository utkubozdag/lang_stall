export interface User {
  id: number;
  email: string;
  password: string;
  name?: string;
  native_language?: string;
  learning_language?: string;
  created_at: Date;
}

export interface Vocabulary {
  id: number;
  user_id: number;
  word: string;
  translation: string;
  context?: string;
  language: string;
  next_review: Date;
  interval: number;
  ease_factor: number;
  review_count: number;
  created_at: Date;
}

export interface Text {
  id: number;
  user_id: number;
  title: string;
  content: string;
  language: string;
  created_at: Date;
}
