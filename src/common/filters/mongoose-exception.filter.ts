import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { Response } from 'express';
import { LoggerService } from '@shared/logger/logger.service';

@Catch(MongooseError)
export class MongooseExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Database error occurred';
    let errors: any = null;

    if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = Object.keys(exception.errors).reduce((acc, key) => {
        acc[key] = exception.errors[key].message;
        return acc;
      }, {} as Record<string, string>);
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ${exception.path}: ${exception.value}`;
    } else if ((exception as any).code === 11000) {
      status = HttpStatus.CONFLICT;
      const field = Object.keys((exception as any).keyPattern)[0];
      message = `Duplicate value for field: ${field}`;
    }

    this.logger.error(
      `Database Error: ${message}`,
      exception.stack,
      'MongooseExceptionFilter',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errors && { errors }),
    });
  }
}
