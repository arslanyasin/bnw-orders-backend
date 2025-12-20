import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Check if this is a paginated response (has data, total, page, etc.)
        if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
          // Return pagination response as-is with metadata
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: data?.message || 'Success',
            ...data, // Spread to include data, total, page, limit, totalPages
            timestamp: new Date().toISOString(),
          };
        }

        // Standard response wrapping
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: data?.message || 'Success',
          data: data?.data !== undefined ? data.data : data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
