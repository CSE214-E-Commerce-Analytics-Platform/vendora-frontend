import { BaseDto } from './base-dto';

export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE'
}

export interface DtoReview extends BaseDto {
  productId: number;
  productName?: string;
  userId?: number;
  starRating: number;
  commentText?: string;
  sentiment?: Sentiment;
}

export interface DtoReviewRequest {
  productId: number;
  starRating: number;
  commentText?: string;
}
