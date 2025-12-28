export interface User {
  id: number;
  email: string;
  name?: string;
  native_language?: string;
  learning_language?: string;
  target_language?: string;
}

export interface Text {
  id: number;
  user_id: number;
  title: string;
  content: string;
  language: string;
  created_at: string;
}

export interface Vocabulary {
  id: number;
  user_id: number;
  word: string;
  translation: string;
  context?: string;
  mnemonic?: string;
  language: string;
  next_review: string;
  interval: number;
  ease_factor: number;
  review_count: number;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
