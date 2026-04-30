import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: any, defaultMessage: string = 'An unexpected error occurred.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.error?.exception?.message) {
      return err.error.exception.message;
    }
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (err.message && !err.message.includes('Http failure response')) {
      return err.message;
    }
  } else if (err?.exception?.message) {
    return err.exception.message;
  } else if (err?.message) {
    return err.message;
  }
  
  return defaultMessage;
}
